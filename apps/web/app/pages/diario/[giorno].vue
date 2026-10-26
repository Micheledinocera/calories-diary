<script setup lang="ts">
import { giornoSchema } from "@calories-diary/shared";

const route = useRoute();
const giorno = computed(() => route.params.giorno as string);
const valido = computed(() => giornoSchema.safeParse(giorno.value).success);

// Today has its own page, always editable.
watchEffect(() => {
  if (giorno.value === giornoLocale()) navigateTo("/", { replace: true });
});

// Same view as "Oggi", read-only until "Modifica"; back to read-only on another day.
const modifica = ref(false);
watch(giorno, () => (modifica.value = false));
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-4">
    <div class="flex items-center gap-1">
      <UButton
        icon="i-lucide-chevron-left"
        variant="ghost"
        color="neutral"
        :to="valido ? `/diario/${spostaGiorno(giorno, -1)}` : undefined"
        :disabled="!valido"
        aria-label="Giorno prima"
      />
      <div class="flex-1 min-w-0">
        <h1 class="text-lg font-bold first-letter:uppercase leading-tight">
          {{ valido ? formattaGiorno(giorno) : "Giorno non valido" }}
        </h1>
        <NuxtLink to="/diario" class="text-sm text-muted">Calendario</NuxtLink>
      </div>
      <UButton
        icon="i-lucide-chevron-right"
        variant="ghost"
        color="neutral"
        :to="valido ? `/diario/${spostaGiorno(giorno, 1)}` : undefined"
        :disabled="!valido"
        aria-label="Giorno dopo"
      />
      <UButton
        v-if="valido"
        :icon="modifica ? 'i-lucide-check' : 'i-lucide-pencil'"
        :variant="modifica ? 'solid' : 'subtle'"
        @click="modifica = !modifica"
      >
        {{ modifica ? "Fine" : "Modifica" }}
      </UButton>
    </div>

    <DiarioGiornata v-if="valido" :giorno="giorno" :modificabile="modifica" />
    <UEmpty
      v-else
      icon="i-lucide-calendar-x"
      title="Giorno non valido"
      :actions="[{ label: 'Vai al calendario', to: '/diario' }]"
    />
  </UContainer>
</template>
