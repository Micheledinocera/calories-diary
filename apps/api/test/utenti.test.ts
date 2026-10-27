import { randomUUID } from "node:crypto";
import { MikroORM } from "@mikro-orm/postgresql";
import { listaUtentiSchema, sessioneSchema, utenteSchema } from "@calories-diary/shared";
import type { Express } from "express";
import type { Redis } from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creaApp } from "../src/app.js";
import { caricaEnv } from "../src/config/env.js";
import { creaConfigOrm } from "../src/db/mikro-orm.config.js";
import { creaLogger } from "../src/lib/logger.js";
import { creaRedis } from "../src/lib/redis.js";
import { Alimento } from "../src/modules/alimenti/alimento.entity.js";
import { creaProviderFinto } from "./provider-finto.js";
import { adminTest, altroUtenteTest, utenteTest } from "./utenti-test.js";

let orm: MikroORM;
let redis: Redis;
let app: Express;

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
});

afterAll(async () => {
  await orm.close(true);
  await redis.quit();
});

// Own IP (trust proxy is on): these logins do not count towards the limit of app.test.ts.
const IP = "203.0.113.7";

async function login(credenziali: { username: string; password: string }) {
  const res = await request(app)
    .post("/auth/login")
    .set("X-Forwarded-For", IP)
    .send(credenziali)
    .expect(200);
  return sessioneSchema.parse(res.body);
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
// Unique per run: the users stay in the test database.
const nuovoUsername = (prefisso: string) => `${prefisso}-${randomUUID().slice(0, 8)}`;

let admin: ReturnType<typeof bearer>;
let utente: ReturnType<typeof bearer>;
beforeAll(async () => {
  admin = bearer((await login(adminTest)).token);
  utente = bearer((await login(utenteTest)).token);
});

/** Creates a user from the admin page and logs in as them. */
async function creaUtente(prefisso: string) {
  const credenziali = { username: nuovoUsername(prefisso), password: "password-nuova-utenza" };
  const res = await request(app).post("/utenti").set(admin).send(credenziali).expect(201);
  const creato = utenteSchema.parse(res.body);
  return { ...creato, credenziali, auth: bearer((await login(credenziali)).token) };
}

describe("/utenti", () => {
  it("è riservato agli admin", async () => {
    await request(app).get("/utenti").expect(401);
    const res = await request(app).get("/utenti").set(utente).expect(403);
    expect(res.body.errore.codice).toBe("NON_AUTORIZZATO");
  });

  it("l'admin vede gli utenti e ne crea di normali", async () => {
    const nuovo = await creaUtente("nuovo");
    expect(nuovo.ruolo).toBe("utente");

    const lista = listaUtentiSchema.parse(
      (await request(app).get("/utenti").set(admin).expect(200)).body,
    );
    expect(lista.map((u) => u.username)).toEqual(
      expect.arrayContaining([adminTest.username, utenteTest.username, nuovo.username]),
    );
  });

  it("salva lo username così com'è, ma il login ignora maiuscole e minuscole", async () => {
    const username = nuovoUsername("Mario.Rossi");
    const res = await request(app)
      .post("/utenti")
      .set(admin)
      .send({ username, password: "password-lunga-abbastanza" })
      .expect(201);
    expect(res.body.username).toBe(username);
    const sessione = await login({
      username: username.toLowerCase(),
      password: "password-lunga-abbastanza",
    });
    expect(sessione.utente.username).toBe(username);
  });

  it("rifiuta username già usati (anche con altre maiuscole) o non validi e password corte", async () => {
    const usato = await request(app)
      .post("/utenti")
      .set(admin)
      .send({ username: utenteTest.username.toUpperCase(), password: "password-lunga-abbastanza" })
      .expect(409);
    expect(usato.body.errore.codice).toBe("USERNAME_IN_USO");

    for (const body of [
      { username: "ab", password: "password-lunga-abbastanza" },
      { username: "con spazio", password: "password-lunga-abbastanza" },
      { username: nuovoUsername("corta"), password: "corta" },
    ]) {
      const res = await request(app).post("/utenti").set(admin).send(body).expect(400);
      expect(res.body.errore.codice).toBe("VALIDAZIONE");
    }
  });

  it("cambiare lo username non chiude la sessione, cambiare la password sì", async () => {
    const u = await creaUtente("modifica");
    const username = nuovoUsername("rinominato");
    const rinominato = await request(app)
      .patch(`/utenti/${u.id}`)
      .set(admin)
      .send({ username })
      .expect(200);
    expect(rinominato.body.username).toBe(username);
    await request(app).get("/auth/io").set(u.auth).expect(200);

    await request(app)
      .patch(`/utenti/${u.id}`)
      .set(admin)
      .send({ password: "password-data-dall-admin" })
      .expect(200);
    for (const chiamata of [
      request(app).get("/auth/io").set(u.auth),
      request(app).post("/auth/rinnova").set(u.auth),
    ]) {
      expect((await chiamata.expect(401)).body.errore.codice).toBe("NON_AUTENTICATO");
    }
    await login({ username, password: "password-data-dall-admin" });
  });

  it("risponde 404 per un utente inesistente", async () => {
    await request(app)
      .patch(`/utenti/${randomUUID()}`)
      .set(admin)
      .send({ username: nuovoUsername("fantasma") })
      .expect(404);
  });

  it("l'admin non può eliminare sé stesso", async () => {
    const { utente: io } = await login(adminTest);
    const res = await request(app).delete(`/utenti/${io.id}`).set(admin).expect(400);
    expect(res.body.errore.codice).toBe("AUTO_ELIMINAZIONE");
  });

  it("eliminando un utente restano solo i suoi alimenti usati da altri", async () => {
    const u = await creaUtente("eliminato");
    const altro = bearer((await login(altroUtenteTest)).token);
    const crea = async (nome: string) =>
      (
        await request(app)
          .post("/alimenti")
          .set(u.auth)
          .send({ nome, valoriPer100: { kcal: 100, proteine: 1, carboidrati: 1, grassi: 1 } })
          .expect(201)
      ).body.id as string;
    const soloSuo = await crea("Alimento solo suo");
    const condiviso = await crea("Alimento usato da un amico");
    const archiviatoDaAltri = await crea("Alimento archiviato da un amico");

    const pasto = (headers: ReturnType<typeof bearer>, voci: string[]) =>
      request(app)
        .post("/diario/2026-03-01/pasti")
        .set(headers)
        .send({ tipo: "pranzo", voci: voci.map((alimento) => ({ alimento, quantita: 100 })) })
        .expect(200);
    await pasto(u.auth, [soloSuo, condiviso]);
    await pasto(altro, [condiviso]);
    await request(app)
      .patch(`/alimenti/${archiviatoDaAltri}`)
      .set(altro)
      .send({ archiviato: true })
      .expect(200);

    await request(app).delete(`/utenti/${u.id}`).set(admin).expect(204);

    await request(app).get("/auth/io").set(u.auth).expect(401);
    const em = orm.em.fork();
    expect(await em.findOne(Alimento, { id: soloSuo })).toBeNull();
    expect(await em.findOne(Alimento, { id: archiviatoDaAltri })).toBeNull();
    const rimasto = await em.findOne(Alimento, { id: condiviso });
    expect(rimasto).not.toBeNull();
    expect(rimasto!.autore).toBeNull();

    await request(app).delete(`/utenti/${u.id}`).set(admin).expect(404);
  });
});

describe("profilo e password dell'utente", () => {
  it("l'utente cambia il proprio username, non uno già usato", async () => {
    const u = await creaUtente("profilo");
    const username = nuovoUsername("mio");
    const res = await request(app).patch("/auth/io").set(u.auth).send({ username }).expect(200);
    expect(res.body).toEqual({ id: u.id, username, ruolo: "utente" });

    const usato = await request(app)
      .patch("/auth/io")
      .set(u.auth)
      .send({ username: utenteTest.username })
      .expect(409);
    expect(usato.body.errore.codice).toBe("USERNAME_IN_USO");
  });

  it("cambia la password con quella attuale: nuova sessione, le altre chiuse", async () => {
    const u = await creaUtente("password");
    const sbagliata = await request(app)
      .put("/auth/password")
      .set(u.auth)
      .send({ passwordAttuale: "non-è-questa", nuovaPassword: "password-scelta-da-me" })
      .expect(400);
    expect(sbagliata.body.errore.codice).toBe("PASSWORD_ERRATA");

    const res = await request(app)
      .put("/auth/password")
      .set(u.auth)
      .send({ passwordAttuale: u.credenziali.password, nuovaPassword: "password-scelta-da-me" })
      .expect(200);
    const sessione = sessioneSchema.parse(res.body);
    await request(app).get("/auth/io").set(bearer(sessione.token)).expect(200);
    await request(app).get("/auth/io").set(u.auth).expect(401);
    await login({ username: u.username, password: "password-scelta-da-me" });
  });

  it("blocca con 429 dopo 5 password attuali sbagliate", async () => {
    const u = await creaUtente("tentativi");
    const prova = () =>
      request(app)
        .put("/auth/password")
        .set(u.auth)
        .send({ passwordAttuale: "sbagliata", nuovaPassword: "password-scelta-da-me" });
    for (let i = 0; i < 5; i++) await prova().expect(400);
    expect((await prova().expect(429)).body.errore.codice).toBe("TROPPI_TENTATIVI");
  });
});
