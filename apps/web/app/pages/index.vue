<script setup lang="ts">
// "Oggi" is always editable; the other days open from the calendar, read-only.
const oggi = ref(giornoLocale());

// The app may stay open across midnight: "today" follows the clock when it comes back to the front.
function aggiornaOggi() {
  if (document.visibilityState === "visible") oggi.value = giornoLocale();
}
onMounted(() => document.addEventListener("visibilitychange", aggiornaOggi));
onBeforeUnmount(() => document.removeEventListener("visibilitychange", aggiornaOggi));
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-4">
    <div class="flex items-center justify-between gap-2">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">Oggi</h1>
        <p class="text-sm text-muted first-letter:uppercase">{{ formattaGiorno(oggi) }}</p>
      </div>
      <UButton
        icon="i-lucide-chevron-left"
        variant="ghost"
        color="neutral"
        :to="`/diario/${spostaGiorno(oggi, -1)}`"
        aria-label="Ieri"
      />
    </div>
    <DiarioGiornata :giorno="oggi" modificabile />
  </UContainer>
</template>
