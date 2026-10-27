<script setup lang="ts">
const { sessione, esci } = useSessione();

const voci = [
  { label: "Oggi", icon: "i-lucide-calendar-check", to: "/" },
  { label: "Calendario", icon: "i-lucide-calendar-days", to: "/diario" },
  { label: "Alimenti", icon: "i-lucide-apple", to: "/alimenti" },
];

const route = useRoute();
// "Oggi" is active only on the home; the others also on their sub-pages.
const attiva = (to: string) => (to === "/" ? route.path === "/" : route.path.startsWith(to));

const menu = ref(false);

async function logout() {
  menu.value = false;
  esci();
  await navigateTo("/login");
}
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <header class="bg-default border-b border-default">
      <UContainer class="max-w-xl flex items-center justify-between gap-2 py-2">
        <nav class="flex gap-0.5" aria-label="Principale">
          <NuxtLink
            v-for="v in voci"
            :key="v.to"
            :to="v.to"
            class="inline-flex items-center gap-1.5 h-[34px] px-2.5 min-[380px]:px-3 rounded-full text-sm font-medium text-muted"
            :class="attiva(v.to) && 'bg-primary/10 text-primary font-semibold'"
            :aria-current="attiva(v.to) ? 'page' : undefined"
          >
            <!-- Below 380px (small phones) labels and account fit only without the icons. -->
            <UIcon :name="v.icon" class="size-4 max-[379px]:hidden" />
            {{ v.label }}
          </NuxtLink>
        </nav>

        <UPopover v-model:open="menu" :content="{ align: 'end' }">
          <UButton
            icon="i-lucide-user"
            variant="ghost"
            color="neutral"
            aria-label="Account"
            :class="route.path === '/profilo' && 'bg-primary/10 text-primary'"
          />
          <template #content>
            <div class="w-72 p-2 flex flex-col gap-0.5">
              <p class="px-2.5 pt-2 pb-1.5 text-[13px] text-muted truncate">
                {{ sessione?.utente.email }}
              </p>
              <NuxtLink
                to="/profilo"
                class="flex items-center gap-2.5 h-10 px-2.5 rounded-md text-[15px] hover:bg-elevated"
                @click="menu = false"
              >
                <UIcon name="i-lucide-target" class="size-4" />
                Profilo e obiettivi
              </NuxtLink>
              <div class="flex flex-col gap-2 px-2.5 pt-2.5 pb-3 my-1 border-y border-default">
                <span class="text-xs font-semibold tracking-wide uppercase text-muted">Tema</span>
                <SelettoreTema />
              </div>
              <button
                type="button"
                class="flex items-center gap-2.5 h-10 px-2.5 rounded-md text-[15px] text-start hover:bg-elevated"
                @click="logout"
              >
                <UIcon name="i-lucide-log-out" class="size-4" />
                Esci
              </button>
            </div>
          </template>
        </UPopover>
      </UContainer>
    </header>
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
