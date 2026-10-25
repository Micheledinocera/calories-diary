import { randomUUID } from "node:crypto";
import { MikroORM } from "@mikro-orm/postgresql";
import { sessioneSchema } from "@calories-diary/shared";
import type { Express } from "express";
import type { Redis } from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creaApp } from "../src/app.js";
import { caricaEnv } from "../src/config/env.js";
import { creaConfigOrm } from "../src/db/mikro-orm.config.js";
import { creaLogger } from "../src/lib/logger.js";
import { creaRedis } from "../src/lib/redis.js";
import { creaGestoreToken } from "../src/modules/auth/token.js";
import { altroUtenteTest, utenteTest } from "./utenti-test.js";

let orm: MikroORM;
let redis: Redis;
let app: Express;

beforeAll(async () => {
  const env = caricaEnv();
  orm = await MikroORM.init(creaConfigOrm(env));
  redis = creaRedis(env);
  await redis.connect();
  app = creaApp({ env, orm, redis, logger: creaLogger(env) });
});

afterAll(async () => {
  await orm.close(true);
  await redis.quit();
});

async function login(credenziali = utenteTest): Promise<string> {
  const res = await request(app).post("/auth/login").send(credenziali).expect(200);
  return res.body.token;
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("GET /health", () => {
  it("risponde 200 con DB e Redis ok", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body).toMatchObject({ stato: "ok", db: "ok", redis: "ok" });
  });
});

describe("/auth", () => {
  it("il login restituisce una sessione di una settimana", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ ...utenteTest, email: " IO@esempio.it " })
      .expect(200);
    const sessione = sessioneSchema.parse(res.body);
    expect(sessione.utente.email).toBe(utenteTest.email);
    const giorni = (Date.parse(sessione.scadeIl) - Date.now()) / 86_400_000;
    expect(giorni).toBeCloseTo(7, 1);
  });

  it("risponde 401 con password errata o email sconosciuta", async () => {
    for (const credenziali of [
      { ...utenteTest, password: "sbagliata" },
      { email: "nessuno@esempio.it", password: "qualsiasi" },
    ]) {
      const res = await request(app).post("/auth/login").send(credenziali).expect(401);
      expect(res.body.errore.codice).toBe("CREDENZIALI_ERRATE");
    }
  });

  it("risponde 400 se le credenziali non sono valide", async () => {
    const res = await request(app).post("/auth/login").send({ email: "io" }).expect(400);
    expect(res.body.errore.codice).toBe("VALIDAZIONE");
  });

  it("blocca con 429 dopo 5 tentativi sulla stessa email", async () => {
    const credenziali = { email: "bersaglio@esempio.it", password: "tentativo" };
    for (let i = 0; i < 5; i++) {
      await request(app).post("/auth/login").send(credenziali).expect(401);
    }
    const res = await request(app).post("/auth/login").send(credenziali).expect(429);
    expect(res.body.errore.codice).toBe("TROPPI_TENTATIVI");
    expect(res.body.errore.dettagli.riprovaTraS).toBeGreaterThan(0);
  });

  it("rinnova il token e restituisce l'utente corrente", async () => {
    const token = await login();
    const rinnovo = await request(app).post("/auth/rinnova").set(bearer(token)).expect(200);
    const sessione = sessioneSchema.parse(rinnovo.body);
    const io = await request(app).get("/auth/io").set(bearer(sessione.token)).expect(200);
    expect(io.body).toEqual(sessione.utente);
  });

  it("risponde 401 senza token, con token non valido o di un utente inesistente", async () => {
    const orfano = await creaGestoreToken(caricaEnv().JWT_SECRET).firma(randomUUID());
    const altroSegreto = await creaGestoreToken("x".repeat(32)).firma(randomUUID());
    for (const headers of [{}, bearer("abc"), bearer(orfano.token), bearer(altroSegreto.token)]) {
      const res = await request(app).get("/auth/io").set(headers).expect(401);
      expect(res.body.errore.codice).toBe("NON_AUTENTICATO");
    }
  });
});

describe("/pasti", () => {
  it("richiede l'autenticazione", async () => {
    await request(app).get("/pasti").expect(401);
  });

  it("elenca i pasti predefiniti dell'utente in ordine", async () => {
    const res = await request(app)
      .get("/pasti")
      .set(bearer(await login()))
      .expect(200);
    expect(res.body.map((p: { nome: string }) => p.nome)).toEqual([
      "Colazione",
      "Pranzo",
      "Cena",
      "Spuntino",
    ]);
  });

  it("restituisce un pasto per id", async () => {
    const auth = bearer(await login());
    const [primo] = (await request(app).get("/pasti").set(auth)).body;
    const res = await request(app).get(`/pasti/${primo.id}`).set(auth).expect(200);
    expect(res.body).toEqual(primo);
  });

  it("non mostra i pasti di un altro utente", async () => {
    const [mio] = (
      await request(app)
        .get("/pasti")
        .set(bearer(await login()))
    ).body;
    const res = await request(app)
      .get(`/pasti/${mio.id}`)
      .set(bearer(await login(altroUtenteTest)))
      .expect(404);
    expect(res.body.errore.codice).toBe("NON_TROVATO");
  });

  it("risponde 400 se l'id non è un UUID", async () => {
    const res = await request(app)
      .get("/pasti/abc")
      .set(bearer(await login()))
      .expect(400);
    expect(res.body.errore.codice).toBe("VALIDAZIONE");
  });

  it("risponde 404 se il pasto non esiste", async () => {
    const res = await request(app)
      .get(`/pasti/${randomUUID()}`)
      .set(bearer(await login()))
      .expect(404);
    expect(res.body.errore.codice).toBe("NON_TROVATO");
  });
});

it("risponde 404 JSON per le rotte sconosciute", async () => {
  const res = await request(app).get("/inesistente").expect(404);
  expect(res.body.errore.codice).toBe("NON_TROVATO");
});
