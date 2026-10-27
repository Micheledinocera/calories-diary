import type { EntityManager } from "@mikro-orm/postgresql";
import { Alimento } from "../../modules/alimenti/alimento.entity.js";
import { Porzione } from "../../modules/alimenti/porzione.entity.js";
import { UsoAlimento } from "../../modules/alimenti/uso-alimento.entity.js";
import { Pasto } from "../../modules/diario/pasto.entity.js";
import { Voce } from "../../modules/diario/voce.entity.js";
import { chiaveUsername, Utente } from "../../modules/utenti/utente.entity.js";

/**
 * Fake data for usability tests (`pnpm db:seed:demo <username>`): foods with portions and about five
 * weeks of diary for an existing user, with days within the need, with a macro over its target
 * and over the need. Never in production, and only for a user without a diary: it must not mix
 * with real data. Its foods join the shared pool.
 */

type ValoriPer100 = { kcal: number; carboidrati: number; proteine: number; grassi: number };

interface AlimentoDemo {
  nome: string;
  marca?: string;
  unitaBase?: "g" | "ml";
  valori: ValoriPer100;
  porzioni?: [nome: string, quantita: number][];
  verificato?: boolean;
}

const v = (kcal: number, carboidrati: number, proteine: number, grassi: number) => ({
  kcal,
  carboidrati,
  proteine,
  grassi,
});

export const alimentiDemo = {
  yogurt: {
    nome: "Yogurt greco bianco",
    marca: "Fage",
    valori: v(97, 4, 9, 5),
    porzioni: [["1 vasetto", 150]],
    verificato: true,
  },
  avena: {
    nome: "Fiocchi d'avena",
    marca: "Quaker",
    valori: v(375, 58, 13.5, 7),
    porzioni: [["1 porzione", 40]],
    verificato: true,
  },
  banana: { nome: "Banana", valori: v(89, 22.8, 1.1, 0.3), porzioni: [["1 banana", 120]] },
  latte: {
    nome: "Latte parzialmente scremato",
    unitaBase: "ml",
    valori: v(46, 5, 3.3, 1.6),
    porzioni: [["1 tazza", 200]],
  },
  fette: {
    nome: "Fette biscottate integrali",
    marca: "Mulino Bianco",
    valori: v(410, 72, 11, 8),
    porzioni: [["1 fetta", 10]],
    verificato: true,
  },
  marmellata: {
    nome: "Marmellata di albicocche",
    valori: v(250, 60, 0.5, 0),
    porzioni: [["1 cucchiaino", 15]],
  },
  pasta: {
    nome: "Pasta integrale",
    marca: "Barilla",
    valori: v(350, 65, 13, 2.5),
    porzioni: [
      ["1 porzione", 80],
      ["Porzione abbondante", 120],
    ],
    verificato: true,
  },
  riso: { nome: "Riso basmati", valori: v(355, 78, 8, 1), porzioni: [["1 porzione", 80]] },
  pollo: { nome: "Petto di pollo", valori: v(110, 0, 23, 1.2), porzioni: [["1 petto", 150]] },
  salmone: { nome: "Salmone", valori: v(208, 0, 20, 13.4), porzioni: [["1 trancio", 150]] },
  merluzzo: { nome: "Merluzzo", valori: v(82, 0, 18, 0.7), porzioni: [["1 filetto", 200]] },
  uova: { nome: "Uova", valori: v(143, 0.7, 12.6, 9.5), porzioni: [["1 uovo", 60]] },
  olio: {
    nome: "Olio extravergine d'oliva",
    valori: v(899, 0, 0, 100),
    porzioni: [["1 cucchiaio", 10]],
  },
  pomodorini: { nome: "Pomodorini", valori: v(20, 3.2, 1.2, 0.2) },
  zucchine: { nome: "Zucchine", valori: v(17, 3.1, 1.2, 0.3) },
  insalata: { nome: "Insalata mista", valori: v(20, 2.5, 1.3, 0.2) },
  pane: { nome: "Pane integrale", valori: v(250, 45, 9, 2.5), porzioni: [["1 fetta", 40]] },
  parmigiano: {
    nome: "Parmigiano Reggiano",
    valori: v(392, 0, 33, 28),
    porzioni: [["1 cucchiaio grattugiato", 10]],
  },
  pizza: {
    nome: "Pizza margherita",
    valori: v(270, 33, 11, 10),
    porzioni: [
      ["1 pizza", 300],
      ["Mezza pizza", 150],
    ],
  },
  lasagne: { nome: "Lasagne al ragù", valori: v(160, 15, 7, 8), porzioni: [["1 porzione", 300]] },
  birra: {
    nome: "Birra chiara",
    unitaBase: "ml",
    valori: v(43, 3.6, 0.5, 0),
    porzioni: [["1 bottiglia", 330]],
  },
  mela: { nome: "Mela", valori: v(52, 13.8, 0.3, 0.2), porzioni: [["1 mela", 180]] },
  noci: { nome: "Noci", valori: v(654, 7, 15, 65), porzioni: [["1 manciata", 30]] },
  barretta: {
    nome: "Barretta ai cereali",
    marca: "Misura",
    valori: v(435, 65, 6.5, 15),
    porzioni: [["1 barretta", 25]],
    verificato: true,
  },
  piadina: { nome: "Piadina", valori: v(330, 54, 8.5, 9), porzioni: [["1 piadina", 110]] },
  prosciutto: { nome: "Prosciutto crudo", valori: v(270, 0, 26, 18) },
  stracchino: { nome: "Stracchino", valori: v(300, 0, 18, 25) },
} satisfies Record<string, AlimentoDemo>;

