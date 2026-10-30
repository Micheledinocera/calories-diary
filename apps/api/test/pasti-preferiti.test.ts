import { randomUUID } from "node:crypto";
import { MikroORM } from "@mikro-orm/postgresql";
import {
  giornataSchema,
  paginaPastiPreferitiSchema,
  pastoPreferitoSchema,
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
import { Alimento } from "../src/modules/alimenti/alimento.entity.js";
import { PastoPreferito } from "../src/modules/pasti-preferiti/pasto-preferito.entity.js";
import { creaProviderFinto } from "./provider-finto.js";
import { adminTest, altroUtenteTest } from "./utenti-test.js";

let orm: MikroORM;
let redis: Redis;
let app: Express;

// Own IP (trust proxy is on): these logins do not count towards the limit of app.test.ts.
const IP = "203.0.113.9";

async function login(credenziali: { username: string; password: string }) {
  const res = await request(app)
    .post("/auth/login")
    .set("X-Forwarded-For", IP)
    .send(credenziali)
    .expect(200);
  return { Authorization: `Bearer ${sessioneSchema.parse(res.body).token}` };
}

type Auth = Awaited<ReturnType<typeof login>>;

let admin: Auth;
let auth: Auth;
let altro: Auth;
let username: string;
let pane: string;
let olio: string;

async function creaUtente(prefisso: string) {
  const credenziali = {
    username: `${prefisso}-${randomUUID().slice(0, 8)}`,
    password: "password-nuova-utenza",
  };
  const res = await request(app).post("/utenti").set(admin).send(credenziali).expect(201);
  return {
    id: res.body.id as string,
    username: credenziali.username,
    auth: await login(credenziali),
  };
}

const creaAlimento = async (a: Auth, nome: string, kcal = 100) =>
  (
    await request(app)
      .post("/alimenti")
      .set(a)
      .send({ nome, valoriPer100: { kcal, proteine: 10, carboidrati: 20, grassi: 5 } })
      .expect(201)
  ).body.id as string;

const crea = (nome: string, voci: { alimento: string; quantita: number }[], a: Auth = auth) =>
  request(app).post("/pasti-preferiti").set(a).send({ nome, voci });

const elenca = async (query: Record<string, string>, a: Auth = auth) =>
  paginaPastiPreferitiSchema.parse(
    (await request(app).get("/pasti-preferiti").query(query).set(a).expect(200)).body,
  ).elementi;

const aggiungi = (giorno: string, corpo: object, a: Auth = auth) =>
  request(app).post(`/diario/${giorno}/preferiti`).set(a).send(corpo);

const copia = (giorno: string, da: string, a: Auth = auth) =>
  request(app).post(`/diario/${giorno}/copia`).set(a).send({ da });

const pranzoDi = (corpo: unknown) =>
  giornataSchema.parse(corpo).pasti.find((p) => p.tipo === "pranzo")!;

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

  admin = await login(adminTest);
  const utente = await creaUtente("preferiti");
  auth = utente.auth;
  username = utente.username;
  altro = await login(altroUtenteTest);
  pane = await creaAlimento(auth, "Pane preferito");
  olio = await creaAlimento(auth, "Olio preferito", 900);
});

afterAll(async () => {
  await orm.close(true);
  await redis.quit();
});

