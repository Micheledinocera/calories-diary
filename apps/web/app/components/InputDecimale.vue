<script setup lang="ts">
// Every number field of the app: comma or dot as decimal separator, the value follows the typing
// (UInputNumber updates it only on blur and, in it-IT, reads the dot as thousands separator).
const props = withDefaults(
  defineProps<{
    /** Digits after the separator: 0 for whole numbers (kcal, percentages). */
    decimali?: number;
    min?: number;
    max?: number;
    /** Shows the − and + buttons, which move the value by this much. */
    passo?: number;
  }>(),
  { decimali: 3, min: 0, max: undefined, passo: undefined },
);

const valore = defineModel<number | undefined>();

const formatta = (v: number | undefined) => formattaDecimale(v, props.decimali);
const leggi = (t: string) => leggiDecimale(t, props.decimali);

const testo = ref(formatta(valore.value));

// Only a value from outside rewrites the text: what is being typed ("12,") stays as it is.
watch(valore, (v) => {
  if (v !== leggi(testo.value)) testo.value = formatta(v);
});

function limita(v: number) {
  return Math.min(Math.max(v, props.min), props.max ?? Infinity);
}

function digita(nuovo: string | number) {
  testo.value = String(nuovo);
  valore.value = leggi(testo.value);
}

function normalizza() {
  if (valore.value === undefined) return;
  valore.value = limita(valore.value);
  testo.value = formatta(valore.value);
}

function sposta(verso: 1 | -1) {
  valore.value = limita(arrotonda((valore.value ?? 0) + verso * props.passo!, props.decimali));
  testo.value = formatta(valore.value);
}
</script>

<template>
  <UInput
    :model-value="testo"
    :inputmode="decimali ? 'decimal' : 'numeric'"
    autocomplete="off"
    @update:model-value="digita"
    @blur="normalizza"
  >
    <template v-if="passo" #leading>
      <UButton
        icon="i-lucide-minus"
        color="neutral"
        variant="link"
        size="sm"
        aria-label="Diminuisci"
        :disabled="(valore ?? 0) <= min"
        @click="sposta(-1)"
      />
    </template>
    <template v-if="passo" #trailing>
      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="link"
        size="sm"
        aria-label="Aumenta"
        :disabled="max !== undefined && (valore ?? 0) >= max"
        @click="sposta(1)"
      />
    </template>
  </UInput>
</template>
