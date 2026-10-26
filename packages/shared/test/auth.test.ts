import { describe, expect, it } from "vitest";
import { credenzialiSchema } from "../src/auth.js";

describe("credenzialiSchema", () => {
  it("normalizza l'email", () => {
    expect(credenzialiSchema.parse({ email: " Io@Esempio.IT ", password: "x" }).email).toBe(
      "io@esempio.it",
    );
  });

  it("rifiuta un'email non valida e una password vuota", () => {
    expect(credenzialiSchema.safeParse({ email: "io", password: "x" }).success).toBe(false);
    expect(credenzialiSchema.safeParse({ email: "io@esempio.it", password: "" }).success).toBe(
      false,
    );
  });
});
