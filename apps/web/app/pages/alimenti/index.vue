<script setup lang="ts">
import type { Alimento } from "@calories-diary/shared";

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

// Without a search: "Recenti" and "Più usati" (only foods already used in the diary), then all.
const { data, status, error, refresh } = useAsyncData(
  "alimenti",
  async () => {
    const q = testo.value.trim() || undefined;
    if (q || archiviati.value) {
      return { tutti: await elenca({ q, archiviati: archiviati.value, ordine: "nome" }) };
    }
    const [recenti, usati, tutti] = await Promise.all([
      elenca({ ordine: "recenti", limite: 5 }),
      elenca({ ordine: "uso", limite: 5 }),
      elenca({ ordine: "nome" }),
    ]);
    return { recenti, piuUsati: usati.filter((a) => a.utilizzi > 0), tutti };
  },
  { watch: [testo, archiviati] },
);

const sezioni = computed(() => {
  const d = data.value;
  if (!d) return [];
  return [
    { titolo: "Recenti", alimenti: d.recenti ?? [] },
    { titolo: "Più usati", alimenti: d.piuUsati ?? [] },
    { titolo: archiviati.value ? "Archiviati" : "Tutti", alimenti: d.tutti },
  ].filter((s): s is { titolo: string; alimenti: Alimento[] } => s.alimenti.length > 0);
});

// A scanned code opens the food if it is already saved, otherwise a new food with the code.
const scansione = ref(false);
const toast = useToast();
async function letto(codice: string) {
  try {
    const alimento = (await elenca({ q: codice, archiviati: archiviati.value })).find(
      (a) => a.barcode === codice,
    );
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

    <UAlert
      v-if="errore"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="errore.messaggio"
      :actions="[{ label: 'Riprova', onClick: () => refresh() }]"
    />

    <div v-else-if="status === 'pending' && !data" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-14 w-full rounded-lg" />
    </div>

    <template v-else>
      <section v-for="sezione in sezioni" :key="sezione.titolo" class="space-y-2 pt-2">
        <h2 class="text-xs font-semibold tracking-wide uppercase text-muted">
          {{ sezione.titolo }}
        </h2>
        <UCard :ui="{ body: 'py-0 sm:py-0 sm:px-4' }">
          <div class="divide-y divide-default">
            <AlimentoRiga
              v-for="a in sezione.alimenti"
              :key="a.id"
              :alimento="a"
              :to="`/alimenti/${a.id}`"
            />
          </div>
        </UCard>
      </section>

      <UEmpty
        v-if="!sezioni.length"
        icon="i-lucide-apple"
        :title="cerca || archiviati ? 'Nessun alimento trovato' : 'Ancora nessun alimento'"
        description="Aggiungilo a mano o dal codice a barre."
        :actions="[{ label: 'Nuovo alimento', icon: 'i-lucide-plus', to: '/alimenti/nuovo' }]"
      />
    </template>
  </UContainer>
</template>
