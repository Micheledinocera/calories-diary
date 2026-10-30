<script setup lang="ts">
import type { PastoPreferito } from "@calories-diary/shared";

// With `to` the row is a link (Pasti preferiti list); without it a button (meal picker).
defineProps<{ pasto: PastoPreferito; to?: string }>();
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
      <span class="block font-medium text-highlighted truncate">{{ pasto.nome }}</span>
      <span class="block text-sm text-muted truncate">
        {{ numeroAlimenti(pasto.voci.length) }}
        <template v-if="!pasto.mio"> · di {{ pasto.autore }}</template>
      </span>
    </span>
    <span class="text-end shrink-0 tabular-nums">
      <span class="block text-[15px] font-semibold text-highlighted">
        {{ formattaValore(Math.round(pasto.totali.kcal)) }} kcal
      </span>
      <span class="block text-xs text-muted">
        C {{ formattaValore(Math.round(pasto.totali.carboidrati)) }} · P
        {{ formattaValore(Math.round(pasto.totali.proteine)) }} · G
        {{ formattaValore(Math.round(pasto.totali.grassi)) }}
      </span>
    </span>
  </component>
</template>
