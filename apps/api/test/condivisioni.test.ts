import { randomUUID } from "node:crypto";
import { MikroORM } from "@mikro-orm/postgresql";
import {
  condivisioneSchema,
  listaCondivisioniSchema,
  sessioneSchema,
  vistaCondivisaSchema,
  type NuovaCondivisione,
} from "@calories-diary/shared";
import type { Express } from "express";
import type { Redis } from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creaApp } from "../src/app.js";
import { caricaEnv } from "../src/config/env.js";
import { creaConfigOrm } from "../src/db/mikro-orm.config.js";
import { creaLogger } from "../src/lib/logger.js";
import { creaRedis } from "../src/lib/redis.js";
import { Condivisione } from "../src/modules/condivisioni/condivisione.entity.js";
import { creaProviderFinto } from "./provider-finto.js";
import { adminTest, altroUtenteTest } from "./utenti-test.js";

let orm: MikroORM;
let redis: Redis;
let app: Express;

// Own IP (trust proxy is on): these logins do not count towards the limit of app.test.ts.
const IP = "203.0.113.8";
const GIORNO = "2026-03-02";
const NUOVA: NuovaCondivisione = {
  da: GIORNO,
  a: "2026-03-03",
  durata: "settimana",
  mostraFabbisogno: false,
};

async function login(credenziali: { username: string; password: string }) {
  const res = await request(app)
    .post("/auth/login")
    .set("X-Forwarded-For", IP)
    .send(credenziali)
    .expect(200);
  return { Authorization: `Bearer ${sessioneSchema.parse(res.body).token}` };
}

let auth: Awaited<ReturnType<typeof login>>;
let altro: Awaited<ReturnType<typeof login>>;
let pane: string;

beforeAll(async () => {
  const env = caricaEnv();
  orm = await MikroORM.init(creaConfigOrm(env));
  redis = creaRedis(env);
  await redis.connect();
  app = creaApp({
    env,
    orm,
    redis,
    logger: creaLogger(env),
    provider: creaProviderFinto().provider,
  });

  // Own user: these tests change the goals, which the other test files read.
  const credenziali = {
    username: `condivide-${randomUUID().slice(0, 8)}`,
    password: "password-nuova-utenza",
  };
  await request(app)
    .post("/utenti")
    .set(await login(adminTest))
    .send(credenziali)
    .expect(201);
  auth = await login(credenziali);
  altro = await login(altroUtenteTest);

  await request(app)
    .put("/obiettivi")
    .set(auth)
    .send({ fabbisogno: 2000, ripartizione: { carboidrati: 50, grassi: 30, proteine: 20 } })
    .expect(200);
  const alimento = await request(app)
    .post("/alimenti")
    .set(auth)
    .send({
      nome: "Pane condiviso",
      marca: "Forno",
      valoriPer100: { kcal: 100, proteine: 10, carboidrati: 20, grassi: 5 },
    })
    .expect(201);
  pane = alimento.body.id;
  await request(app)
    .post(`/diario/${GIORNO}/pasti`)
    .set(auth)
    .send({ tipo: "pranzo", voci: [{ alimento: pane, quantita: 200 }] })
    .expect(200);
});

afterAll(async () => {
  await orm.close(true);
  await redis.quit();
});

const crea = async (body: object = NUOVA, headers = auth) =>
  condivisioneSchema.parse(
    (await request(app).post("/condivisioni").set(headers).send(body).expect(201)).body,
  );
const vista = async (token: string) =>
  vistaCondivisaSchema.parse((await request(app).get(`/pubblico/${token}`).expect(200)).body);

