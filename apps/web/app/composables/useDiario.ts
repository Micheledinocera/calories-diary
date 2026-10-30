import type {
  AggiuntaPreferito,
  Giornata,
  NuovaVoce,
  NuovoPasto,
  Obiettivi,
  RiepilogoGiorno,
} from "@calories-diary/shared";

/** Calls of the diary (`/diario`) and of the user's goals (`/obiettivi`). Every write returns the day. */
export function useDiario() {
  const { api } = useApi();
  // No retry on writes: a request timed out on the server side could be applied twice.
  const scrivi = { retry: 0 } as const;

  return {
    giornata: (giorno: string) => api<Giornata>(`/diario/${giorno}`),
    riepiloghi: (da: string, a: string) => api<RiepilogoGiorno[]>("/diario", { query: { da, a } }),
    aggiungiPasto: (giorno: string, dati: NuovoPasto) =>
      api<Giornata>(`/diario/${giorno}/pasti`, { method: "POST", body: dati, ...scrivi }),
    eliminaPasto: (id: string) =>
      api<Giornata>(`/diario/pasti/${id}`, { method: "DELETE", ...scrivi }),
    aggiungiPreferito: (giorno: string, dati: AggiuntaPreferito) =>
      api<Giornata>(`/diario/${giorno}/preferiti`, { method: "POST", body: dati, ...scrivi }),
    salvaPreferito: (pastoId: string, nome: string) =>
      api<Giornata>(`/diario/pasti/${pastoId}/preferito`, {
        method: "POST",
        body: { nome },
        ...scrivi,
      }),
    togliPreferito: (pastoId: string) =>
      api<Giornata>(`/diario/pasti/${pastoId}/preferito`, { method: "DELETE", ...scrivi }),
    copiaGiorno: (giorno: string, da: string) =>
      api<Giornata>(`/diario/${giorno}/copia`, { method: "POST", body: { da }, ...scrivi }),
    ordina: (giorno: string, pasti: string[]) =>
      api<Giornata>(`/diario/${giorno}/ordine`, { method: "PUT", body: { pasti }, ...scrivi }),
    aggiungiVoce: (pastoId: string, voce: NuovaVoce) =>
      api<Giornata>(`/diario/pasti/${pastoId}/voci`, { method: "POST", body: voce, ...scrivi }),
    modificaVoce: (id: string, quantita: number) =>
      api<Giornata>(`/diario/voci/${id}`, { method: "PATCH", body: { quantita }, ...scrivi }),
    eliminaVoce: (id: string) =>
      api<Giornata>(`/diario/voci/${id}`, { method: "DELETE", ...scrivi }),
    obiettivi: () => api<Obiettivi>("/obiettivi"),
    salvaObiettivi: (dati: Obiettivi) =>
      api<Obiettivi>("/obiettivi", { method: "PUT", body: dati, ...scrivi }),
  };
}
