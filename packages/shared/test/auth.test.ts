import { describe, expect, it } from "vitest";
import { credenzialiSchema, usernameSchema } from "../src/auth.js";
import { modificaUtenteSchema } from "../src/utenti.js";

describe("credenzialiSchema", () => {
  it("toglie gli spazi dallo username, lasciando maiuscole e minuscole", () => {
    expect(credenzialiSchema.parse({ username: " Io@Esempio.IT ", password: "x" }).username).toBe(
      "Io@Esempio.IT",
    );
  });

  it("rifiuta username e password vuoti", () => {
    expect(credenzialiSchema.safeParse({ username: " ", password: "x" }).success).toBe(false);
    expect(credenzialiSchema.safeParse({ username: "io", password: "" }).success).toBe(false);
  });
});

describe("usernameSchema", () => {
  it("accetta lettere, cifre e . _ - @, così come sono scritte", () => {
    expect(usernameSchema.parse(" Mario.Rossi_1 ")).toBe("Mario.Rossi_1");
    expect(usernameSchema.parse("io@esempio.it")).toBe("io@esempio.it");
  });

  it("rifiuta username troppo corti, troppo lunghi o con altri caratteri", () => {
    for (const username of ["ab", "a".repeat(33), "con spazio", "àccento"]) {
      expect(usernameSchema.safeParse(username).success).toBe(false);
    }
  });
});

describe("modificaUtenteSchema", () => {
  it("richiede almeno username o password", () => {
    expect(modificaUtenteSchema.safeParse({}).success).toBe(false);
    expect(modificaUtenteSchema.safeParse({ password: "password-lunga" }).success).toBe(true);
  });
});
