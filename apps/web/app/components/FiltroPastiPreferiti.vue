<script setup lang="ts">
const autore = defineModel<"miei" | "tutti">({ required: true });

const filtri = [
  { valore: "miei", etichetta: "I miei pasti" },
  { valore: "tutti", etichetta: "Tutti" },
] as const;
</script>

<template>
  <div class="flex gap-2" role="group" aria-label="Filtro">
    <UButton
      v-for="f in filtri"
      :key="f.valore"
      :variant="autore === f.valore ? 'soft' : 'outline'"
      :color="autore === f.valore ? 'primary' : 'neutral'"
      class="rounded-full"
      :aria-pressed="autore === f.valore"
      @click="autore = f.valore"
    >
      {{ f.etichetta }}
    </UButton>
  </div>
</template>
