<script setup lang="ts">
import type { OrdinePastiPreferiti } from "@calories-diary/shared";

const { elenca } = usePastiPreferiti();

const cerca = ref("");
// Search sent 300 ms after the last keystroke.
const testo = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;
watch(cerca, (valore) => {
  clearTimeout(timer);
  timer = setTimeout(() => (testo.value = valore), 300);
});
onBeforeUnmount(() => clearTimeout(timer));

// Every user's meals are here: the screen opens on the user's own.
const autore = ref<"miei" | "tutti">("miei");
const ordine = ref<OrdinePastiPreferiti>("nome");

const ordinamenti: { label: string; value: OrdinePastiPreferiti }[] = [
  { label: "A-Z", value: "nome" },
  { label: "Z-A", value: "nomeDesc" },
  { label: "Più recenti", value: "inseritiRecenti" },
  { label: "Meno recenti", value: "inseritiLontani" },
];

const { elementi, totale, caricata, pagina, perPagina, desktop, status, error, refresh } =
  useListaPaginata(
    "pasti-preferiti",
    (paginazione) =>
      elenca({
        q: testo.value.trim() || undefined,
        autore: autore.value,
        ordine: ordine.value,
        ...paginazione,
      }),
    [testo, autore, ordine],
  );

const errore = computed(() => (error.value ? normalizzaErrore(error.value) : null));
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-3">
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-2xl font-bold text-highlighted">Pasti preferiti</h1>
      <UButton icon="i-lucide-plus" to="/pasti-preferiti/nuovo">Nuovo</UButton>
    </div>

    <UInput
      v-model="cerca"
      icon="i-lucide-search"
      placeholder="Cerca per nome"
      size="xl"
      class="w-full"
      :loading="status === 'pending'"
    />

    <div class="flex flex-wrap items-center justify-between gap-2">
      <FiltroPastiPreferiti v-model="autore" />
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
          <PastoPreferitoRiga
            v-for="p in elementi"
            :key="p.id"
            :pasto="p"
            :to="`/pasti-preferiti/${p.id}`"
          />
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
      icon="i-lucide-star"
      :title="cerca ? 'Nessun pasto trovato' : 'Ancora nessun pasto preferito'"
      description="Salvane uno dal diario con la stella, o crealo qui."
      :actions="[{ label: 'Nuovo pasto', icon: 'i-lucide-plus', to: '/pasti-preferiti/nuovo' }]"
    />
  </UContainer>
</template>