type ChiaveAlimento = keyof typeof alimentiDemo;
type PastoDemo = {
  tipo: "colazione" | "pranzo" | "cena" | "spuntino";
  voci: [ChiaveAlimento, number][];
};

/** Day templates, in order within the day; the state each one gives with 2000 kcal and 50/30/20. */
export const giornateDemo: Record<"entroA" | "entroB" | "macroOltre" | "oltre", PastoDemo[]> = {
  entroA: [
    {
      tipo: "colazione",
      voci: [
        ["yogurt", 150],
        ["avena", 40],
        ["banana", 120],
      ],
    },
    {
      tipo: "pranzo",
      voci: [
        ["pasta", 80],
        ["pomodorini", 150],
        ["olio", 10],
        ["parmigiano", 10],
      ],
    },
    { tipo: "spuntino", voci: [["mela", 180]] },
    {
      tipo: "cena",
      voci: [
        ["merluzzo", 200],
        ["zucchine", 200],
        ["olio", 10],
        ["pane", 40],
      ],
    },
  ],
  entroB: [
    {
      tipo: "colazione",
      voci: [
        ["latte", 200],
        ["fette", 30],
        ["marmellata", 15],
      ],
    },
    {
      tipo: "pranzo",
      voci: [
        ["riso", 80],
        ["pollo", 150],
        ["zucchine", 150],
        ["olio", 10],
      ],
    },
    { tipo: "spuntino", voci: [["yogurt", 150]] },
    {
      tipo: "cena",
      voci: [
        ["uova", 120],
        ["insalata", 100],
        ["olio", 10],
        ["pane", 40],
      ],
    },
  ],
  macroOltre: [
    {
      tipo: "colazione",
      voci: [
        ["yogurt", 150],
        ["avena", 40],
      ],
    },
    {
      tipo: "pranzo",
      voci: [
        ["piadina", 110],
        ["prosciutto", 50],
        ["stracchino", 60],
      ],
    },
    { tipo: "spuntino", voci: [["noci", 30]] },
    {
      tipo: "cena",
      voci: [
        ["salmone", 150],
        ["insalata", 100],
        ["olio", 15],
      ],
    },
  ],
  oltre: [
    {
      tipo: "colazione",
      voci: [
        ["latte", 200],
        ["fette", 30],
        ["marmellata", 15],
      ],
    },
    {
      tipo: "pranzo",
      voci: [
        ["lasagne", 350],
        ["pane", 50],
      ],
    },
    { tipo: "spuntino", voci: [["barretta", 50]] },
    {
      tipo: "cena",
      voci: [
        ["pizza", 300],
        ["birra", 330],
      ],
    },
  ],
};

