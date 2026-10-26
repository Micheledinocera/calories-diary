import { describe, expect, it } from "vitest";
import { normalizzaErrore } from "../app/utils/errori-api";

describe("normalizzaErrore", () => {
  it("usa il body di errore dell'API", () => {
    const err = {
      statusCode: 404,
      data: { errore: { codice: "NON_TROVATO", messaggio: "Pasto non trovato" } },
    };
    expect(normalizzaErrore(err)).toEqual({
      codice: "NON_TROVATO",
      messaggio: "Pasto non trovato",
      status: 404,
    });
  });

  it("riconosce il timeout", () => {
    const err = { cause: { name: "TimeoutError" } };
    expect(normalizzaErrore(err).codice).toBe("TIMEOUT");
  });

  it("senza risposta è un errore di rete", () => {
    expect(normalizzaErrore(new TypeError("fetch failed")).codice).toBe("RETE");
  });
});
