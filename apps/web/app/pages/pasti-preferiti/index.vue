<script setup lang="ts">
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

const { data, status, error, refresh } = useAsyncData(
  "pasti-preferiti",
  () => elenca({ q: testo.value.trim() || undefined, autore: autore.value }),
  { watch: [testo, autore] },
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

    <FiltroPastiPreferiti v-model="autore" />

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

    <UCard v-else-if="data?.length" :ui="{ body: 'py-0 sm:py-0 sm:px-4' }">
      <div class="divide-y divide-default">
        <PastoPreferitoRiga
          v-for="p in data"
          :key="p.id"
          :pasto="p"
          :to="`/pasti-preferiti/${p.id}`"
        />
      </div>
    </UCard>

    <UEmpty
      v-else
      icon="i-lucide-star"
      :title="cerca ? 'Nessun pasto trovato' : 'Ancora nessun pasto preferito'"
      description="Salvane uno dal diario con la stella, o crealo qui."
      :actions="[{ label: 'Nuovo pasto', icon: 'i-lucide-plus', to: '/pasti-preferiti/nuovo' }]"
    />
  </UContainer>
</template>
