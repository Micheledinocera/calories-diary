<script setup lang="ts">
// Tag filter of the favorite meals: the most used tags always in view, the others behind
// "Altri tag". A meal must have every chosen tag.
const scelti = defineModel<string[]>({ required: true });

const PIU_USATI = 5;

const { tagUsati } = usePastiPreferiti();
const { data } = useAsyncData("tag-pasti-preferiti", tagUsati, { server: false });

const espanso = ref(false);
const tutti = computed(() => (data.value ?? []).map((t) => t.nome));
const piuUsati = computed(() => tutti.value.slice(0, PIU_USATI));
// A chosen tag stays in view even when it is not among the most used.
const visibili = computed(() =>
  espanso.value
    ? tutti.value
    : [...piuUsati.value, ...scelti.value.filter((t) => !piuUsati.value.includes(t))],
);
const altri = computed(() => tutti.value.length - PIU_USATI);

function cambia(tag: string) {
  scelti.value = scelti.value.includes(tag)
    ? scelti.value.filter((t) => t !== tag)
    : [...scelti.value, tag];
}
</script>

<template>
  <div
    v-if="tutti.length"
    class="flex flex-wrap items-center gap-1.5"
    role="group"
    aria-label="Tag"
  >
    <UButton
      v-for="t in visibili"
      :key="t"
      size="sm"
      :icon="scelti.includes(t) ? 'i-lucide-check' : 'i-lucide-tag'"
      :variant="scelti.includes(t) ? 'soft' : 'outline'"
      :color="scelti.includes(t) ? 'primary' : 'neutral'"
      class="rounded-full"
      :aria-pressed="scelti.includes(t)"
      @click="cambia(t)"
    >
      {{ t }}
    </UButton>
    <UButton
      v-if="altri > 0"
      size="sm"
      variant="ghost"
      color="neutral"
      :trailing-icon="espanso ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
      :aria-expanded="espanso"
      @click="espanso = !espanso"
    >
      {{ espanso ? "Meno tag" : `Altri tag (${altri})` }}
    </UButton>
  </div>
</template>
