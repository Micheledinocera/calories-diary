import { describe, expect, it } from "vitest";
import { caricaEnv } from "../src/config/env.js";
import { creaConfigOrm } from "../src/db/mikro-orm.config.js";

const env = caricaEnv();
const neon = "postgresql://utente:segreta@ep-x.eu-central-1.aws.neon.tech/neondb";

describe("config MikroORM", () => {
  it("attiva TLS quando la connessione chiede sslmode=require", () => {
    const config = creaConfigOrm({
      ...env,
      DATABASE_URL: `${neon}?sslmode=require&channel_binding=require`,
    });
    expect(config.driverOptions).toEqual({ ssl: true });
  });

  it("usa la connessione diretta per le migrazioni", () => {
    const config = creaConfigOrm(
      { ...env, DATABASE_URL: neon, DATABASE_URL_DIRECT: `${neon}?sslmode=verify-full` },
      { diretta: true },
    );
    expect(config.clientUrl).toBe(`${neon}?sslmode=verify-full`);
    expect(config.driverOptions).toEqual({ ssl: true });
  });

  it("lascia la connessione in chiaro senza sslmode (Docker locale)", () => {
    const config = creaConfigOrm({
      ...env,
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/db",
    });
    expect(config.driverOptions).toEqual({});
  });
});
