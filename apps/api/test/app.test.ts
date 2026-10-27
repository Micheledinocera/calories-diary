import { randomUUID } from "node:crypto";
import { MikroORM } from "@mikro-orm/postgresql";
import {
  alimentoSchema,
  giornataSchema,
  listaAlimentiSchema,
  listaRiepiloghiSchema,
  obiettiviSchema,
  lookupBarcodeSchema,
  sessioneSchema,
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
      .send({ ...utenteTest, username: " IO.Test " })
      .expect(200);
    const sessione = sessioneSchema.parse(res.body);
    expect(sessione.utente).toMatchObject({ username: utenteTest.username, ruolo: "utente" });
    const giorni = (Date.parse(sessione.scadeIl) - Date.now()) / 86_400_000;
    expect(giorni).toBeCloseTo(7, 1);
  });

  it("risponde 401 con password errata o username sconosciuto", async () => {
    for (const credenziali of [
      { ...utenteTest, password: "sbagliata" },
      { username: "nessuno", password: "qualsiasi" },
    ]) {
      const res = await request(app).post("/auth/login").send(credenziali).expect(401);
      expect(res.body.errore.codice).toBe("CREDENZIALI_ERRATE");
    }
  });

  it("risponde 400 se le credenziali non sono valide", async () => {
    const res = await request(app).post("/auth/login").send({ username: "io" }).expect(400);
    expect(res.body.errore.codice).toBe("VALIDAZIONE");
  });

  it("blocca con 429 dopo 5 tentativi sullo stesso username", async () => {
    const credenziali = { username: "bersaglio", password: "tentativo" };
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
    const dati = { utenteId: randomUUID(), versione: 0 };
    const orfano = await creaGestoreToken(caricaEnv().JWT_SECRET).firma(dati);
    const altroSegreto = await creaGestoreToken("x".repeat(32)).firma(dati);
    for (const headers of [{}, bearer("abc"), bearer(orfano.token), bearer(altroSegreto.token)]) {
      const res = await request(app).get("/auth/io").set(headers).expect(401);
      expect(res.body.errore.codice).toBe("NON_AUTENTICATO");
    }
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

describe("/alimenti", () => {
  // One login per user for the whole block: every attempt counts towards the per-IP login limit.
  let auth: ReturnType<typeof bearer>;
  let altro: ReturnType<typeof bearer>;
  beforeAll(async () => {
    auth = bearer(await login());
    altro = bearer(await login(altroUtenteTest));
  });

  const yogurt = {
    nome: "Yogurt greco",
    marca: "Fage",
    valoriPer100: { kcal: 97, proteine: 9, carboidrati: 4, grassi: 5 },
    porzioni: [{ nome: "1 vasetto", quantita: 170, predefinita: true }],
  };

  const crea = (body: object, headers = auth) =>
    request(app).post("/alimenti").set(headers).send(body);

  it("richiede l'autenticazione", async () => {
    await request(app).get("/alimenti").expect(401);
  });

  it("crea un alimento manuale con le porzioni", async () => {
    const res = await crea(yogurt).expect(201);
    const alimento = alimentoSchema.parse(res.body);
    expect(alimento).toMatchObject({
      nome: "Yogurt greco",
      fonte: "manuale",
      barcode: null,
      unitaBase: "g",
      verificato: false,
      archiviato: false,
      utilizzi: 0,
      ultimoUso: null,
      eliminabile: true,
      importatoIl: null,
      avvisi: [],
      porzioni: [{ nome: "1 vasetto", quantita: 170, predefinita: true }],
    });
    const letto = await request(app).get(`/alimenti/${alimento.id}`).set(auth).expect(200);
    expect(letto.body).toEqual(res.body);
  });

  it("collega al catalogo un alimento con barcode noto", async () => {
    await request(app).get("/catalogo/barcode/8076809513753").set(auth).expect(200);
    const res = await crea({
      nome: "Pesto alla genovese",
      barcode: "8076809513753",
      valoriPer100: { kcal: 492, proteine: 4.7, carboidrati: 11, grassi: 47 },
    }).expect(201);
    expect(res.body).toMatchObject({ fonte: "off", barcode: "8076809513753" });
    expect(res.body.importatoIl).not.toBeNull();

    // The barcode is unique in the shared pool: 409 with the existing food, for any user.
    for (const headers of [auth, altro]) {
      const doppio = await crea({ ...yogurt, barcode: "8076809513753" }, headers).expect(409);
      expect(doppio.body.errore).toMatchObject({
        codice: "ALIMENTO_ESISTENTE",
        dettagli: { id: res.body.id },
      });
    }
  });

  it("segnala le kcal incoerenti", async () => {
    const res = await crea({
      nome: "Biscotti",
      valoriPer100: { kcal: 900, proteine: 7, carboidrati: 70, grassi: 18 },
    }).expect(201);
    expect(res.body.avvisi).toEqual(["KCAL_INCOERENTI"]);
  });

  it("rifiuta valori mancanti, negativi o porzioni non valide", async () => {
    for (const body of [
      { nome: "Senza valori" },
      { ...yogurt, valoriPer100: { ...yogurt.valoriPer100, grassi: -1 } },
      { ...yogurt, nome: " " },
      {
        ...yogurt,
        porzioni: [
          { nome: "a", quantita: 10, predefinita: true },
          { nome: "b", quantita: 20, predefinita: true },
        ],
      },
      { ...yogurt, porzioni: [{ nome: "a", quantita: 0 }] },
    ]) {
      const res = await crea(body).expect(400);
      expect(res.body.errore.codice).toBe("VALIDAZIONE");
    }
  });

  it("modifica, sostituisce le porzioni, verifica e archivia", async () => {
    const { id } = (await crea({ ...yogurt, nome: "Ricotta" }).expect(201)).body;
    const res = await request(app)
      .patch(`/alimenti/${id}`)
      .set(auth)
      .send({
        valoriPer100: { kcal: 146, proteine: 8.8, carboidrati: 3.5, grassi: 10.9 },
        porzioni: [{ nome: "1 cucchiaio", quantita: 30 }],
        verificato: true,
      })
      .expect(200);
    expect(res.body).toMatchObject({
      nome: "Ricotta",
      verificato: true,
      valoriPer100: { kcal: 146 },
      porzioni: [{ nome: "1 cucchiaio", quantita: 30, predefinita: false }],
    });

    await request(app).patch(`/alimenti/${id}`).set(auth).send({ archiviato: true }).expect(200);
    const attivi = listaAlimentiSchema.parse(
      (await request(app).get("/alimenti").set(auth).expect(200)).body,
    );
    expect(attivi.map((a) => a.id)).not.toContain(id);
    const archiviati = await request(app).get("/alimenti?archiviati=true").set(auth).expect(200);
    expect(archiviati.body.map((a: { id: string }) => a.id)).toContain(id);
  });

  it("cerca per nome, marca o barcode", async () => {
    // The pool is shared with the demo test, which may run alongside: check only these foods.
    const cerca = async (q: string) =>
      (
        (await request(app).get("/alimenti").query({ q, ordine: "nome" }).set(auth).expect(200))
          .body as { nome: string }[]
      ).map((a) => a.nome);
    expect(await cerca("greco")).toContain("Yogurt greco");
    expect(await cerca("FAGE")).toContain("Yogurt greco");
    expect(await cerca("FAGE")).not.toContain("Pesto alla genovese");
    expect(await cerca("8076809513753")).toEqual(["Pesto alla genovese"]);
    expect(await cerca("100%")).toEqual([]);
  });

  it("i recenti contengono solo alimenti già usati", async () => {
    const res = await request(app).get("/alimenti?ordine=recenti").set(auth).expect(200);
    expect(res.body).toEqual([]);
  });

  it("condivide gli alimenti: tutti li vedono e li correggono, solo l'autore li elimina", async () => {
    const { id } = (await crea({ ...yogurt, nome: "Condiviso" }).expect(201)).body;
    const visti = await request(app).get("/alimenti").set(altro).expect(200);
    expect(visti.body.map((a: { id: string }) => a.id)).toContain(id);

    const corretto = await request(app)
      .patch(`/alimenti/${id}`)
      .set(altro)
      .send({ nome: "Condiviso e corretto" })
      .expect(200);
    expect(corretto.body).toMatchObject({ nome: "Condiviso e corretto", eliminabile: false });
    const letto = await request(app).get(`/alimenti/${id}`).set(auth).expect(200);
    expect(letto.body).toMatchObject({ nome: "Condiviso e corretto", eliminabile: true });

    const res = await request(app).delete(`/alimenti/${id}`).set(altro).expect(403);
    expect(res.body.errore.codice).toBe("ALIMENTO_NON_TUO");
  });

  it("archivia solo per chi lo chiede", async () => {
    const { id } = (await crea({ ...yogurt, nome: "Nascosto a me" }).expect(201)).body;
    const res = await request(app)
      .patch(`/alimenti/${id}`)
      .set(auth)
      .send({ archiviato: true })
      .expect(200);
    expect(res.body.archiviato).toBe(true);

    const ids = async (headers: ReturnType<typeof bearer>) =>
      ((await request(app).get("/alimenti").set(headers).expect(200)).body as { id: string }[]).map(
        (a) => a.id,
      );
    expect(await ids(auth)).not.toContain(id);
    expect(await ids(altro)).toContain(id);
    const suo = await request(app).get(`/alimenti/${id}`).set(altro).expect(200);
    expect(suo.body.archiviato).toBe(false);
  });

  it("elimina un alimento mai usato", async () => {
    const { id } = (await crea({ ...yogurt, nome: "Da eliminare" }).expect(201)).body;
    await request(app).delete(`/alimenti/${id}`).set(auth).expect(204);
    await request(app).get(`/alimenti/${id}`).set(auth).expect(404);
  });
});

describe("/diario", () => {
  let auth: ReturnType<typeof bearer>;
  let altro: ReturnType<typeof bearer>;
  // Round values per 100 g/ml: easy totals.
  let pane: string;
  let olio: string;
  beforeAll(async () => {
    auth = bearer(await login());
    altro = bearer(await login(altroUtenteTest));
    const crea = async (body: object) =>
      (await request(app).post("/alimenti").set(auth).send(body).expect(201)).body.id as string;
    pane = await crea({
      nome: "Pane del diario",
      valoriPer100: { kcal: 100, proteine: 10, carboidrati: 20, grassi: 5 },
    });
    olio = await crea({
      nome: "Olio del diario",
      unitaBase: "ml",
      valoriPer100: { kcal: 800, proteine: 0, carboidrati: 0, grassi: 90 },
    });
  });

  const giornata = async (giorno: string, headers = auth) =>
    giornataSchema.parse(
      (await request(app).get(`/diario/${giorno}`).set(headers).expect(200)).body,
    );
  const aggiungiPasto = (giorno: string, body: object, headers = auth) =>
    request(app).post(`/diario/${giorno}/pasti`).set(headers).send(body);
  const tipi = (g: { pasti: { tipo: string }[] }) => g.pasti.map((p) => p.tipo);
  const ids = (body: { pasti: { id: string | null }[] }) => body.pasti.map((p) => p.id);

  it("richiede l'autenticazione", async () => {
    await request(app).get("/diario/2026-01-10").expect(401);
  });

  it("un giorno vuoto mostra colazione, pranzo e cena vuoti", async () => {
    const vuoti = { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 };
    expect(await giornata("2026-01-01")).toEqual({
      giorno: "2026-01-01",
      pasti: ["colazione", "pranzo", "cena"].map((tipo) => ({
        id: null,
        tipo,
        voci: [],
        totali: vuoti,
        suggerite: [],
      })),
      totali: vuoti,
    });
  });

  it("aggiunge le voci e calcola i totali del pasto e del giorno", async () => {
    const res = await aggiungiPasto("2026-01-10", {
      tipo: "pranzo",
      voci: [
        { alimento: pane, quantita: 50 },
        { alimento: olio, quantita: 10 },
      ],
    }).expect(200);
    const g = giornataSchema.parse(res.body);
    expect(tipi(g)).toEqual(["colazione", "pranzo", "cena"]);
    expect(g.pasti.every((p) => p.id)).toBe(true);
    const pranzo = g.pasti[1]!;
    expect(pranzo.voci.map((v) => [v.alimento.nome, v.quantita])).toEqual([
      ["Pane del diario", 50],
      ["Olio del diario", 10],
    ]);
    expect(pranzo.totali).toEqual({ kcal: 130, proteine: 5, carboidrati: 10, grassi: 11.5 });
    expect(g.totali).toEqual(pranzo.totali);

    // A second call for the same main meal adds to it instead of creating another one.
    const secondo = await aggiungiPasto("2026-01-10", {
      tipo: "pranzo",
      voci: [{ alimento: pane, quantita: 50 }],
    }).expect(200);
    expect(secondo.body.pasti).toHaveLength(3);
    expect(secondo.body.pasti[1].voci).toHaveLength(3);
  });

  it("aggiorna recenti e più usati, e non lascia eliminare un alimento usato", async () => {
    const letto = (await request(app).get(`/alimenti/${pane}`).set(auth).expect(200)).body;
    expect(letto.utilizzi).toBe(2);
    expect(letto.ultimoUso).not.toBeNull();
    const res = await request(app).delete(`/alimenti/${pane}`).set(auth).expect(409);
    expect(res.body.errore.codice).toBe("ALIMENTO_IN_USO");
  });

  it("ricalcola i valori quando l'alimento cambia, anche nei giorni passati", async () => {
    await request(app)
      .patch(`/alimenti/${olio}`)
      .set(auth)
      .send({ valoriPer100: { kcal: 900, proteine: 0, carboidrati: 0, grassi: 100 } })
      .expect(200);
    const pranzo = (await giornata("2026-01-10")).pasti[1]!;
    expect(pranzo.voci[1]!.valori).toEqual({ kcal: 90, proteine: 0, carboidrati: 0, grassi: 10 });
  });

  it("aggiunge più spuntini, li sposta tra i pasti e li elimina", async () => {
    await aggiungiPasto("2026-01-10", { tipo: "spuntino" }).expect(200);
    const g = giornataSchema.parse(
      (
        await aggiungiPasto("2026-01-10", {
          tipo: "spuntino",
          voci: [{ alimento: pane, quantita: 30 }],
        }).expect(200)
      ).body,
    );
    expect(tipi(g)).toEqual(["colazione", "pranzo", "cena", "spuntino", "spuntino"]);
    const [colazione, pranzo, cena, primo, secondo] = g.pasti.map((p) => p.id!);

    const ordine = [colazione, secondo, pranzo, cena, primo];
    const spostato = await request(app)
      .put("/diario/2026-01-10/ordine")
      .set(auth)
      .send({ pasti: ordine })
      .expect(200);
    expect(ids(spostato.body)).toEqual(ordine);

    // Main meals keep their order, and every saved meal must be listed.
    for (const pasti of [
      [pranzo, colazione, cena, primo, secondo],
      [colazione, pranzo, cena, primo],
      [colazione, pranzo, cena, primo, randomUUID()],
    ]) {
      const res = await request(app)
        .put("/diario/2026-01-10/ordine")
        .set(auth)
        .send({ pasti })
        .expect(400);
      expect(res.body.errore.codice).toBe("ORDINE_NON_VALIDO");
    }

    const res = await request(app).delete(`/diario/pasti/${pranzo}`).set(auth).expect(409);
    expect(res.body.errore.codice).toBe("PASTO_NON_ELIMINABILE");
    const dopo = await request(app).delete(`/diario/pasti/${secondo}`).set(auth).expect(200);
    expect(ids(dopo.body)).toEqual([colazione, pranzo, cena, primo]);
    // The deleted snack's entry no longer counts as a use.
    const letto = (await request(app).get(`/alimenti/${pane}`).set(auth).expect(200)).body;
    expect(letto.utilizzi).toBe(2);
  });

  it("modifica la quantità di una voce e la elimina", async () => {
    const pranzo = (await giornata("2026-01-10")).pasti.find((p) => p.tipo === "pranzo")!;
    const voce = pranzo.voci[0]!;
    const trova = (body: { pasti: { id: string; voci: { id: string }[] }[] }) =>
      body.pasti.find((p) => p.id === pranzo.id)!.voci;

    const modificato = await request(app)
      .patch(`/diario/voci/${voce.id}`)
      .set(auth)
      .send({ quantita: 100 })
      .expect(200);
    expect(trova(modificato.body)[0]).toMatchObject({ quantita: 100, valori: { kcal: 100 } });

    const eliminata = await request(app).delete(`/diario/voci/${voce.id}`).set(auth).expect(200);
    expect(trova(eliminata.body).map((v) => v.id)).not.toContain(voce.id);
  });

  it("propone per un pasto vuoto le voci dello stesso pasto del giorno prima", async () => {
    const g = await giornata("2026-01-11");
    const pranzo = g.pasti.find((p) => p.tipo === "pranzo")!;
    expect(pranzo.id).toBeNull();
    expect(pranzo.suggerite.map((v) => v.alimento.nome).sort()).toEqual([
      "Olio del diario",
      "Pane del diario",
    ]);
    expect(g.pasti.find((p) => p.tipo === "cena")!.suggerite).toEqual([]);
    expect(g.totali.kcal).toBe(0);
  });

  it("riepiloga per il calendario i giorni con almeno una voce", async () => {
    await aggiungiPasto("2026-01-12", {
      tipo: "cena",
      voci: [{ alimento: pane, quantita: 100 }],
    }).expect(200);
    const res = await request(app)
      .get("/diario")
      .query({ da: "2026-01-01", a: "2026-01-31" })
      .set(auth)
      .expect(200);
    const riepiloghi = listaRiepiloghiSchema.parse(res.body);
    expect(riepiloghi.map((r) => r.giorno)).toEqual(["2026-01-10", "2026-01-12"]);
    expect(riepiloghi[1]!.totali.kcal).toBe(100);
    await request(app)
      .get("/diario")
      .query({ da: "2026-01-31", a: "2026-01-01" })
      .set(auth)
      .expect(400);
  });

  it("non mostra né modifica il diario di un altro utente", async () => {
    const g = await giornata("2026-01-10");
    const voce = g.pasti.flatMap((p) => p.voci)[0]!;
    const spuntino = g.pasti.find((p) => p.tipo === "spuntino")!;
    for (const req of [
      request(app).patch(`/diario/voci/${voce.id}`).send({ quantita: 1 }),
      request(app).delete(`/diario/voci/${voce.id}`),
      request(app).delete(`/diario/pasti/${spuntino.id}`),
      request(app).post(`/diario/pasti/${spuntino.id}/voci`).send({ alimento: pane, quantita: 1 }),
    ]) {
      const res = await req.set(altro).expect(404);
      expect(res.body.errore.codice).toBe("NON_TROVATO");
    }
    expect((await giornata("2026-01-10", altro)).pasti.every((p) => p.id === null)).toBe(true);

    // A food that does not exist cannot go into the diary.
    const res = await aggiungiPasto(
      "2026-01-10",
      { tipo: "cena", voci: [{ alimento: randomUUID(), quantita: 10 }] },
      altro,
    ).expect(404);
    expect(res.body.errore.codice).toBe("NON_TROVATO");
  });

  it("un alimento condiviso tiene recenti e più usati per utente", async () => {
    const latte = (
      await request(app)
        .post("/alimenti")
        .set(auth)
        .send({
          nome: "Latte condiviso",
          unitaBase: "ml",
          valoriPer100: { kcal: 46, proteine: 3.3, carboidrati: 4.9, grassi: 1.5 },
        })
        .expect(201)
    ).body.id as string;
    const g = (
      await aggiungiPasto(
        "2026-02-01",
        { tipo: "colazione", voci: [{ alimento: latte, quantita: 200 }] },
        altro,
      ).expect(200)
    ).body as { pasti: { voci: { id: string }[] }[] };

    const uso = async (headers: ReturnType<typeof bearer>) =>
      (await request(app).get(`/alimenti/${latte}`).set(headers).expect(200)).body;
    expect(await uso(altro)).toMatchObject({ utilizzi: 1, eliminabile: false });
    expect(await uso(auth)).toMatchObject({ utilizzi: 0, ultimoUso: null, eliminabile: false });

    // Used only by the other user, the author still cannot delete it.
    const res = await request(app).delete(`/alimenti/${latte}`).set(auth).expect(409);
    expect(res.body.errore.codice).toBe("ALIMENTO_IN_USO");

    // Removed from that diary, the author can delete it again.
    const voce = g.pasti.flatMap((p) => p.voci)[0]!;
    await request(app).delete(`/diario/voci/${voce.id}`).set(altro).expect(200);
    expect(await uso(auth)).toMatchObject({ eliminabile: true });
  });

  it("risponde 400 con un giorno o una voce non validi", async () => {
    for (const req of [
      request(app).get("/diario/2026-13-01"),
      request(app).post("/diario/oggi/pasti").send({ tipo: "pranzo" }),
      request(app).post("/diario/2026-01-10/pasti").send({ tipo: "merenda" }),
      request(app)
        .post("/diario/2026-01-10/pasti")
        .send({ tipo: "pranzo", voci: [{ alimento: pane, quantita: -1 }] }),
    ]) {
      const res = await req.set(auth).expect(400);
      expect(res.body.errore.codice).toBe("VALIDAZIONE");
    }
  });
});

describe("/obiettivi", () => {
  let auth: ReturnType<typeof bearer>;
  beforeAll(async () => {
    auth = bearer(await login());
  });

  it("parte senza fabbisogno e con la ripartizione 50/30/20", async () => {
    const res = await request(app).get("/obiettivi").set(auth).expect(200);
    expect(obiettiviSchema.parse(res.body)).toEqual({
      fabbisogno: null,
      ripartizione: { carboidrati: 50, grassi: 30, proteine: 20 },
    });
  });

  it("salva fabbisogno e ripartizione, rifiuta una somma diversa da 100", async () => {
    const obiettivi = {
      fabbisogno: 2200,
      ripartizione: { carboidrati: 45, grassi: 30, proteine: 25 },
    };
    await request(app).put("/obiettivi").set(auth).send(obiettivi).expect(200);
    expect((await request(app).get("/obiettivi").set(auth).expect(200)).body).toEqual(obiettivi);

    const res = await request(app)
      .put("/obiettivi")
      .set(auth)
      .send({ ...obiettivi, ripartizione: { carboidrati: 50, grassi: 30, proteine: 30 } })
      .expect(400);
    expect(res.body.errore.codice).toBe("VALIDAZIONE");
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
