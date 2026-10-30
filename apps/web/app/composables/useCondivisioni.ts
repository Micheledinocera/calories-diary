import type { Condivisione, NuovaCondivisione, VistaCondivisa } from "@calories-diary/shared";

/** Public links to a copy of some days (`/condivisioni`, `/pubblico`). */
export function useCondivisioni() {
  const { api } = useApi();
  const toast = useToast();

  return {
    elenca: () => api<Condivisione[]>("/condivisioni"),
    crea: (dati: NuovaCondivisione) =>
      api<Condivisione>("/condivisioni", { method: "POST", body: dati, retry: 0 }),
    revoca: async (id: string) => {
      await api<unknown>(`/condivisioni/${id}`, { method: "DELETE", retry: 0 });
    },
    vista: (token: string) => api<VistaCondivisa>(`/pubblico/${token}`),

    async copiaLink(token: string) {
      try {
        await navigator.clipboard.writeText(linkCondivisione(token));
        toast.add({ title: "Link copiato", color: "success", icon: "i-lucide-check" });
      } catch {
        toast.add({ title: "Copia non riuscita", color: "error", icon: "i-lucide-circle-alert" });
      }
    },
  };
}