const GIORNI = 35;

/** Template of the day `i` days ago: mostly within, a macro over every few days, over on Saturdays. */
function modelloDelGiorno(data: Date, i: number): PastoDemo[] | null {
  if (i === 11 || i === 23) return null; // a few days without entries
  if (data.getDay() === 6) return giornateDemo.oltre;
  if (i % 5 === 2) return giornateDemo.macroOltre;
  return i % 2 ? giornateDemo.entroA : giornateDemo.entroB;
}

const due = (n: number) => String(n).padStart(2, "0");
const giornoLocale = (d: Date) => `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;

export class ErroreDemo extends Error {}

export async function seedDemo(
  em: EntityManager,
  username: string,
): Promise<{ alimenti: number; giorni: number }> {
  const utente = await em.findOne(Utente, { chiaveUsername: chiaveUsername(username) });
  if (!utente) throw new ErroreDemo(`Utente ${username} non trovato: crealo con pnpm utente:crea`);
  if (await em.count(Pasto, { utente })) {
    throw new ErroreDemo(`${username} ha già un diario: il seed demo serve per un utente nuovo`);
  }

  utente.fabbisogno = 2000;
  utente.quotaCarboidrati = 50;
  utente.quotaGrassi = 30;
  utente.quotaProteine = 20;

  const alimenti = {} as Record<ChiaveAlimento, Alimento>;
  const usi = {} as Record<ChiaveAlimento, UsoAlimento>;
  for (const [chiave, a] of Object.entries(alimentiDemo) as [ChiaveAlimento, AlimentoDemo][]) {
    const alimento = em.create(Alimento, {
      autore: utente,
      nome: a.nome,
      marca: a.marca ?? null,
      barcode: null,
      fonte: "manuale",
      unitaBase: a.unitaBase ?? "g",
      ...a.valori,
      verificato: a.verificato ?? false,
    });
    (a.porzioni ?? []).forEach(([nome, quantita], i) =>
      em.create(Porzione, { alimento, nome, quantita, predefinita: i === 0 }),
    );
    alimenti[chiave] = alimento;
    usi[chiave] = em.create(UsoAlimento, { utente, alimento });
  }

  let giorni = 0;
  const oggi = new Date();
  for (let i = GIORNI - 1; i >= 0; i--) {
    const data = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - i);
    const modello = modelloDelGiorno(data, i);
    if (!modello) continue;
    // Today is half done (breakfast and lunch), so the tester has something to add.
    const pasti =
      i === 0 ? modello.filter((p) => p.tipo === "colazione" || p.tipo === "pranzo") : modello;
    const creatoIl = new Date(data.getFullYear(), data.getMonth(), data.getDate(), 8);
    pasti.forEach((p, ordine) => {
      const pasto = em.create(Pasto, { utente, giorno: giornoLocale(data), tipo: p.tipo, ordine });
      p.voci.forEach(([chiave, quantita], j) => {
        em.create(Voce, {
          pasto,
          alimento: alimenti[chiave],
          quantita,
          creatoIl: new Date(creatoIl.getTime() + ordine * 1000 + j),
        });
        usi[chiave].utilizzi += 1;
        usi[chiave].ultimoUso = creatoIl;
      });
    });
    giorni++;
  }

  await em.flush();
  return { alimenti: Object.keys(alimenti).length, giorni };
}
