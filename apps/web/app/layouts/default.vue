<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { sessione, esci } = useSessione();

// Provisional navigation: the flows will be validated with a design pass at the end of the MVP.
const voci: NavigationMenuItem[] = [
  { label: "Oggi", icon: "i-lucide-calendar-check", to: "/" },
  { label: "Alimenti", icon: "i-lucide-apple", to: "/alimenti" },
];

async function logout() {
  esci();
  await navigateTo("/login");
}
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <header class="border-b border-default">
      <UContainer class="max-w-xl flex items-center justify-between py-2">
        <UNavigationMenu :items="voci" />
        <UDropdownMenu
          :items="[
            { label: sessione?.utente.email, type: 'label' },
            { label: 'Esci', icon: 'i-lucide-log-out', onSelect: logout },
          ]"
        >
          <UButton icon="i-lucide-user" variant="ghost" color="neutral" aria-label="Account" />
        </UDropdownMenu>
      </UContainer>
    </header>
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
