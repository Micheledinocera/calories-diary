<script setup lang="ts">
import type { Alimento, NuovaVoce } from "@calories-diary/shared";

const aperto = defineModel<boolean>("open", { required: true });
defineProps<{ titolo: string }>();
const emit = defineEmits<{ scelta: [voce: NuovaVoce] }>();

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

// Without a search, the most used foods first (frequency, then recency). One instance per meal:
// a key of its own, and nothing loaded until it is opened.
const { data, status, error, refresh } = useAsyncData(
  `scelta-alimento-${useId()}`,
  () => {
    const q = testo.value.trim() || undefined;
    return elenca(q ? { q, ordine: "nome", limite: 50 } : { ordine: "uso", limite: 50 });
  },
  { watch: [testo], immediate: false },
);

const scelto = ref<Alimento | null>(null);
const quantita = ref<number | undefined>(100);

watch(aperto, (a) => {
  if (!a) return;
  cerca.value = "";
  testo.value = "";
  scelto.value = null;
  refresh();
});

function scegli(alimento: Alimento) {
  scelto.value = alimento;
  quantita.value = 100;
}

const anteprima = computed(() => {
  const a = scelto.value;
  const q = quantita.value;
  return a && q ? (a.valoriPer100.kcal * q) / 100 : null;
});

function conferma() {
  if (!scelto.value || !quantita.value || quantita.value <= 0) return;
  emit("scelta", { alimento: scelto.value.id, quantita: quantita.value });
  aperto.value = false;
}

const errore = computed(() => (error.value ? normalizzaErrore(error.value) : null));
</script>

<template>
  <UModal v-model:open="aperto" :title="titolo">
    <template #body>
      <form v-if="scelto" class="space-y-4" @submit.prevent="conferma">
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            aria-label="Scegli un altro alimento"
            @click="scelto = null"
          />
          <div class="min-w-0">
            <p class="font-medium truncate">{{ scelto.nome }}</p>
            <p v-if="scelto.marca" class="text-sm text-muted truncate">{{ scelto.marca }}</p>
          </div>
        </div>
        <UFormField :label="`Quantità (${scelto.unitaBase})`">
          <UInputNumber
            v-model="quantita"
            :min="0"
            :step="10"
            :format-options="{ maximumFractionDigits: 1 }"
            locale="it-IT"
            class="w-full"
            autofocus
          />
        </UFormField>
        <p v-if="anteprima !== null" class="text-sm text-muted">
          {{ formattaValore(anteprima) }} kcal
        </p>
        <UButton type="submit" block icon="i-lucide-plus" :disabled="!quantita">Aggiungi</UButton>
      </form>

      <div v-else class="space-y-3">
        <UInput
          v-model="cerca"
          icon="i-lucide-search"
          placeholder="Cerca per nome, marca o codice a barre"
          class="w-full"
          :loading="status === 'pending'"
          autofocus
        />
        <UAlert
          v-if="errore"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="errore.messaggio"
          :actions="[{ label: 'Riprova', onClick: () => refresh() }]"
        />
        <div v-else class="divide-y divide-default max-h-96 overflow-y-auto">
          <button
            v-for="a in data ?? []"
            :key="a.id"
            type="button"
            class="w-full flex items-center justify-between gap-3 py-2 px-1 text-start hover:bg-elevated/50 rounded-md"
            @click="scegli(a)"
          >
            <span class="min-w-0">
              <span class="block font-medium truncate">{{ a.nome }}</span>
              <span v-if="a.marca" class="block text-sm text-muted truncate">{{ a.marca }}</span>
            </span>
            <span class="text-sm text-muted shrink-0">
              {{ formattaValore(a.valoriPer100.kcal) }} kcal/100 {{ a.unitaBase }}
            </span>
          </button>
          <p v-if="status === 'success' && !data?.length" class="text-sm text-muted py-3">
            Nessun alimento trovato.
          </p>
        </div>
        <UButton
          to="/alimenti/nuovo"
          icon="i-lucide-plus"
          variant="subtle"
          color="neutral"
          block
          @click="aperto = false"
        >
          Nuovo alimento
        </UButton>
      </div>
    </template>
  </UModal>
</template>
