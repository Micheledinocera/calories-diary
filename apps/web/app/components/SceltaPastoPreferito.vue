<script setup lang="ts">
const aperto = defineModel<boolean>("open", { required: true });
defineProps<{ nomePasto: string }>();
const emit = defineEmits<{ scelta: [id: string] }>();

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

const autore = ref<"miei" | "tutti">("miei");

// One instance per meal: a key of its own, and nothing loaded until it is opened.
const { data, status, error, refresh } = useAsyncData(
  `scelta-preferito-${useId()}`,
  () => elenca({ q: testo.value.trim() || undefined, autore: autore.value }),
  { watch: [testo, autore], immediate: false },
);

watch(aperto, (a) => {
  if (!a) return;
  cerca.value = "";
  testo.value = "";
  refresh();
});

function scegli(id: string) {
  emit("scelta", id);
  aperto.value = false;
}

const errore = computed(() => (error.value ? normalizzaErrore(error.value) : null));
</script>

<template>
  <UDrawer
    v-model:open="aperto"
    :title="`Pasto preferito in ${nomePasto}`"
    :ui="{
      content: 'sm:max-w-xl sm:mx-auto sm:w-full',
      body: 'flex flex-col gap-3 min-h-0',
    }"
  >
    <template #body>
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
      <div v-else class="divide-y divide-default max-h-[45dvh] overflow-y-auto">
        <PastoPreferitoRiga v-for="p in data ?? []" :key="p.id" :pasto="p" @click="scegli(p.id)" />
        <p v-if="status === 'success' && !data?.length" class="text-sm text-muted py-3">
          Nessun pasto preferito trovato.
        </p>
      </div>
    </template>
  </UDrawer>
</template>
