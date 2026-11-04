<script setup lang="ts">
// In-app confirmation, opened with `useConferma`: never the browser's confirm().
withDefaults(
  defineProps<{
    titolo: string;
    descrizione?: string;
    /** Label of the confirm button. */
    azione?: string;
    icona?: string;
  }>(),
  { descrizione: undefined, azione: "Elimina", icona: "i-lucide-trash-2" },
);

// Closing with Esc or outside the modal resolves `undefined`: same as "Annulla".
const emit = defineEmits<{ close: [confermato: boolean] }>();
</script>

<template>
  <UModal :title="titolo">
    <template #body>
      <div class="space-y-4">
        <p v-if="descrizione" class="text-sm text-muted">{{ descrizione }}</p>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="subtle"
            class="flex-1 justify-center"
            @click="emit('close', false)"
          >
            Annulla
          </UButton>
          <UButton
            :icon="icona"
            color="error"
            class="flex-1 justify-center"
            autofocus
            @click="emit('close', true)"
          >
            {{ azione }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
