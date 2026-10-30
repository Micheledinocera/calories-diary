<script setup lang="ts">
import { nuovoPreferitoDaPastoSchema, type Pasto } from "@calories-diary/shared";

defineProps<{ pasto: Pasto }>();
const emit = defineEmits<{ salva: [nome: string] }>();
const aperta = defineModel<boolean>("open", { required: true });

const nome = ref("");

watch(aperta, (a) => {
  if (a) nome.value = "";
});

const dati = computed(() => nuovoPreferitoDaPastoSchema.safeParse({ nome: nome.value }));

function salva() {
  if (!dati.value.success) return;
  emit("salva", dati.value.data.nome);
  aperta.value = false;
}
</script>

<template>
  <UModal v-model:open="aperta" title="Salva tra i pasti preferiti">
    <template #body>
      <form class="space-y-4" @submit.prevent="salva">
        <p class="text-sm text-muted">
          {{ numeroAlimenti(pasto.voci.length) }}:
          {{ pasto.voci.map((v) => v.alimento.nome).join(", ") }}
        </p>
        <UFormField label="Nome">
          <UInput
            v-model="nome"
            placeholder="Es. Colazione del lunedì"
            maxlength="100"
            class="w-full"
            autofocus
          />
        </UFormField>
        <UButton type="submit" icon="i-lucide-star" size="lg" block :disabled="!dati.success">
          Salva
        </UButton>
      </form>
    </template>
  </UModal>
</template>
