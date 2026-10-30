<script setup lang="ts">
import type { NuovoPastoPreferito } from "@calories-diary/shared";

const { crea } = usePastiPreferiti();
const toast = useToast();

const inCorso = ref(false);
const errore = ref<ErroreNormalizzato | null>(null);

async function salva(dati: NuovoPastoPreferito) {
  inCorso.value = true;
  errore.value = null;
  try {
    const pasto = await crea(dati);
    toast.add({ title: "Pasto salvato", color: "success", icon: "i-lucide-check" });
    await navigateTo(`/pasti-preferiti/${pasto.id}`, { replace: true });
  } catch (err) {
    errore.value = err as ErroreNormalizzato;
  } finally {
    inCorso.value = false;
  }
}
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-4">
    <div class="flex items-center gap-1">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        to="/pasti-preferiti"
        aria-label="Indietro"
      />
      <h1 class="text-2xl font-bold text-highlighted">Nuovo pasto preferito</h1>
    </div>

    <PastoPreferitoForm :in-corso="inCorso" @salva="salva">
      <template #errori>
        <UAlert
          v-if="errore"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="errore.messaggio"
        />
      </template>
    </PastoPreferitoForm>
  </UContainer>
</template>
