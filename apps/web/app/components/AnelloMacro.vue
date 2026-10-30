<script setup lang="ts">
import type { Valori } from "@calories-diary/shared";

const props = defineProps<{ totali: Valori; fabbisogno: number | null; piccolo?: boolean }>();

const R = 56;
const R_EXTRA = 65;
const CIRCONFERENZA = 2 * Math.PI * R;
const CIRCONFERENZA_EXTRA = 2 * Math.PI * R_EXTRA;
// Empty space between two slices, in px along the ring.
const STACCO = 3;

const coloriMacro = {
  carboidrati: "stroke-carboidrati",
  proteine: "stroke-proteine",
  grassi: "stroke-grassi",
} as const;

const anello = computed(() => anelloMacro(props.totali, props.fabbisogno));

const spicchi = computed(() => {
  const visibili = anello.value.spicchi.filter((s) => s.lunghezza > 0);
  return visibili.map((s) => {
    const tratto = Math.max(s.lunghezza * CIRCONFERENZA - (visibili.length > 1 ? STACCO : 0), 0);
    return {
      chiave: s.chiave,
      classe: coloriMacro[s.chiave],
      dasharray: `${tratto} ${CIRCONFERENZA}`,
      dashoffset: -s.inizio * CIRCONFERENZA,
    };
  });
});

const extra = computed(() => anello.value.extra * CIRCONFERENZA_EXTRA);
const oltre = computed(() => !!props.fabbisogno && props.totali.kcal > props.fabbisogno);
const etichetta = computed(() =>
  props.fabbisogno
    ? `${formattaValore(Math.round(props.totali.kcal))} kcal di ${formattaValore(props.fabbisogno)}`
    : `${formattaValore(Math.round(props.totali.kcal))} kcal`,
);
</script>

<template>
  <div
    class="relative shrink-0"
    :class="piccolo ? 'size-26' : 'size-34'"
    role="img"
    :aria-label="etichetta"
  >
    <svg viewBox="0 0 136 136" class="size-full -rotate-90" aria-hidden="true">
      <circle cx="68" cy="68" :r="R" fill="none" stroke-width="14" class="stroke-traccia" />
      <circle
        v-for="s in spicchi"
        :key="s.chiave"
        cx="68"
        cy="68"
        :r="R"
        fill="none"
        stroke-width="14"
        :class="s.classe"
        :stroke-dasharray="s.dasharray"
        :stroke-dashoffset="s.dashoffset"
      />
      <circle
        v-if="extra > 0"
        cx="68"
        cy="68"
        :r="R_EXTRA"
        fill="none"
        stroke-width="4"
        stroke-linecap="round"
        class="stroke-oltre"
        :stroke-dasharray="`${extra} ${CIRCONFERENZA_EXTRA}`"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
      <span
        class="font-bold tracking-tight tabular-nums"
        :class="[
          oltre ? 'text-error' : 'text-highlighted',
          piccolo ? 'text-xl leading-6' : 'text-[30px] leading-[34px]',
        ]"
      >
        {{ formattaValore(Math.round(totali.kcal)) }}
      </span>
      <span class="text-muted" :class="piccolo ? 'text-[10px] leading-3' : 'text-xs'">
        {{ fabbisogno ? `di ${formattaValore(fabbisogno)} kcal` : "kcal" }}
      </span>
    </div>
  </div>
</template>
