import { describe, expect, it } from "vitest";
import { intervalloGiorniSchema, nuovoPastoSchema, ordinePastiSchema } from "../src/diario.js";
import { obiettiviSchema } from "../src/obiettivi.js";

const id = "0b0f6f8e-6a4b-4c1e-9d55-3f1e2a7b9c10";

describe("nuovoPastoSchema", () => {
  it("accetta un pasto senza voci", () => {
    expect(nuovoPastoSchema.parse({ tipo: "spuntino" })).toEqual({ tipo: "spuntino", voci: [] });
  });

  it("rifiuta un tipo sconosciuto o una quantità non positiva", () => {
    expect(nuovoPastoSchema.safeParse({ tipo: "merenda" }).success).toBe(false);
    expect(
      nuovoPastoSchema.safeParse({ tipo: "pranzo", voci: [{ alimento: id, quantita: 0 }] }).success,
    ).toBe(false);
  });
});

describe("intervalloGiorniSchema", () => {
  it("accetta un mese e rifiuta un intervallo rovesciato o più lungo di un anno", () => {
    expect(intervalloGiorniSchema.safeParse({ da: "2026-10-01", a: "2026-10-31" }).success).toBe(
      true,
    );
    expect(intervalloGiorniSchema.safeParse({ da: "2026-10-31", a: "2026-10-01" }).success).toBe(
      false,
    );
    expect(intervalloGiorniSchema.safeParse({ da: "2025-01-01", a: "2026-10-01" }).success).toBe(
      false,
    );
  });
});

describe("ordinePastiSchema", () => {
  it("rifiuta i pasti duplicati", () => {
    expect(ordinePastiSchema.safeParse({ pasti: [id, id] }).success).toBe(false);
  });
});

describe("obiettiviSchema", () => {
  it("richiede una ripartizione con somma 100", () => {
    const ripartizione = { carboidrati: 50, grassi: 30, proteine: 20 };
    expect(obiettiviSchema.safeParse({ fabbisogno: 2000, ripartizione }).success).toBe(true);
    expect(obiettiviSchema.safeParse({ fabbisogno: null, ripartizione }).success).toBe(true);
    expect(
      obiettiviSchema.safeParse({ fabbisogno: 2000, ripartizione: { ...ripartizione, grassi: 40 } })
        .success,
    ).toBe(false);
  });
});
