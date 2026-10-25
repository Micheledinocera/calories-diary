import { describe, expect, it } from "vitest";
import { codiceLetto, messaggioErroreFotocamera } from "../app/utils/barcode";

describe("codiceLetto", () => {
  it("returns the first value made only of digits", () => {
    expect(codiceLetto([{ rawValue: "abc" }, { rawValue: " 8076809513753 " }])).toBe(
      "8076809513753",
    );
  });

  it("returns null when nothing is valid", () => {
    expect(codiceLetto([])).toBeNull();
    expect(codiceLetto([{ rawValue: "12-34" }])).toBeNull();
  });
});

describe("messaggioErroreFotocamera", () => {
  it("maps the getUserMedia errors", () => {
    expect(messaggioErroreFotocamera({ name: "NotAllowedError" })).toMatch(/Permesso/);
    expect(messaggioErroreFotocamera({ name: "NotFoundError" })).toMatch(/Nessuna fotocamera/);
    expect(messaggioErroreFotocamera(new Error("x"))).toBe("Impossibile avviare la fotocamera.");
  });
});
