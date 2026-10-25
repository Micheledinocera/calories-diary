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
const ripartizione = computed(() => (totali.value ? ripartizioneGiorno(totali.value) : null));

const macro = [
  { chiave: "carboidrati", etichetta: "Carboidrati" },
  { chiave: "grassi", etichetta: "Grassi" },
  { chiave: "proteine", etichetta: "Proteine" },
] as const;

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
      <UCard>
        <div class="space-y-3">
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-2xl font-bold"
              >{{ formattaValore(Math.round(totali.kcal)) }} kcal</span
            >
            <span v-if="obiettivi?.fabbisogno" class="text-sm text-muted">
              di {{ formattaValore(obiettivi.fabbisogno) }} ·
              <template v-if="totali.kcal <= obiettivi.fabbisogno">
                ne restano {{ formattaValore(Math.round(obiettivi.fabbisogno - totali.kcal)) }}
              </template>
              <span v-else class="text-warning">
                {{ formattaValore(Math.round(totali.kcal - obiettivi.fabbisogno)) }} in più
              </span>
            </span>
            <NuxtLink v-else to="/profilo" class="text-sm text-primary"
              >Imposta il fabbisogno</NuxtLink
            >
          </div>
          <UProgress
            v-if="obiettivi?.fabbisogno"
            :model-value="Math.min(totali.kcal, obiettivi.fabbisogno)"
            :max="obiettivi.fabbisogno"
            :color="totali.kcal > obiettivi.fabbisogno ? 'warning' : 'primary'"
          />
          <div class="grid grid-cols-3 gap-2 text-center">
            <div v-for="m in macro" :key="m.chiave">
              <p class="text-xs text-muted">{{ m.etichetta }}</p>
              <p class="font-semibold">{{ formattaValore(totali[m.chiave]) }} g</p>
              <p class="text-xs text-muted">
                {{ ripartizione ? `${Math.round(ripartizione[m.chiave])}%` : "–" }}
                <template v-if="obiettivi">/ {{ obiettivi.ripartizione[m.chiave] }}%</template>
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <div ref="lista" class="space-y-3">
        <DiarioPasto
          v-for="pasto in pasti"
          :key="pasto.id ?? pasto.tipo"
          :pasto="pasto"
          :modificabile="modificabile"
          :in-corso="inCorso"
          @aggiungi="aggiungi(pasto, $event)"
          @modifica-voce="(id, q) => esegui(() => diario.modificaVoce(id, q))"
          @elimina-voce="(id) => esegui(() => diario.eliminaVoce(id))"
          @elimina="eliminaSpuntino(pasto)"
        />
      </div>

      <UButton
        v-if="modificabile"
        icon="i-lucide-plus"
        variant="subtle"
        color="neutral"
        block
        :loading="inCorso"
        @click="aggiungiSpuntino"
      >
        Aggiungi spuntino
      </UButton>
    </template>

    <div v-else class="space-y-3">
      <USkeleton class="h-28 w-full" />
      <USkeleton v-for="i in 3" :key="i" class="h-24 w-full" />
    </div>
  </div>
</template>
