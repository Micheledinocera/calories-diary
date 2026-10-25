import { randomUUID } from "node:crypto";
import { MikroORM } from "@mikro-orm/postgresql";
import { lookupBarcodeSchema, sessioneSchema } from "@calories-diary/shared";
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
import { creaLimiteProvider } from "../src/modules/catalogo/limite-provider.js";
import { creaProviderFinto } from "./provider-finto.js";
import { altroUtenteTest, utenteTest } from "./utenti-test.js";

let orm: MikroORM;
let redis: Redis;
let app: Express;
const { provider, stato } = creaProviderFinto();

beforeAll(async () => {
  const env = caricaEnv();
  orm = await MikroORM.init(creaConfigOrm(env));
  redis = creaRedis(env);
  await redis.connect();
  app = creaApp({ env, orm, redis, logger: creaLogger(env), provider });
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

describe("/catalogo/barcode/:codice", () => {
  // One login for the whole block: every attempt counts towards the per-IP login limit.
  let auth: ReturnType<typeof bearer>;
  beforeAll(async () => {
    auth = bearer(await login());
  });

  const cerca = (codice: string, status: number) =>
    request(app).get(`/catalogo/barcode/${codice}`).set(auth).expect(status);

  it("richiede l'autenticazione", async () => {
    await request(app).get("/catalogo/barcode/8076809513753").expect(401);
  });

  it("importa dal provider, poi risponde dal catalogo", async () => {
    const primo = lookupBarcodeSchema.parse((await cerca("8076809513753", 200)).body);
    expect(primo).toMatchObject({
      origine: "provider",
      avvisi: [],
      prodotto: {
        barcode: "8076809513753",
        nome: "Pesto alla genovese",
        valoriPer100: { kcal: 492 },
      },
    });

    const chiamate = stato.chiamate.length;
    const secondo = lookupBarcodeSchema.parse((await cerca("8076809513753", 200)).body);
    expect(secondo.origine).toBe("catalogo");
    expect(secondo.prodotto).toEqual(primo.prodotto);
    expect(stato.chiamate.length).toBe(chiamate);
  });

  it("normalizza il codice e segnala i valori parziali", async () => {
    const res = await cerca("000000000012345", 200);
    expect(res.body.prodotto).toMatchObject({ barcode: "00012345", unitaBase: "ml" });
    expect(res.body.avvisi).toEqual(["VALORI_PARZIALI"]);
    await cerca("12345", 200);
    expect(stato.chiamate.filter((c) => c === "00012345")).toHaveLength(1);
  });

  it("risponde 404 e non richiama il provider per lo stesso codice", async () => {
    const res = await cerca("4000000000001", 404);
    expect(res.body.errore.codice).toBe("PRODOTTO_NON_TROVATO");
    await cerca("4000000000001", 404);
    expect(stato.chiamate.filter((c) => c === "4000000000001")).toHaveLength(1);
  });

  it("risponde 503 se il provider non è raggiungibile", async () => {
    stato.guasto = true;
    try {
      const res = await cerca("4000000000002", 503);
      expect(res.body.errore.codice).toBe("PROVIDER_NON_DISPONIBILE");
    } finally {
      stato.guasto = false;
    }
  });

  it("risponde 400 se il codice non è valido", async () => {
    for (const codice of ["abc", "000", "123456789012345"]) {
      const res = await cerca(codice, 400);
      expect(res.body.errore.codice).toBe("VALIDAZIONE");
    }
  });
});

describe("limite delle chiamate al provider", () => {
  it("blocca con 429 oltre il massimo della finestra", async () => {
    const limite = creaLimiteProvider(redis, creaLogger(caricaEnv()), {
      chiave: `provider:test:${randomUUID()}`,
      max: 2,
    });
    await limite.registraChiamata();
    await limite.registraChiamata();
    await expect(limite.registraChiamata()).rejects.toMatchObject({
      status: 429,
      codice: "PROVIDER_OCCUPATO",
    });
  });
});

it("risponde 404 JSON per le rotte sconosciute", async () => {
  const res = await request(app).get("/inesistente").expect(404);
  expect(res.body.errore.codice).toBe("NON_TROVATO");
});
