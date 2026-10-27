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

const totaliPerGiorno = computed(
  () => new Map((riepiloghi.value ?? []).map((r) => [r.giorno, r.totali])),
);

// Same rule as the day (statoGiornata): a dot per day with entries, none without a need.
const pallini = { ok: "bg-ok", attenzione: "bg-attenzione", oltre: "bg-oltre" } as const;
const descrizioni = {
  ok: "entro il fabbisogno",
  attenzione: "macro oltre l'obiettivo",
  oltre: "oltre il fabbisogno",
} as const;

function stato(giorno: string) {
  const totali = totaliPerGiorno.value.get(giorno);
  return totali && obiettivi.value ? statoGiornata(totali, obiettivi.value) : null;
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
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-2xl font-bold text-highlighted">Calendario</h1>
      <UButton icon="i-lucide-share" variant="soft" to="/diario/export">Esporta</UButton>
    </div>

    <UAlert
      v-if="errore"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="errore.messaggio"
    />

    <UCard :ui="{ body: 'sm:p-4' }">
      <UCalendar
        v-model:placeholder="mese"
        :model-value="undefined"
        :year-controls="false"
        class="w-full"
        size="lg"
        :ui="{ headCell: 'text-muted text-xs font-semibold' }"
        @update:model-value="apri($event as DateValue | undefined)"
      >
        <template #day="{ day }">
          <span
            class="flex flex-col items-center gap-1 leading-tight tabular-nums"
            :aria-label="
              stato(day.toString())
                ? `${day.day}, ${descrizioni[stato(day.toString())!.tipo]}`
                : undefined
            "
          >
            <span>{{ day.day }}</span>
            <span
              class="size-3 rounded-full"
              :class="
                stato(day.toString()) ? pallini[stato(day.toString())!.tipo] : 'bg-transparent'
              "
            />
          </span>
        </template>
      </UCalendar>

      <div
        v-if="obiettivi?.fabbisogno"
        class="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[13px] text-muted"
      >
        <span
          v-for="(descrizione, tipo) in descrizioni"
          :key="tipo"
          class="inline-flex items-center gap-1.5"
        >
          <span class="size-3 rounded-full" :class="pallini[tipo]" />
          <span class="first-letter:uppercase">{{ descrizione }}</span>
        </span>
      </div>
    </UCard>

    <p class="text-sm text-muted">
      Tocca un giorno per vederlo.
      <NuxtLink v-if="!obiettivi?.fabbisogno" to="/profilo" class="text-primary font-medium">
        Imposta il fabbisogno per vedere com'è andata ogni giornata.
      </NuxtLink>
    </p>
  </UContainer>
</template>
