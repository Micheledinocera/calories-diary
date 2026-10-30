<script setup lang="ts" generic="T extends string">
const ordine = defineModel<T>({ required: true });
defineProps<{ opzioni: { label: string; value: T }[] }>();
</script>

<template>
  <USelect
    :model-value="ordine as string"
    :items="opzioni as { label: string; value: string }[]"
    icon="i-lucide-arrow-up-down"
    aria-label="Ordina"
    class="w-44 shrink-0"
    @update:model-value="ordine = $event as T"
  />
</template>
