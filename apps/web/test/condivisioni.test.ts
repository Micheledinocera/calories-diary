import type { GiornoCondiviso } from "@calories-diary/shared";
import { describe, expect, it } from "vitest";
import { giornoIniziale, periodoCondiviso, testoScadenza } from "../app/utils/condivisioni";

const totali = { kcal: 100, proteine: 1, carboidrati: 1, grassi: 1 };
const vuoto = (giorno: string): GiornoCondiviso => ({ giorno, pasti: [], totali });
const pieno = (giorno: string): GiornoCondiviso => ({
  ...vuoto(giorno),
  pasti: [{ tipo: "pranzo", voci: [], totali }],
});

describe("giornoIniziale", () => {
  it("salta i giorni vuoti", () => {
    const giorni = [vuoto("2026-03-02"), pieno("2026-03-03"), pieno("2026-03-04")];
    expect(giornoIniziale(giorni)?.giorno).toBe("2026-03-03");
  });

  it("apre il primo giorno se sono tutti vuoti", () => {
    expect(giornoIniziale([vuoto("2026-03-02"), vuoto("2026-03-03")])?.giorno).toBe("2026-03-02");
  });
});

describe("periodoCondiviso", () => {
  it("riduce un solo giorno a una data", () => {
    expect(periodoCondiviso("2026-03-02", "2026-03-02")).toBe("2 mar");
  });

  it("mostra l'intervallo di più giorni", () => {
    expect(periodoCondiviso("2026-03-02", "2026-03-08")).toBe("2 mar – 8 mar");
  });
});

describe("testoScadenza", () => {
  it("dice quando un link non scade", () => {
    expect(testoScadenza(null)).toBe("Non scade");
  });

  it("riporta la data di scadenza", () => {
    expect(testoScadenza("2026-03-02T12:00:00.000Z")).toContain("marzo 2026");
  });
});
