/** Error with an HTTP status and a stable code, turned into a JSON response by the error handler. */
export class ErroreApp extends Error {
  constructor(
    readonly status: number,
    readonly codice: string,
    messaggio: string,
    readonly dettagli?: unknown,
  ) {
    super(messaggio);
    this.name = "ErroreApp";
  }
}

export const nonTrovato = (messaggio = "Risorsa non trovata") =>
  new ErroreApp(404, "NON_TROVATO", messaggio);
