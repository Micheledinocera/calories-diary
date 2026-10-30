<script setup lang="ts">
import type { OrdineAlimenti } from "@calories-diary/shared";

const { elenca } = useAlimenti();

const cerca = ref("");
// Search sent 300 ms after the last keystroke.
const testo = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;
watch(cerca, (valore) => {
  clearTimeout(timer);
  timer = setTimeout(() => (testo.value = valore), 300);
});
onBeforeUnmount(() => clearTimeout(timer));
const archiviati = ref(false);
const ordine = ref<OrdineAlimenti>("recenti");

const ordinamenti: { label: string; value: OrdineAlimenti }[] = [
  { label: "Recenti", value: "recenti" },
  { label: "Più usati", value: "uso" },
  { label: "A-Z", value: "nome" },
  { label: "Z-A", value: "nomeDesc" },
];

const { elementi, totale, caricata, pagina, perPagina, desktop, status, error, refresh } =
  useListaPaginata(
    "alimenti",
    (paginazione) =>
      elenca({
        q: testo.value.trim() || undefined,
        archiviati: archiviati.value,
        ordine: ordine.value,
        ...paginazione,
      }),
    [testo, archiviati, ordine],
  );

// A scanned code opens the food if it is already saved, otherwise a new food with the code.
const scansione = ref(false);
const toast = useToast();
async function letto(codice: string) {
  try {
    const { elementi: trovati } = await elenca({ q: codice, archiviati: archiviati.value });
    const alimento = trovati.find((a) => a.barcode === codice);
    await navigateTo(
      alimento
        ? `/alimenti/${alimento.id}`
        : { path: "/alimenti/nuovo", query: { barcode: codice } },
    );
  } catch (err) {
    const errore = err as ErroreNormalizzato;
    toast.add({ title: errore.messaggio, color: "error", icon: "i-lucide-circle-alert" });
  }
}

const errore = computed(() => (error.value ? normalizzaErrore(error.value) : null));
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-3">
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-2xl font-bold text-highlighted">Alimenti</h1>
      <UButton icon="i-lucide-plus" to="/alimenti/nuovo">Nuovo</UButton>
    </div>

    <UInput
      v-model="cerca"
      icon="i-lucide-search"
      placeholder="Cerca per nome, marca o codice"
      size="xl"
      class="w-full"
      :loading="status === 'pending'"
      :ui="{ trailing: 'pe-1' }"
    >
      <template #trailing>
        <UButton
          icon="i-lucide-scan-barcode"
          variant="ghost"
          aria-label="Scansiona il codice a barre"
          @click="scansione = true"
        />
      </template>
    </UInput>
    <ScansioneBarcode v-model:open="scansione" @letto="letto" />

    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex gap-2" role="group" aria-label="Filtro">
        <UButton
          v-for="f in [
            { valore: false, etichetta: 'Attivi' },
            { valore: true, etichetta: 'Archiviati' },
          ]"
          :key="f.etichetta"
          :variant="archiviati === f.valore ? 'soft' : 'outline'"
          :color="archiviati === f.valore ? 'primary' : 'neutral'"
          class="rounded-full"
          :aria-pressed="archiviati === f.valore"
          @click="archiviati = f.valore"
        >
          {{ f.etichetta }}
        </UButton>
      </div>
      <SelettoreOrdine v-model="ordine" :opzioni="ordinamenti" />
    </div>

    <UAlert
      v-if="errore"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="errore.messaggio"
      :actions="[{ label: 'Riprova', onClick: () => refresh() }]"
    />

    <div v-else-if="status === 'pending' && !elementi.length" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-14 w-full rounded-lg" />
    </div>

    <template v-else-if="elementi.length">
      <UCard :ui="{ body: 'py-0 sm:py-0 sm:px-4' }">
        <div class="divide-y divide-default">
          <AlimentoRiga v-for="a in elementi" :key="a.id" :alimento="a" :to="`/alimenti/${a.id}`" />
        </div>
      </UCard>
      <PaginazioneLista
        v-model:pagina="pagina"
        :caricata="caricata"
        :totale="totale"
        :per-pagina="perPagina"
        :desktop="desktop"
        :in-corso="status === 'pending'"
      />
    </template>

    <UEmpty
      v-else
      icon="i-lucide-apple"
      :title="cerca || archiviati ? 'Nessun alimento trovato' : 'Ancora nessun alimento'"
      description="Aggiungilo a mano o dal codice a barre."
      :actions="[{ label: 'Nuovo alimento', icon: 'i-lucide-plus', to: '/alimenti/nuovo' }]"
    />
  </UContainer>
</template>
