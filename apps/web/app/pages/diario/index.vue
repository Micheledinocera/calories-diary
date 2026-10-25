<script setup lang="ts">
import { CalendarDate, type DateValue } from "@internationalized/date";

const diario = useDiario();
const { data: obiettivi } = useAsyncData("obiettivi", () => diario.obiettivi());

const [a, m, g] = giornoLocale().split("-").map(Number) as [number, number, number];
const oggi = new CalendarDate(a, m, g);
// The month shown: the totals of its days are loaded when it changes.
const mese = shallowRef<DateValue>(oggi);

// A week before and two after the month: the calendar also shows the adjacent weeks.
const intervallo = computed(() => {
  const inizio = new CalendarDate(mese.value.year, mese.value.month, 1);
  return {
    da: inizio.subtract({ days: 7 }).toString(),
    a: inizio.add({ months: 1, days: 14 }).toString(),
  };
});

const { data: riepiloghi, error } = useAsyncData(
  () => `riepiloghi-${intervallo.value.da}`,
  () => diario.riepiloghi(intervallo.value.da, intervallo.value.a),
);

const kcalPerGiorno = computed(
  () => new Map((riepiloghi.value ?? []).map((r) => [r.giorno, r.totali.kcal])),
);

/** Within the daily need, over it, or no need set yet. */
function colore(kcal: number) {
  const fabbisogno = obiettivi.value?.fabbisogno;
  if (!fabbisogno) return "primary";
  return kcal > fabbisogno ? "warning" : "success";
}

function apri(giorno: DateValue | undefined) {
  if (!giorno) return;
  const testo = giorno.toString();
  navigateTo(testo === giornoLocale() ? "/" : `/diario/${testo}`);
}

const errore = computed(() => (error.value ? normalizzaErrore(error.value) : null));
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-4">
    <h1 class="text-2xl font-bold">Calendario</h1>

    <UAlert
      v-if="errore"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="errore.messaggio"
    />

    <UCalendar
      v-model:placeholder="mese"
      :model-value="undefined"
      :year-controls="false"
      class="w-full"
      size="lg"
      @update:model-value="apri($event as DateValue | undefined)"
    >
      <template #day="{ day }">
        <div class="flex flex-col items-center leading-tight">
          <span>{{ day.day }}</span>
          <UChip
            v-if="kcalPerGiorno.has(day.toString())"
            :color="colore(kcalPerGiorno.get(day.toString())!)"
            size="xs"
            standalone
            inset
          />
        </div>
      </template>
    </UCalendar>

    <p class="text-sm text-muted">
      Tocca un giorno per vederlo.
      <template v-if="obiettivi?.fabbisogno">
        Verde: entro il fabbisogno; arancione: oltre.
      </template>
    </p>
  </UContainer>
</template>
