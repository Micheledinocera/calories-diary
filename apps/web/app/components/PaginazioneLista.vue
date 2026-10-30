<script setup lang="ts">
import { useIntersectionObserver } from "@vueuse/core";

const pagina = defineModel<number>("pagina", { required: true });
const props = defineProps<{
  /** Last page received: the next one comes from here, so a repeated trigger asks for it once. */
  caricata: number;
  totale: number;
  perPagina: number;
  desktop: boolean;
  inCorso: boolean;
}>();

const ancora = computed(() => props.caricata * props.perPagina < props.totale);

// On mobile the next page loads when the end of the list comes near. Watching the state, not only
// the event: a page too short to fill the screen leaves the end in view.
const fine = useTemplateRef("fine");
const fineInVista = ref(false);
useIntersectionObserver(fine, ([voce]) => (fineInVista.value = voce?.isIntersecting ?? false), {
  rootMargin: "200px",
});
watchEffect(() => {
  if (!props.desktop && fineInVista.value && ancora.value && !props.inCorso) {
    pagina.value = props.caricata + 1;
  }
});
</script>

<template>
  <UPagination
    v-if="desktop && totale > perPagina"
    v-model:page="pagina"
    :total="totale"
    :items-per-page="perPagina"
    variant="ghost"
    class="flex justify-center pt-1"
  />
  <div v-else-if="!desktop" ref="fine" class="flex justify-center min-h-6">
    <UIcon v-if="inCorso" name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
  </div>
</template>
