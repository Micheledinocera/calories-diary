<script setup lang="ts">
import { parseDate, type DateValue } from "@internationalized/date";

const props = defineProps<{ giorno: string; inCorso?: boolean }>();
const emit = defineEmits<{ copia: [da: string] }>();
const aperta = defineModel<boolean>("open", { required: true });

const diario = useDiario();

const scelto = shallowRef<DateValue | undefined>();
const da = computed(() => scelto.value?.toString());

// What the chosen day holds, shown before copying.
const {
  data: origine,
  status,
  error,
  refresh,
} = useAsyncData(
  "copia-giorno",
  () => (da.value ? diario.giornata(da.value) : Promise.resolve(null)),
  { watch: [da], immediate: false },
);

watch(aperta, (a) => {
  if (!a) return;
  scelto.value = parseDate(spostaGiorno(props.giorno, -1));
  refresh();
});

const voci = computed(() => origine.value?.pasti.reduce((n, p) => n + p.voci.length, 0) ?? 0);

function conferma() {
  if (!da.value || !voci.value) return;
  emit("copia", da.value);
  aperta.value = false;
}
</script>

<template>
  <UModal v-model:open="aperta" title="Copia da un altro giorno">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          Gli alimenti si aggiungono a quelli di questa giornata: non si cancella nulla.
        </p>
        <UCalendar
          v-model="scelto"
          :year-controls="false"
          :is-date-disabled="(d) => d.toString() === giorno"
          class="w-full"
        />
        <p v-if="da && status !== 'pending'" class="text-sm text-center" aria-live="polite">
          <span v-if="error" class="text-error">{{ normalizzaErrore(error).messaggio }}</span>
          <template v-else-if="voci">
            {{ formattaGiornoBreve(da) }}: {{ numeroAlimenti(voci) }},
            {{ formattaValore(Math.round(origine?.totali.kcal ?? 0)) }} kcal
          </template>
          <span v-else class="text-muted">Nessun alimento in questo giorno.</span>
        </p>
        <UButton
          icon="i-lucide-copy-plus"
          size="lg"
          block
          :loading="inCorso || status === 'pending'"
          :disabled="!voci"
          @click="conferma"
        >
          Aggiungi a questa giornata
        </UButton>
      </div>
    </template>
  </UModal>
</template>
