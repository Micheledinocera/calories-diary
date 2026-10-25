import { randomUUID } from "node:crypto";
import { MikroORM } from "@mikro-orm/postgresql";
import type { Express } from "express";
import type { Redis } from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creaApp } from "../src/app.js";
import { caricaEnv } from "../src/config/env.js";
import { creaConfigOrm } from "../src/db/mikro-orm.config.js";
import { creaLogger } from "../src/lib/logger.js";
import { creaRedis } from "../src/lib/redis.js";

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

describe("GET /health", () => {
  it("risponde 200 con DB e Redis ok", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body).toMatchObject({ stato: "ok", db: "ok", redis: "ok" });
  });
});

describe("/pasti", () => {
  it("elenca i pasti predefiniti in ordine", async () => {
    const res = await request(app).get("/pasti").expect(200);
    expect(res.body.map((p: { nome: string }) => p.nome)).toEqual([
      "Colazione",
      "Pranzo",
      "Cena",
      "Spuntino",
    ]);
  });

  it("restituisce un pasto per id", async () => {
    const [primo] = (await request(app).get("/pasti")).body;
    const res = await request(app).get(`/pasti/${primo.id}`).expect(200);
    expect(res.body).toEqual(primo);
  });

  it("risponde 400 se l'id non è un UUID", async () => {
    const res = await request(app).get("/pasti/abc").expect(400);
    expect(res.body.errore.codice).toBe("VALIDAZIONE");
  });

  it("risponde 404 se il pasto non esiste", async () => {
    const res = await request(app).get(`/pasti/${randomUUID()}`).expect(404);
    expect(res.body.errore.codice).toBe("NON_TROVATO");
  });
});

it("risponde 404 JSON per le rotte sconosciute", async () => {
  const res = await request(app).get("/inesistente").expect(404);
  expect(res.body.errore.codice).toBe("NON_TROVATO");
});