describe("/pasti-preferiti", () => {
  it("salva un pasto con le voci in ordine e ne calcola i totali", async () => {
    const res = await crea(" Pranzo veloce ", [
      { alimento: olio, quantita: 10 },
      { alimento: pane, quantita: 50 },
    ]).expect(201);
    const pasto = pastoPreferitoSchema.parse(res.body);
    expect(pasto).toMatchObject({ nome: "Pranzo veloce", autore: username, mio: true });
    expect(pasto.voci.map((v) => v.alimento.id)).toEqual([olio, pane]);
    expect(pasto.totali.kcal).toBe(140);
  });

  it("rifiuta un pasto senza voci o con un alimento inesistente", async () => {
    await crea("Vuoto", []).expect(400);
    await crea("Fantasma", [{ alimento: randomUUID(), quantita: 10 }]).expect(404);
  });

  it("mostra a tutti i pasti di tutti e filtra i propri e per nome", async () => {
    const nome = `Cena ${randomUUID().slice(0, 8)}`;
    const { id } = (await crea(nome, [{ alimento: pane, quantita: 100 }]).expect(201)).body;

    const visto = (await elenca({ q: nome }, altro)).find((p) => p.id === id);
    expect(visto).toMatchObject({ autore: username, mio: false });
    expect((await elenca({ autore: "miei" }, altro)).some((p) => p.id === id)).toBe(false);
    expect((await elenca({ autore: "miei" })).some((p) => p.id === id)).toBe(true);
    expect(await elenca({ q: "100%_inesistente" })).toEqual([]);
  });

  it("ordina per nome e per data di inserimento", async () => {
    const prefisso = `Ordine ${randomUUID().slice(0, 8)}`;
    const voci = [{ alimento: pane, quantita: 100 }];
    const primo = (await crea(`${prefisso} B`, voci).expect(201)).body.id as string;
    const secondo = (await crea(`${prefisso} C`, voci).expect(201)).body.id as string;
    const terzo = (await crea(`${prefisso} A`, voci).expect(201)).body.id as string;
    const ordinati = async (ordine: string) =>
      (await elenca({ q: prefisso, ordine })).map((p) => p.id);

    expect(await ordinati("nome")).toEqual([terzo, primo, secondo]);
    expect(await ordinati("nomeDesc")).toEqual([secondo, primo, terzo]);
    expect(await ordinati("inseritiRecenti")).toEqual([terzo, secondo, primo]);
    expect(await ordinati("inseritiLontani")).toEqual([primo, secondo, terzo]);

    const seconda = paginaPastiPreferitiSchema.parse(
      (
        await request(app)
          .get("/pasti-preferiti")
          .query({ q: prefisso, ordine: "nome", pagina: 2, limite: 2 })
          .set(auth)
          .expect(200)
      ).body,
    );
    expect(seconda).toMatchObject({ totale: 3, pagina: 2 });
    expect(seconda.elementi.map((p) => p.id)).toEqual([secondo]);
  });

  it("lascia modificare ed eliminare solo all'autore", async () => {
    const { id } = (await crea("Mio", [{ alimento: pane, quantita: 100 }]).expect(201)).body;
    const corpo = { nome: "Cambiato", voci: [{ alimento: olio, quantita: 5 }] };

    const res = await request(app).put(`/pasti-preferiti/${id}`).set(altro).send(corpo).expect(403);
    expect(res.body.errore.codice).toBe("PASTO_PREFERITO_NON_TUO");
    await request(app).delete(`/pasti-preferiti/${id}`).set(altro).expect(403);

    const nuovo = await request(app)
      .put(`/pasti-preferiti/${id}`)
      .set(auth)
      .send(corpo)
      .expect(200);
    expect(nuovo.body.nome).toBe("Cambiato");
    expect(nuovo.body.voci).toHaveLength(1);
    expect(nuovo.body.voci[0].alimento.id).toBe(olio);

    await request(app).delete(`/pasti-preferiti/${id}`).set(auth).expect(204);
    await request(app).get(`/pasti-preferiti/${id}`).set(auth).expect(404);
  });

  it("non lascia eliminare un alimento che sta solo in un pasto preferito", async () => {
    const alimento = await creaAlimento(auth, "Solo nel preferito");
    const { id } = (await crea("Blocca", [{ alimento, quantita: 10 }]).expect(201)).body;

    const letto = await request(app).get(`/alimenti/${alimento}`).set(auth).expect(200);
    expect(letto.body).toMatchObject({ utilizzi: 0, eliminabile: false });
    const res = await request(app).delete(`/alimenti/${alimento}`).set(auth).expect(409);
    expect(res.body.errore.codice).toBe("ALIMENTO_IN_USO");

    await request(app).delete(`/pasti-preferiti/${id}`).set(auth).expect(204);
    await request(app).delete(`/alimenti/${alimento}`).set(auth).expect(204);
  });

  it("eliminando l'autore spariscono i suoi pasti, ma i suoi alimenti usati da altri restano", async () => {
    const u = await creaUtente("autore");
    const alimento = await creaAlimento(u.auth, "Usato da un preferito altrui");
    const suo = await creaAlimento(u.auth, "Solo nel suo preferito");
    const { id: suoPasto } = (
      await crea("Suo", [{ alimento: suo, quantita: 10 }], u.auth).expect(201)
    ).body;
    const { id: altrui } = (await crea("Altrui", [{ alimento, quantita: 10 }]).expect(201)).body;

    await request(app).delete(`/utenti/${u.id}`).set(admin).expect(204);

    const em = orm.em.fork();
    expect(await em.findOne(PastoPreferito, { id: suoPasto })).toBeNull();
    expect(await em.findOne(Alimento, { id: suo })).toBeNull();
    expect(await em.findOne(Alimento, { id: alimento })).not.toBeNull();
    await request(app).get(`/pasti-preferiti/${altrui}`).set(auth).expect(200);
  });
});

