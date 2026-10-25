<script setup lang="ts">
import type { Health, Pasto } from "@calories-diary/shared";

const { api } = useApi();

// Provisional "Oggi" page: the diary arrives with the diary feature. Scaffolding check page: API status and the default meals.
const { data, status, error, refresh } = useAsyncData("stato-api", async () => {
  const [health, pasti] = await Promise.all([api<Health>("/health"), api<Pasto[]>("/pasti")]);
  return { health, pasti };
});

// After a few seconds of waiting, tell the user the server may be waking up.
const attesaLunga = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  status,
  (s) => {
    clearTimeout(timer);
    attesaLunga.value = false;
    if (s === "pending") timer = setTimeout(() => (attesaLunga.value = true), 3000);
  },
  { immediate: true },
);
onBeforeUnmount(() => clearTimeout(timer));

const errore = computed(() => (error.value ? normalizzaErrore(error.value) : null));
</script>

<template>
  <UContainer class="py-10 max-w-xl">
    <h1 class="text-2xl font-bold mb-6">Oggi</h1>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">Stato dell'API</span>
          <UButton
            icon="i-lucide-refresh-cw"
            variant="ghost"
            :loading="status === 'pending'"
            aria-label="Aggiorna"
            @click="refresh()"
          />
        </div>
      </template>

      <div v-if="status === 'pending'" class="space-y-2">
        <USkeleton class="h-4 w-1/2" />
        <USkeleton class="h-4 w-1/3" />
        <p v-if="attesaLunga" class="text-sm text-muted">
          Il server si sta risvegliando, può volerci fino a un minuto…
        </p>
      </div>

      <UAlert
        v-else-if="errore"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="errore.messaggio"
        :description="errore.codice"
      />

      <div v-else-if="data" class="space-y-4">
        <div class="flex gap-2">
          <UBadge :color="data.health.db === 'ok' ? 'success' : 'error'"
            >DB {{ data.health.db }}</UBadge
          >
          <UBadge :color="data.health.redis === 'ok' ? 'success' : 'error'">
            Redis {{ data.health.redis }}
          </UBadge>
          <UBadge color="neutral" variant="outline">v. {{ data.health.versione }}</UBadge>
        </div>
        <div>
          <p class="text-sm text-muted mb-1">Pasti</p>
          <ul class="list-disc ps-5">
            <li v-for="pasto in data.pasti" :key="pasto.id">{{ pasto.nome }}</li>
          </ul>
          <p v-if="!data.pasti.length" class="text-sm text-muted">
            Nessun pasto: esegui <code>pnpm db:seed</code> per creare quelli predefiniti.
          </p>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
