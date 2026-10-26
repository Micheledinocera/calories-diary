<script setup lang="ts">
// The choice stays on the device (color mode of Nuxt UI); "Sistema" follows the phone.
const colorMode = useColorMode();

const temi = [
  { valore: "light", etichetta: "Chiaro", icona: "i-lucide-sun" },
  { valore: "dark", etichetta: "Scuro", icona: "i-lucide-moon" },
  { valore: "system", etichetta: "Sistema", icona: "i-lucide-monitor" },
] as const;

const tema = computed({
  get: () => colorMode.preference as (typeof temi)[number]["valore"],
  set: (valore) => (colorMode.preference = valore),
});
</script>

<template>
  <ControlloSegmentato v-model="tema" :opzioni="temi" etichetta="Tema" />
</template>
