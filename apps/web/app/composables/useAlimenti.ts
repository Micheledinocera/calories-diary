import type {
  Alimento,
  FiltriAlimenti,
  LookupBarcode,
  ModificaAlimento,
  NuovoAlimento,
} from "@calories-diary/shared";

/** Calls of the user's foods (`/alimenti`) and of the barcode lookup in the shared catalog. */
export function useAlimenti() {
  const { api } = useApi();
  // No retry on writes: a request timed out on the server side could be applied twice.
  const scrivi = { retry: 0 } as const;

  return {
    elenca: (filtri: FiltriAlimenti = {}) => api<Alimento[]>("/alimenti", { query: filtri }),
    trova: (id: string) => api<Alimento>(`/alimenti/${id}`),
    crea: (dati: NuovoAlimento) =>
      api<Alimento>("/alimenti", { method: "POST", body: dati, ...scrivi }),
    modifica: (id: string, dati: ModificaAlimento) =>
      api<Alimento>(`/alimenti/${id}`, { method: "PATCH", body: dati, ...scrivi }),
    elimina: async (id: string) => {
      await api<unknown>(`/alimenti/${id}`, { method: "DELETE", ...scrivi });
    },
    cercaBarcode: (codice: string) => api<LookupBarcode>(`/catalogo/barcode/${codice}`),
  };
}
