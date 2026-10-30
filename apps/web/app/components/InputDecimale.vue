<script setup lang="ts">
// UInputNumber updates its value only on blur: here the value follows the typing, so the form
// validates it right away.
const valore = defineModel<number | undefined>();

const testo = ref(formattaDecimale(valore.value));

// Only a value from outside rewrites the text: what is being typed ("12,") stays as it is.
watch(valore, (v) => {
  if (v !== leggiDecimale(testo.value)) testo.value = formattaDecimale(v);
});

function digita(nuovo: string | number) {
  testo.value = String(nuovo);
  valore.value = leggiDecimale(testo.value);
}

function normalizza() {
  if (valore.value !== undefined) testo.value = formattaDecimale(valore.value);
}
</script>

<template>
  <UInput
    :model-value="testo"
    inputmode="decimal"
    autocomplete="off"
    @update:model-value="digita"
    @blur="normalizza"
  />
</template>
