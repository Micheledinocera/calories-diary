<script setup lang="ts">
import type { Giornata, NuovaVoce, Pasto } from "@calories-diary/shared";
import { insertNodeAt, removeNode, useSortable } from "@vueuse/integrations/useSortable";

const props = defineProps<{ giorno: string; modificabile: boolean }>();

const diario = useDiario();
const toast = useToast();

const { data, error, refresh } = useAsyncData(
  () => `giornata-${props.giorno}`,
  () => diario.giornata(props.giorno),
);
// One value per user, applied to every day (no history yet).
const { data: obiettivi } = useAsyncData("obiettivi", () => diario.obiettivi());

const pasti = computed(() => data.value?.pasti ?? []);
const totali = computed(() => data.value?.totali);

// Only over the need: the meal that weighed most is pointed out in the summary and on its card.
const pesante = computed(() => {
  const o = obiettivi.value;
  if (!o || !totali.value || statoGiornata(totali.value, o)?.tipo !== "oltre") return null;
  return pastoPiuPesante(pasti.value);
});

const inCorso = ref(false);

/** Runs a write: every diary write answers with the whole updated day. */
async function esegui(azione: () => Promise<Giornata>) {
  inCorso.value = true;
  try {
    data.value = await azione();
  } catch (err) {
    const errore = err as ErroreNormalizzato;
    toast.add({ title: errore.messaggio, color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    inCorso.value = false;
  }
}

// Main meals are saved with the first write of the day (they may still have no id); snacks
// always have one.
function aggiungi(pasto: Pasto, voci: NuovaVoce[]) {
  return esegui(() =>
    pasto.tipo === "spuntino" && pasto.id
      ? diario.aggiungiVoce(pasto.id, voci[0]!)
      : diario.aggiungiPasto(props.giorno, { tipo: pasto.tipo, voci }),
  );
}

const aggiungiSpuntino = () =>
  esegui(() => diario.aggiungiPasto(props.giorno, { tipo: "spuntino" }));

function eliminaSpuntino(pasto: Pasto) {
  if (pasto.voci.length && !confirm("Eliminare lo spuntino e i suoi alimenti?")) return;
  return esegui(() => diario.eliminaPasto(pasto.id!));
}

// Snacks are dragged by their handle and can go anywhere; main meals stay in order.
const lista = useTemplateRef<HTMLElement>("lista");
// No list to move: onUpdate is overridden and the order comes back from the API.
const { option } = useSortable(lista, [], {
  handle: ".maniglia",
  animation: 150,
  watchElement: true,
  disabled: !props.modificabile,
  onUpdate: ({ item, from, oldIndex, newIndex }) => {
    // Vue owns the DOM: put the node back and let the new order come from the API.
    removeNode(item);
    insertNodeAt(from, item, oldIndex!);
    const ordine = nuovoOrdine(pasti.value, oldIndex!, newIndex!);
    if (!ordine) {
      toast.add({ title: "Colazione, pranzo e cena restano in ordine", color: "warning" });
      return;
    }
    esegui(() => diario.ordina(props.giorno, ordine));
  },
});
watch(
  () => props.modificabile,
  (m) => option("disabled", !m),
);

const erroreCaricamento = computed(() => (error.value ? normalizzaErrore(error.value) : null));
</script>

<template>
  <div class="space-y-4">
    <UAlert
      v-if="erroreCaricamento"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="erroreCaricamento.messaggio"
      :actions="[{ label: 'Riprova', onClick: () => refresh() }]"
    />

    <template v-else-if="data && totali">
      <RiepilogoGiornata :totali="totali" :obiettivi="obiettivi ?? null" :pesante="pesante" />

      <div ref="lista" class="space-y-3">
        <DiarioPasto
          v-for="pasto in pasti"
          :id="pasto.id ? `pasto-${pasto.id}` : undefined"
          :key="pasto.id ?? pasto.tipo"
          :pasto="pasto"
          :modificabile="modificabile"
          :in-corso="inCorso"
          :piu-pesante="!!pesante && pesante.id === pasto.id"
          :totali-giorno="totali"
          :fabbisogno="obiettivi?.fabbisogno ?? null"
          @aggiungi="aggiungi(pasto, $event)"
          @modifica-voce="(id, q) => esegui(() => diario.modificaVoce(id, q))"
          @elimina-voce="(id) => esegui(() => diario.eliminaVoce(id))"
          @elimina="eliminaSpuntino(pasto)"
        />
      </div>

      <UButton
        v-if="modificabile"
        icon="i-lucide-plus"
        variant="soft"
        size="lg"
        block
        :loading="inCorso"
        @click="aggiungiSpuntino"
      >
        Aggiungi spuntino
      </UButton>
    </template>

    <div v-else class="space-y-3">
      <USkeleton class="h-52 w-full rounded-lg" />
      <USkeleton v-for="i in 3" :key="i" class="h-24 w-full" />
    </div>
  </div>
</template>