describe("POST /diario/:giorno/preferiti", () => {
  it("aggiunge un pasto preferito, anche altrui, a un pasto principale e conta l'uso", async () => {
    const alimento = await creaAlimento(auth, "Per il diario altrui");
    const { id } = (await crea("Da usare", [{ alimento, quantita: 100 }]).expect(201)).body;

    const giorno = "2026-05-01";
    const res = await aggiungi(giorno, { preferito: id, tipo: "pranzo" }, altro).expect(200);
    expect(pranzoDi(res.body).voci.map((v) => v.alimento.id)).toEqual([alimento]);

    const letto = await request(app).get(`/alimenti/${alimento}`).set(altro).expect(200);
    expect(letto.body.utilizzi).toBe(1);
  });

  it("aggiunge a uno spuntino salvato senza crearne un altro", async () => {
    const { id } = (await crea("Merenda", [{ alimento: pane, quantita: 20 }]).expect(201)).body;
    const giorno = "2026-05-02";
    const creato = await request(app)
      .post(`/diario/${giorno}/pasti`)
      .set(auth)
      .send({ tipo: "spuntino" })
      .expect(200);
    const spuntino = creato.body.pasti.at(-1);

    const res = await aggiungi(giorno, {
      preferito: id,
      tipo: "spuntino",
      pasto: spuntino.id,
    }).expect(200);
    const g = giornataSchema.parse(res.body);
    expect(g.pasti.filter((p) => p.tipo === "spuntino")).toHaveLength(1);
    expect(g.pasti.at(-1)!.voci).toHaveLength(1);
  });

  it("salta gli alimenti archiviati dall'utente, e rifiuta se non resta nulla", async () => {
    const archiviato = await creaAlimento(auth, "Archiviato per me");
    const { id } = (
      await crea("Misto", [
        { alimento: archiviato, quantita: 10 },
        { alimento: pane, quantita: 10 },
      ]).expect(201)
    ).body;
    const { id: soloArchiviati } = (
      await crea("Solo archiviati", [{ alimento: archiviato, quantita: 10 }]).expect(201)
    ).body;
    await request(app)
      .patch(`/alimenti/${archiviato}`)
      .set(auth)
      .send({ archiviato: true })
      .expect(200);

    const res = await aggiungi("2026-05-03", { preferito: id, tipo: "cena" }).expect(200);
    const cena = giornataSchema.parse(res.body).pasti.find((p) => p.tipo === "cena")!;
    expect(cena.voci.map((v) => v.alimento.id)).toEqual([pane]);

    const vuoto = await aggiungi("2026-05-03", { preferito: soloArchiviati, tipo: "cena" }).expect(
      409,
    );
    expect(vuoto.body.errore.codice).toBe("PREFERITO_VUOTO");
  });

  it("risponde 404 per un pasto preferito inesistente o uno spuntino altrui", async () => {
    await aggiungi("2026-05-04", { preferito: randomUUID(), tipo: "cena" }).expect(404);

    const { id } = (await crea("Per spuntino", [{ alimento: pane, quantita: 20 }]).expect(201))
      .body;
    const creato = await request(app)
      .post("/diario/2026-05-04/pasti")
      .set(auth)
      .send({ tipo: "spuntino" })
      .expect(200);
    await aggiungi(
      "2026-05-04",
      { preferito: id, tipo: "spuntino", pasto: creato.body.pasti.at(-1).id },
      altro,
    ).expect(404);
  });
});

