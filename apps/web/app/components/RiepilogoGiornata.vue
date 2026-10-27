<script setup lang="ts">
import type { Obiettivi, Pasto, Valori } from "@calories-diary/shared";

const props = defineProps<{
  totali: Valori;
  obiettivi: Obiettivi | null;
  /** Only for a day over the need: the meal with the most kcal. */
  pesante: Pasto | null;
}>();

const fabbisogno = computed(() => props.obiettivi?.fabbisogno ?? null);
const stato = computed(() =>
  props.obiettivi ? statoGiornata(props.totali, props.obiettivi) : null,
);
const grammi = computed(() => (props.obiettivi ? obiettiviGrammi(props.obiettivi) : null));
// Without targets the bars show the share of kcal from each macro.
const ripartizione = computed(() => ripartizioneGiorno(props.totali));

const coloriMacro = {
  carboidrati: "bg-carboidrati",
  proteine: "bg-proteine",
  grassi: "bg-grassi",
} as const;

const legenda = computed(() =>
  macro.map((m) => {
    const valore = props.totali[m.chiave];
    const obiettivo = grammi.value?.[m.chiave];
    const quota = obiettivo ? valore / obiettivo : (ripartizione.value?.[m.chiave] ?? 0) / 100;
    return {
      ...m,
      valore,
      obiettivo,
      sopra: obiettivo !== undefined && valore > obiettivo,
      larghezza: `${Math.min(quota, 1) * 100}%`,
      colore: coloriMacro[m.chiave],
    };
  }),
);

const restano = computed(() =>
  fabbisogno.value ? Math.max(fabbisogno.value - props.totali.kcal, 0) : null,
);
const quotaPesante = computed(() =>
  props.pesante && props.totali.kcal
    ? Math.round((props.pesante.totali.kcal / props.totali.kcal) * 100)
    : 0,
);
</script>

<template>
  <UCard :ui="{ body: 'space-y-3 sm:p-4' }">
    <div class="flex items-center justify-between gap-2 min-h-6">
      <NuxtLink v-if="!fabbisogno" to="/profilo" class="text-sm text-primary font-medium">
        Imposta il fabbisogno
      </NuxtLink>
      <span v-else-if="stato?.tipo === 'oltre'" class="text-sm text-muted"
        >Oltre il fabbisogno</span
      >
      <span v-else class="text-sm text-muted">
        Ne restano <span class="tabular-nums">{{ formattaValore(Math.round(restano!)) }}</span> kcal
      </span>
      <StatoGiornata v-if="stato" :stato="stato" />
    </div>

    <div class="flex items-center gap-4">
      <AnelloMacro :totali="totali" :fabbisogno="fabbisogno" />
      <div class="flex-1 min-w-0 space-y-3">
        <div v-for="m in legenda" :key="m.chiave" class="space-y-1">
          <!-- On narrow screens the value wraps under the label instead of overflowing. -->
          <div class="flex flex-wrap items-baseline justify-between gap-x-2">
            <span class="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
              <span class="size-2 rounded-full" :class="m.colore" />
              {{ m.etichetta }}
            </span>
            <span
              class="text-[15px] leading-5 font-semibold tabular-nums whitespace-nowrap"
              :class="m.sopra ? 'text-warning' : 'text-highlighted'"
            >
              {{ formattaValore(Math.round(m.valore)) }}
              <small class="text-xs font-normal text-muted">
                {{ m.obiettivo ? `/ ${formattaValore(Math.round(m.obiettivo))} g` : "g" }}
              </small>
            </span>
          </div>
          <div class="h-1.5 rounded-full bg-traccia overflow-hidden">
            <div class="h-full rounded-full" :class="m.colore" :style="{ width: m.larghezza }" />
          </div>
        </div>
      </div>
    </div>

    <a
      v-if="pesante && stato?.tipo === 'oltre'"
      :href="`#pasto-${pesante.id}`"
      class="flex items-center gap-2 rounded-md bg-oltre-tenue px-3 py-2 text-sm text-error"
    >
      <UIcon name="i-lucide-flame" class="size-4 shrink-0" />
      <span>
        Ha pesato di più {{ articoloPasto(pesante.tipo) }}
        <strong class="font-semibold">{{ nomiPasti[pesante.tipo].toLowerCase() }}</strong
        >:
        <span class="tabular-nums">{{ formattaValore(Math.round(pesante.totali.kcal)) }}</span>
        kcal, il {{ quotaPesante }}% della giornata.
      </span>
    </a>
  </UCard>
</template>
