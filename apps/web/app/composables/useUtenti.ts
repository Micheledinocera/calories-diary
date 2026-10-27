import type { ModificaUtente, NuovoUtente, Utente } from "@calories-diary/shared";

/** User management calls (`/utenti`), admin only. */
export function useUtenti() {
  const { api } = useApi();
  // No retry on writes: a request timed out on the server side could be applied twice.
  const scrivi = { retry: 0 } as const;

  return {
    elenca: () => api<Utente[]>("/utenti"),
    crea: (dati: NuovoUtente) => api<Utente>("/utenti", { method: "POST", body: dati, ...scrivi }),
    modifica: (id: string, dati: ModificaUtente) =>
      api<Utente>(`/utenti/${id}`, { method: "PATCH", body: dati, ...scrivi }),
    elimina: async (id: string) => {
      await api<unknown>(`/utenti/${id}`, { method: "DELETE", ...scrivi });
    },
  };
}
