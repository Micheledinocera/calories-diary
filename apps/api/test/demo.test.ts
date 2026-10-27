import { MikroORM } from "@mikro-orm/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { caricaEnv } from "../src/config/env.js";
import { creaConfigOrm } from "../src/db/mikro-orm.config.js";
import { alimentiDemo, ErroreDemo, giornateDemo, seedDemo } from "../src/db/seeders/demo.seeder.js";
import { Pasto } from "../src/modules/diario/pasto.entity.js";
import { creaUtentiService } from "../src/modules/utenti/utenti.service.js";

// Targets of the demo user: 2000 kcal, 50/30/20 → 250 g carbohydrates, 100 g proteins, 66.7 g fats.
const FABBISOGNO = 2000;
const obiettivi = { carboidrati: 250, proteine: 100, grassi: (2000 * 0.3) / 9 };

function totali(pasti: (typeof giornateDemo)[keyof typeof giornateDemo]) {
  const t = { kcal: 0, carboidrati: 0, proteine: 0, grassi: 0 };
  for (const { voci } of pasti) {
    for (const [chiave, quantita] of voci) {
      const valori = alimentiDemo[chiave].valori;
      for (const k of Object.keys(t) as (keyof typeof t)[]) t[k] += (valori[k] * quantita) / 100;
    }
  }
  return t;
}

const macroOltre = (t: ReturnType<typeof totali>) =>
  (Object.keys(obiettivi) as (keyof typeof obiettivi)[]).filter((k) => t[k] > obiettivi[k]);

describe("giornate demo", () => {
  it("entroA ed entroB restano entro il fabbisogno e gli obiettivi dei macro", () => {
    for (const giornata of [giornateDemo.entroA, giornateDemo.entroB]) {
      const t = totali(giornata);
      expect(t.kcal).toBeLessThanOrEqual(FABBISOGNO);
      expect(macroOltre(t)).toEqual([]);
    }
  });

  it("macroOltre resta entro il fabbisogno con i grassi oltre l'obiettivo", () => {
    const t = totali(giornateDemo.macroOltre);
    expect(t.kcal).toBeLessThanOrEqual(FABBISOGNO);
    expect(macroOltre(t)).toContain("grassi");
  });

  it("oltre supera il fabbisogno", () => {
    expect(totali(giornateDemo.oltre).kcal).toBeGreaterThan(FABBISOGNO);
  });
});

describe("seedDemo", () => {
  let orm: MikroORM;
  const username = "demo";

  beforeAll(async () => {
    orm = await MikroORM.init(creaConfigOrm(caricaEnv()));
    await creaUtentiService(orm.em.fork()).crea(username, "password-della-demo");
  });

  afterAll(() => orm.close(true));

  it("riempie il diario di un utente senza alimenti, una volta sola", async () => {
    const risultato = await seedDemo(orm.em.fork(), username);
    expect(risultato.alimenti).toBe(Object.keys(alimentiDemo).length);
    expect(risultato.giorni).toBeGreaterThan(25);
    expect(await orm.em.fork().count(Pasto, { utente: { username } })).toBeGreaterThan(100);

    await expect(seedDemo(orm.em.fork(), username)).rejects.toBeInstanceOf(ErroreDemo);
  });

  it("rifiuta un utente che non esiste", async () => {
    await expect(seedDemo(orm.em.fork(), "nessuno")).rejects.toBeInstanceOf(ErroreDemo);
  });
});
