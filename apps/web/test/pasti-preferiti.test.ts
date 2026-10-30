import type { Alimento } from "@calories-diary/shared";
import { describe, expect, it } from "vitest";
import {
  conQuantita,
  numeroAlimenti,
  totaliVoci,
  voceDaAlimento,
} from "../app/utils/pasti-preferiti";

const pane = {
  id: "1",
  nome: "Pane",
  marca: null,
  unitaBase: "g",
  archiviato: false,
  valoriPer100: { kcal: 250, proteine: 8, carboidrati: 50, grassi: 1 },
} as Alimento;

describe("voci del form", () => {
  it("calcola i valori della quantità scelta", () => {
    expect(voceDaAlimento(pane, 50).valori).toEqual({
      kcal: 125,
      proteine: 4,
      carboidrati: 25,
      grassi: 0.5,
    });
  });

  it("riscala i valori quando cambia la quantità", () => {
    const voce = conQuantita(voceDaAlimento(pane, 50), 200);
    expect(voce.quantita).toBe(200);
    expect(voce.valori.kcal).toBe(500);
  });

  it("somma i totali", () => {
    const voci = [voceDaAlimento(pane, 100), voceDaAlimento(pane, 20)];
    expect(totaliVoci(voci).kcal).toBe(300);
    expect(totaliVoci([]).kcal).toBe(0);
  });
});

describe("numeroAlimenti", () => {
  it("accorda singolare e plurale", () => {
    expect(numeroAlimenti(1)).toBe("1 alimento");
    expect(numeroAlimenti(3)).toBe("3 alimenti");
  });
});
