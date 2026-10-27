<script setup lang="ts">
/** Password field with the eye button to show what is being typed. Other attributes go to UInput. */
const valore = defineModel<string>({ required: true });
const visibile = ref(false);
</script>

<template>
  <UInput
    v-model="valore"
    :type="visibile ? 'text' : 'password'"
    size="xl"
    class="w-full"
    :ui="{ trailing: 'pe-1' }"
  >
    <template #trailing>
      <UButton
        color="neutral"
        variant="link"
        :icon="visibile ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        :aria-label="visibile ? 'Nascondi password' : 'Mostra password'"
        :aria-pressed="visibile"
        @click="visibile = !visibile"
      />
    </template>
  </UInput>
</template>
