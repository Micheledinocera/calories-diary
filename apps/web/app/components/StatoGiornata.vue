<script setup lang="ts">
import type { StatoGiornata } from "~/utils/diario";

const props = defineProps<{ stato: StatoGiornata }>();

// Always icon and word: the state must read without colour too.
const resa = computed(() => {
  const s = props.stato;
  if (s.tipo === "ok") {
    return {
      classe: "bg-ok-tenue text-success",
      icona: "i-lucide-circle-check",
      testo: "Entro il fabbisogno",
    };
  }
  if (s.tipo === "attenzione") {
    const nomi = macro.filter((m) => s.sforati.includes(m.chiave)).map((m) => m.etichetta);
    return {
      classe: "bg-attenzione-tenue text-warning",
      icona: "i-lucide-triangle-alert",
      testo: `${nomi.join(" e ")} oltre l'obiettivo`,
    };
  }
  return {
    classe: "bg-oltre-tenue text-error",
    icona: "i-lucide-circle-alert",
    testo: `${formattaValore(Math.round(s.eccesso))} kcal in più`,
  };
});
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full py-0.5 pl-2 pr-3 text-[13px] leading-5 font-semibold whitespace-nowrap"
    :class="resa.classe"
  >
    <UIcon :name="resa.icona" class="size-4 shrink-0" />
    {{ resa.testo }}
  </span>
</template>