describe("collegamento tra pasto del giorno e pasto preferito", () => {
  const scrivi = (giorno: string, tipo = "pranzo") =>
    request(app)
      .post(`/diario/${giorno}/pasti`)
      .set(auth)
      .send({ tipo, voci: [{ alimento: pane, quantita: 100 }] })
      .expect(200);

  const salva = async (giorno: string, nome: string) => {
    const pranzo = pranzoDi((await scrivi(giorno)).body);
    const res = await request(app)
      .post(`/diario/pasti/${pranzo.id}/preferito`)
      .set(auth)
      .send({ nome })
      .expect(200);
    return pranzoDi(res.body);
  };

  it("salva il pasto del giorno come preferito e li collega", async () => {
    const pranzo = await salva("2026-07-01", "Dal diario");
    expect(pranzo.preferito).toMatchObject({ nome: "Dal diario", mio: true });

    const letto = await request(app).get(`/pasti-preferiti/${pranzo.preferito!.id}`).set(auth);
    expect(letto.body.voci.map((v: { quantita: number }) => v.quantita)).toEqual([100]);
  });

  it("rifiuta di salvare un pasto senza alimenti", async () => {
    const creato = await request(app)
      .post("/diario/2026-07-02/pasti")
      .set(auth)
      .send({ tipo: "spuntino" })
      .expect(200);
    const res = await request(app)
      .post(`/diario/pasti/${creato.body.pasti.at(-1).id}/preferito`)
      .set(auth)
      .send({ nome: "Niente" })
      .expect(409);
    expect(res.body.errore.codice).toBe("PASTO_VUOTO");
  });

  it("aggiunge un preferito solo a un pasto vuoto, e lo collega", async () => {
    const { id } = (await crea("Solo vuoti", [{ alimento: olio, quantita: 5 }]).expect(201)).body;

    const res = await aggiungi("2026-07-03", { preferito: id, tipo: "cena" }).expect(200);
    const cena = giornataSchema.parse(res.body).pasti.find((p) => p.tipo === "cena")!;
    expect(cena.preferito).toMatchObject({ id, mio: true });

    const pieno = await aggiungi("2026-07-03", { preferito: id, tipo: "cena" }).expect(409);
    expect(pieno.body.errore.codice).toBe("PASTO_NON_VUOTO");
  });

  it("non collega un pasto a cui mancano gli alimenti archiviati", async () => {
    const archiviato = await creaAlimento(auth, "Archiviato nel collegamento");
    const { id } = (
      await crea("Parziale", [
        { alimento: archiviato, quantita: 10 },
        { alimento: pane, quantita: 10 },
      ]).expect(201)
    ).body;
    await request(app)
      .patch(`/alimenti/${archiviato}`)
      .set(auth)
      .send({ archiviato: true })
      .expect(200);

    const res = await aggiungi("2026-07-04", { preferito: id, tipo: "pranzo" }).expect(200);
    expect(pranzoDi(res.body).preferito).toBeNull();
  });

  it("perde il collegamento se cambiano le voci del pasto", async () => {
    const pranzo = await salva("2026-07-05", "Aggiunta");
    const dopoAggiunta = await request(app)
      .post("/diario/2026-07-05/pasti")
      .set(auth)
      .send({ tipo: "pranzo", voci: [{ alimento: olio, quantita: 5 }] })
      .expect(200);
    expect(pranzoDi(dopoAggiunta.body).preferito).toBeNull();

    const conQuantita = await salva("2026-07-06", "Quantità");
    const voce = conQuantita.voci[0]!;
    const uguale = await request(app)
      .patch(`/diario/voci/${voce.id}`)
      .set(auth)
      .send({ quantita: voce.quantita })
      .expect(200);
    expect(pranzoDi(uguale.body).preferito).not.toBeNull();
    const cambiata = await request(app)
      .patch(`/diario/voci/${voce.id}`)
      .set(auth)
      .send({ quantita: 200 })
      .expect(200);
    expect(pranzoDi(cambiata.body).preferito).toBeNull();

    const conVoce = await salva("2026-07-07", "Rimozione");
    const rimossa = await request(app)
      .delete(`/diario/voci/${conVoce.voci[0]!.id}`)
      .set(auth)
      .expect(200);
    expect(pranzoDi(rimossa.body).preferito).toBeNull();
    expect(pranzo.preferito).not.toBeNull();
  });

  it("modificando il preferito il collegamento resta solo se cambia il nome", async () => {
    const pranzo = await salva("2026-07-08", "Da rinominare");
    const id = pranzo.preferito!.id;
    const voci = [{ alimento: pane, quantita: 100 }];

    await request(app)
      .put(`/pasti-preferiti/${id}`)
      .set(auth)
      .send({ nome: "Rinominato", voci })
      .expect(200);
    const rinominato = await request(app).get("/diario/2026-07-08").set(auth).expect(200);
    expect(pranzoDi(rinominato.body).preferito).toMatchObject({ nome: "Rinominato" });

    await request(app)
      .put(`/pasti-preferiti/${id}`)
      .set(auth)
      .send({ nome: "Rinominato", voci: [{ alimento: pane, quantita: 150 }] })
      .expect(200);
    const cambiato = await request(app).get("/diario/2026-07-08").set(auth).expect(200);
    expect(pranzoDi(cambiato.body).preferito).toBeNull();
  });

  it("la stella elimina il preferito proprio e scollega tutti i pasti", async () => {
    const pranzo = await salva("2026-07-09", "Da togliere");
    const id = pranzo.preferito!.id;
    await aggiungi("2026-07-10", { preferito: id, tipo: "pranzo" }).expect(200);

    const res = await request(app)
      .delete(`/diario/pasti/${pranzo.id}/preferito`)
      .set(auth)
      .expect(200);
    expect(pranzoDi(res.body).preferito).toBeNull();
    expect(pranzoDi(res.body).voci).toHaveLength(1);
    await request(app).get(`/pasti-preferiti/${id}`).set(auth).expect(404);

    const altroGiorno = await request(app).get("/diario/2026-07-10").set(auth).expect(200);
    expect(pranzoDi(altroGiorno.body).preferito).toBeNull();
  });

  it("la stella su un preferito altrui toglie solo il collegamento", async () => {
    const { id } = (await crea("Altrui", [{ alimento: pane, quantita: 10 }]).expect(201)).body;
    const res = await aggiungi("2026-07-11", { preferito: id, tipo: "pranzo" }, altro).expect(200);
    const pranzo = pranzoDi(res.body);
    expect(pranzo.preferito).toMatchObject({ id, mio: false });

    const tolto = await request(app)
      .delete(`/diario/pasti/${pranzo.id}/preferito`)
      .set(altro)
      .expect(200);
    expect(pranzoDi(tolto.body).preferito).toBeNull();
    await request(app).get(`/pasti-preferiti/${id}`).set(auth).expect(200);
  });

  it("eliminare un preferito dalla sua schermata lascia il diario com'è", async () => {
    const pranzo = await salva("2026-07-12", "Eliminato");
    await request(app).delete(`/pasti-preferiti/${pranzo.preferito!.id}`).set(auth).expect(204);

    const letto = await request(app).get("/diario/2026-07-12").set(auth).expect(200);
    expect(pranzoDi(letto.body).preferito).toBeNull();
    expect(pranzoDi(letto.body).voci).toHaveLength(1);
  });
});

