<script setup lang="ts">
import type { StatoGiornata } from "~/utils/diario";

/**
 * The kcal of a day in a row with its state dot: the calendar and the shared page show both the
 * number and how the day went. Without a state (no need) only the number.
 */
defineProps<{
  kcal: number;
  stato: StatoGiornata | null;
}>();
</script>

<template>
  <span class="inline-flex items-center gap-1 text-[11px] leading-none tabular-nums text-muted">
    <span v-if="stato" class="size-1.5 shrink-0 rounded-full" :class="pallini[stato.tipo]" />
    {{ formattaValore(Math.round(kcal)) }}
  </span>
</template>
