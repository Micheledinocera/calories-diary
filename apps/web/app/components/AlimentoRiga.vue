<script setup lang="ts">
import type { Alimento } from "@calories-diary/shared";

defineProps<{ alimento: Alimento }>();
</script>

<template>
  <NuxtLink
    :to="`/alimenti/${alimento.id}`"
    class="flex items-center justify-between gap-3 py-3 px-1 hover:bg-elevated/50 rounded-md"
  >
    <div class="min-w-0">
      <p class="font-medium truncate">
        {{ alimento.nome }}
        <UIcon
          v-if="alimento.verificato"
          name="i-lucide-badge-check"
          class="text-primary align-middle"
          aria-label="Verificato"
        />
      </p>
      <p class="text-sm text-muted truncate">
        <span v-if="alimento.marca">{{ alimento.marca }} · </span>
        C {{ formattaValore(alimento.valoriPer100.carboidrati) }} · G
        {{ formattaValore(alimento.valoriPer100.grassi) }} · P
        {{ formattaValore(alimento.valoriPer100.proteine) }}
      </p>
    </div>
    <div class="text-end shrink-0">
      <p class="font-semibold">{{ formattaValore(alimento.valoriPer100.kcal) }} kcal</p>
      <p class="text-xs text-muted">per 100 {{ alimento.unitaBase }}</p>
    </div>
  </NuxtLink>
</template>
