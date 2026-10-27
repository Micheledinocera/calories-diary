<script setup lang="ts" generic="T extends string">
const valore = defineModel<T>({ required: true });
defineProps<{
  opzioni: readonly { valore: T; etichetta: string; icona?: string }[];
  etichetta: string;
}>();
</script>

<template>
  <div
    class="flex gap-0.5 rounded-md border border-default bg-elevated p-[3px]"
    role="group"
    :aria-label="etichetta"
  >
    <button
      v-for="o in opzioni"
      :key="o.valore"
      type="button"
      class="flex flex-1 items-center justify-center gap-1 h-8 px-2 rounded-[7px] text-xs font-medium text-muted whitespace-nowrap"
      :class="
        valore === o.valore &&
        'bg-default text-highlighted font-semibold shadow-card dark:ring-1 dark:ring-default'
      "
      :aria-pressed="valore === o.valore"
      @click="valore = o.valore"
    >
      <UIcon v-if="o.icona" :name="o.icona" class="size-3.5 shrink-0" />
      {{ o.etichetta }}
    </button>
  </div>
</template>
