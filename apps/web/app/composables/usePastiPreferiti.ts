import type {
  FiltriPastiPreferiti,
  NuovoPastoPreferito,
  Pagina,
  PastoPreferito,
} from "@calories-diary/shared";

/** Calls of the favorite meals (`/pasti-preferiti`): shared among users, only the author writes. */
export function usePastiPreferiti() {
  const { api } = useApi();
  // No retry on writes: a request timed out on the server side could be applied twice.
  const scrivi = { retry: 0 } as const;

  return {
    elenca: (filtri: FiltriPastiPreferiti = {}) =>
      api<Pagina<PastoPreferito>>("/pasti-preferiti", { query: filtri }),
    trova: (id: string) => api<PastoPreferito>(`/pasti-preferiti/${id}`),
    crea: (dati: NuovoPastoPreferito) =>
      api<PastoPreferito>("/pasti-preferiti", { method: "POST", body: dati, ...scrivi }),
    modifica: (id: string, dati: NuovoPastoPreferito) =>
      api<PastoPreferito>(`/pasti-preferiti/${id}`, { method: "PUT", body: dati, ...scrivi }),
    elimina: async (id: string) => {
      await api<unknown>(`/pasti-preferiti/${id}`, { method: "DELETE", ...scrivi });
    },
  };
}
