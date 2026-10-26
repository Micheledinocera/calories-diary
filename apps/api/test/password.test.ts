import { describe, expect, it } from "vitest";
import { hashPassword, verificaPassword } from "../src/lib/password.js";

describe("password", () => {
  it("verifica la password giusta e rifiuta quella sbagliata", async () => {
    const hash = await hashPassword("segreta-e-lunga");
    expect(hash).toMatch(/^scrypt\$131072\$8\$1\$/);
    expect(await verificaPassword("segreta-e-lunga", hash)).toBe(true);
    expect(await verificaPassword("sbagliata", hash)).toBe(false);
  });

  it("rifiuta un hash in formato sconosciuto", async () => {
    expect(await verificaPassword("x", "md5$abc")).toBe(false);
  });
});