describe("condivisioni", () => {
  it("richiede l'autenticazione per creare ed elencare, non per aprire il link", async () => {
    await request(app).get("/condivisioni").expect(401);
    await request(app).post("/condivisioni").send(NUOVA).expect(401);
    const { token } = await crea();
    await request(app).get(`/pubblico/${token}`).expect(200);
  });

  it("accetta al massimo sette giorni, in ordine", async () => {
    const invia = (da: string, a: string) =>
      request(app)
        .post("/condivisioni")
        .set(auth)
        .send({ ...NUOVA, da, a });
    await invia("2026-03-01", "2026-03-08").expect(400);
    await invia("2026-03-03", "2026-03-02").expect(400);
    await invia("2026-03-01", "2026-03-07").expect(201);
  });

  it("mostra i giorni in ordine, senza pasti vuoti né dati interni", async () => {
    const res = await request(app)
      .get(`/pubblico/${(await crea()).token}`)
      .expect(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    const { giorni } = vistaCondivisaSchema.parse(res.body);

    expect(giorni.map((g) => g.giorno)).toEqual([GIORNO, "2026-03-03"]);
    expect(giorni[0]!.pasti.map((p) => p.tipo)).toEqual(["pranzo"]);
    expect(giorni[0]!.pasti[0]!.voci).toEqual([
      {
        nome: "Pane condiviso",
        marca: "Forno",
        unitaBase: "g",
        quantita: 200,
        valori: { kcal: 200, proteine: 20, carboidrati: 40, grassi: 10 },
      },
    ]);
    expect(giorni[1]!.pasti).toEqual([]);
    expect(JSON.stringify(res.body)).not.toContain(pane);
    expect(JSON.stringify(res.body)).not.toContain("suggerite");
  });

  it("condivide il fabbisogno solo se richiesto", async () => {
    const senza = await crea({ ...NUOVA, mostraFabbisogno: false });
    expect((await vista(senza.token)).obiettivi).toBeNull();
    const con = await crea({ ...NUOVA, mostraFabbisogno: true });
    expect((await vista(con.token)).obiettivi?.fabbisogno).toBe(2000);
  });

  it("resta una copia fissa quando il diario cambia", async () => {
    const giorno = "2026-03-10";
    const { token } = await crea({ ...NUOVA, da: giorno, a: giorno, mostraFabbisogno: true });
    await request(app)
      .post(`/diario/${giorno}/pasti`)
      .set(auth)
      .send({ tipo: "cena", voci: [{ alimento: pane, quantita: 100 }] })
      .expect(200);
    await request(app)
      .put("/obiettivi")
      .set(auth)
      .send({ fabbisogno: 1800, ripartizione: { carboidrati: 50, grassi: 30, proteine: 20 } })
      .expect(200);
    const { giorni, obiettivi } = await vista(token);
    expect(giorni[0]!.pasti).toEqual([]);
    expect(obiettivi?.fabbisogno).toBe(2000);
  });

  it("calcola la scadenza dalla durata", async () => {
    const adesso = Date.now();
    const scade = async (durata: string) => (await crea({ ...NUOVA, durata })).scadeIl;
    const giorni = async (durata: string) =>
      Math.round((Date.parse((await scade(durata))!) - adesso) / 86_400_000);
    expect(await giorni("giorno")).toBe(1);
    expect(await giorni("settimana")).toBe(7);
    expect(await giorni("mese")).toBe(30);
    expect(await scade("sempre")).toBeNull();
  });

  it("revoca solo i propri link, e subito", async () => {
    const { id, token } = await crea();
    await request(app).delete(`/condivisioni/${id}`).set(altro).expect(404);
    await request(app).get(`/pubblico/${token}`).expect(200);
    await request(app).delete(`/condivisioni/${id}`).set(auth).expect(204);
    await request(app).get(`/pubblico/${token}`).expect(404);
  });

  it("elenca solo i propri link e cancella quelli scaduti", async () => {
    const attivo = await crea();
    const scaduto = await crea();
    await orm.em
      .fork()
      .nativeUpdate(Condivisione, { id: scaduto.id }, { scadeIl: new Date(Date.now() - 1000) });

    const res = await request(app).get(`/pubblico/${scaduto.token}`).expect(404);
    expect(res.body.errore.codice).toBe("NON_TROVATO");

    const lista = async (headers: typeof auth) =>
      listaCondivisioniSchema
        .parse((await request(app).get("/condivisioni").set(headers).expect(200)).body)
        .map((c) => c.id);
    const miei = await lista(auth);
    expect(miei).toContain(attivo.id);
    expect(miei).not.toContain(scaduto.id);
    expect(await lista(altro)).not.toContain(attivo.id);
    expect(await orm.em.fork().count(Condivisione, { id: scaduto.id })).toBe(0);
  });
});
