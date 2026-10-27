import { describe, expect, it } from "vitest";
import { daRinnovare, leggiSessioneSalvata } from "../app/utils/sessione";

const GIORNO_MS = 24 * 60 * 60 * 1000;
const ora = Date.parse("2026-10-25T12:00:00Z");

const sessione = (scadeTraGiorni: number) => ({
  token: "t",
  scadeIl: new Date(ora + scadeTraGiorni * GIORNO_MS).toISOString(),
  utente: { id: "0b0f6f8e-6a4b-4c1e-9d55-3f1e2a7b9c10", username: "io", ruolo: "utente" },
});

describe("leggiSessioneSalvata", () => {
  it("legge una sessione valida", () => {
    expect(leggiSessioneSalvata(JSON.stringify(sessione(7)))).toEqual(sessione(7));
  });

  it("restituisce null se manca, non è JSON o non è una sessione", () => {
    expect(leggiSessioneSalvata(null)).toBeNull();
    expect(leggiSessioneSalvata("{non json")).toBeNull();
    expect(leggiSessioneSalvata(JSON.stringify({ token: "t" }))).toBeNull();
  });

  it("scarta le sessioni salvate prima degli username: si rifà il login", () => {
    const vecchia = {
      ...sessione(7),
      utente: { id: sessione(7).utente.id, email: "io@esempio.it" },
    };
    expect(leggiSessioneSalvata(JSON.stringify(vecchia))).toBeNull();
  });
});

describe("daRinnovare", () => {
  it("non rinnova un token appena emesso", () => {
    expect(daRinnovare(sessione(7), ora)).toBe(false);
  });

  it("rinnova un token di più di un giorno, anche se scaduto", () => {
    expect(daRinnovare(sessione(5.9), ora)).toBe(true);
    expect(daRinnovare(sessione(-1), ora)).toBe(true);
  });
});
