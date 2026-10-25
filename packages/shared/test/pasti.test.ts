import { describe, expect, it } from "vitest";
import { pastoSchema } from "../src/pasti.js";

describe("pastoSchema", () => {
  it("accetta un pasto valido", () => {
    const pasto = { id: "0b0f6f8e-6a4b-4c1e-9d55-3f1e2a7b9c10", nome: "Colazione", ordine: 0 };
    expect(pastoSchema.parse(pasto)).toEqual(pasto);
  });

  it("rifiuta un nome vuoto", () => {
    expect(
      pastoSchema.safeParse({ id: "0b0f6f8e-6a4b-4c1e-9d55-3f1e2a7b9c10", nome: "", ordine: 0 })
        .success,
    ).toBe(false);
  });
});