describe("POST /diario/:giorno/copia", () => {
  const voce = (alimento: string, quantita: number) => ({ alimento, quantita });
  const scrivi = (giorno: string, tipo: string, voci: object[]) =>
    request(app).post(`/diario/${giorno}/pasti`).set(auth).send({ tipo, voci }).expect(200);

  it("aggiunge le voci senza togliere quelle già presenti, con gli spuntini in fondo", async () => {
    await scrivi("2026-06-01", "pranzo", [voce(pane, 100)]);
    await scrivi("2026-06-01", "spuntino", [voce(olio, 5)]);
    await scrivi("2026-06-02", "pranzo", [voce(olio, 10)]);
    await scrivi("2026-06-02", "spuntino", [voce(pane, 30)]);

    const res = await copia("2026-06-02", "2026-06-01").expect(200);
    const g = giornataSchema.parse(res.body);
    expect(g.pasti.map((p) => p.tipo)).toEqual([
      "colazione",
      "pranzo",
      "cena",
      "spuntino",
      "spuntino",
    ]);
    expect(pranzoDi(res.body).voci.map((v) => [v.alimento.id, v.quantita])).toEqual([
      [olio, 10],
      [pane, 100],
    ]);
    expect(g.pasti.at(-2)!.voci[0]).toMatchObject({ quantita: 30 });
    expect(g.pasti.at(-1)!.voci[0]).toMatchObject({ quantita: 5 });

    // The source day stays as it was.
    const origine = await request(app).get("/diario/2026-06-01").set(auth).expect(200);
    expect(pranzoDi(origine.body).voci).toHaveLength(1);
  });

  it("copia su un giorno mai scritto e aggiorna l'uso degli alimenti", async () => {
    const alimento = await creaAlimento(auth, "Da copiare");
    await scrivi("2026-06-03", "cena", [voce(alimento, 100)]);

    const res = await copia("2026-06-10", "2026-06-03").expect(200);
    const g = giornataSchema.parse(res.body);
    expect(g.pasti.every((p) => p.id)).toBe(true);
    expect(g.totali.kcal).toBe(100);
    const letto = await request(app).get(`/alimenti/${alimento}`).set(auth).expect(200);
    expect(letto.body.utilizzi).toBe(2);
  });

  it("rifiuta lo stesso giorno e un giorno vuoto", async () => {
    const stesso = await copia("2026-06-11", "2026-06-11").expect(400);
    expect(stesso.body.errore.codice).toBe("STESSO_GIORNO");
    const vuoto = await copia("2026-06-11", "2026-06-12").expect(409);
    expect(vuoto.body.errore.codice).toBe("GIORNO_VUOTO");
  });

  it("copia solo dal diario dell'utente corrente", async () => {
    await scrivi("2026-06-13", "pranzo", [voce(pane, 100)]);
    const res = await copia("2026-06-14", "2026-06-13", altro).expect(409);
    expect(res.body.errore.codice).toBe("GIORNO_VUOTO");
  });
});
