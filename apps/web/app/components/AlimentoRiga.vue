<script setup lang="ts">
import type { Alimento } from "@calories-diary/shared";

// With `to` the row is a link (Alimenti list); without it a button (food picker).
defineProps<{ alimento: Alimento; to?: string }>();
const NuxtLink = resolveComponent("NuxtLink");
</script>

<template>
  <component
    :is="to ? NuxtLink : 'button'"
    :to="to"
    :type="to ? undefined : 'button'"
    class="w-full flex items-center justify-between gap-3 py-3 text-start min-h-14 hover:bg-elevated/60"
  >
    <span class="min-w-0">
      <span class="flex items-center gap-1 font-medium text-highlighted">
        <span class="truncate">{{ alimento.nome }}</span>
        <UIcon
          v-if="alimento.verificato"
          name="i-lucide-badge-check"
          class="text-primary size-4 shrink-0"
          aria-label="Verificato"
        />
        <UIcon
          v-if="alimento.archiviato"
          name="i-lucide-archive"
          class="text-muted size-4 shrink-0"
          aria-label="Archiviato"
        />
      </span>
      <span class="block text-sm text-muted truncate tabular-nums">
        <template v-if="alimento.marca">{{ alimento.marca }} · </template>
        C {{ formattaValore(alimento.valoriPer100.carboidrati) }} · P
        {{ formattaValore(alimento.valoriPer100.proteine) }} · G
        {{ formattaValore(alimento.valoriPer100.grassi) }}
      </span>
    </span>
    <span class="text-end shrink-0 tabular-nums">
      <span class="block text-[15px] font-semibold text-highlighted">
        {{ formattaValore(alimento.valoriPer100.kcal) }} kcal
      </span>
      <span class="block text-xs text-muted">per 100 {{ alimento.unitaBase }}</span>
    </span>
  </component>
</template>
