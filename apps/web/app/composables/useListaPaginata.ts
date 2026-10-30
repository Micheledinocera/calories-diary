import type { Pagina } from "@calories-diary/shared";
import { useMediaQuery } from "@vueuse/core";
import type { WatchSource } from "vue";

const PER_PAGINA = 20;

/**
 * A list loaded a page at a time: on desktop each page replaces the previous one, on mobile it is
 * added to the rows already shown (infinite scroll). Filters changing start again from the first.
 */
export function useListaPaginata<T extends { id: string }>(
  chiave: string,
  carica: (paginazione: { pagina: number; limite: number }) => Promise<Pagina<T>>,
  filtri: WatchSource[],
) {
  const desktop = useMediaQuery("(min-width: 640px)");
  const pagina = ref(1);

  const { data, status, error, refresh } = useAsyncData(
    chiave,
    () => carica({ pagina: pagina.value, limite: PER_PAGINA }),
    { watch: [pagina] },
  );

  const elementi = shallowRef<T[]>([]);
  // A food added meanwhile shifts the next page: a row can come twice.
  watch(
    data,
    (nuova) => {
      if (!nuova) return;
      const presenti = desktop.value || nuova.pagina === 1 ? [] : elementi.value;
      const visti = new Set(presenti.map((e) => e.id));
      elementi.value = [...presenti, ...nuova.elementi.filter((e) => !visti.has(e.id))];
    },
    { immediate: true },
  );

  watch(filtri, () => {
    if (pagina.value === 1) refresh();
    else pagina.value = 1;
  });
  watch(desktop, () => (pagina.value = 1));

  return {
    elementi,
    totale: computed(() => data.value?.totale ?? 0),
    caricata: computed(() => data.value?.pagina ?? 1),
    pagina,
    perPagina: PER_PAGINA,
    desktop,
    status,
    error,
    refresh,
  };
}
