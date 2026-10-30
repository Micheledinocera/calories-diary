<script setup lang="ts">
defineProps<{ nome: string }>();
const emit = defineEmits<{ conferma: [] }>();
const aperta = defineModel<boolean>("open", { required: true });

function conferma() {
  emit("conferma");
  aperta.value = false;
}
</script>

<template>
  <UModal v-model:open="aperta" title="Togliere dai pasti preferiti?">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          "{{ nome }}" viene eliminato per tutti. Il diario non cambia.
        </p>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="subtle"
            class="flex-1 justify-center"
            @click="aperta = false"
          >
            Annulla
          </UButton>
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            class="flex-1 justify-center"
            @click="conferma"
          >
            Elimina
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
