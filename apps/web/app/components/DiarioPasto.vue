<script setup lang="ts">
import type { NuovaVoce, Pasto, Voce } from "@calories-diary/shared";

const props = defineProps<{
  pasto: Pasto;
  /** Same view for any day: read-only until "Modifica" (always editable today). */
  modificabile: boolean;
  inCorso?: boolean;
}>();

const emit = defineEmits<{
  aggiungi: [voci: NuovaVoce[]];
  modificaVoce: [id: string, quantita: number];
  eliminaVoce: [id: string];
  elimina: [];
}>();

const scelta = ref(false);

// Quantity of an entry, edited in a modal.
const inModifica = ref<Voce | null>(null);
const quantita = ref<number | undefined>();
const modificaAperta = computed({
  get: () => inModifica.value !== null,
  set: (aperta) => {
    if (!aperta) inModifica.value = null;
  },
});

function apri(voce: Voce) {
  if (!props.modificabile) return;
  inModifica.value = voce;
  quantita.value = voce.quantita;
}

function salvaQuantita() {
  if (!inModifica.value || !quantita.value || quantita.value <= 0) return;
  emit("modificaVoce", inModifica.value.id, quantita.value);
  inModifica.value = null;
}

function eliminaVoce() {
  if (!inModifica.value) return;
  emit("eliminaVoce", inModifica.value.id);
  inModifica.value = null;
}

const accettaSuggerite = () =>
  emit(
    "aggiungi",
    props.pasto.suggerite.map((v) => ({ alimento: v.alimento.id, quantita: v.quantita })),
  );

const kcalSuggerite = computed(() => props.pasto.suggerite.reduce((t, v) => t + v.valori.kcal, 0));
const spuntino = computed(() => props.pasto.tipo === "spuntino");
</script>

<template>
  <UCard :ui="{ header: 'py-3', body: 'py-2 sm:py-2' }">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          v-if="spuntino && modificabile"
          name="i-lucide-grip-vertical"
          class="maniglia text-muted cursor-grab touch-none size-5"
          aria-label="Trascina per spostare"
        />
        <h2 class="font-medium flex-1">{{ nomiPasti[pasto.tipo] }}</h2>
        <span class="text-sm font-semibold">{{ formattaValore(pasto.totali.kcal) }} kcal</span>
        <UButton
          v-if="spuntino && modificabile"
          icon="i-lucide-trash-2"
          variant="ghost"
          color="neutral"
          size="sm"
          aria-label="Elimina lo spuntino"
          :disabled="inCorso"
          @click="emit('elimina')"
        />
      </div>
    </template>

    <div class="divide-y divide-default">
      <button
        v-for="voce in pasto.voci"
        :key="voce.id"
        type="button"
        class="w-full flex items-center justify-between gap-3 py-2 text-start"
        :class="modificabile ? 'hover:bg-elevated/50 rounded-md cursor-pointer' : 'cursor-default'"
        :disabled="!modificabile"
        @click="apri(voce)"
      >
        <span class="min-w-0">
          <span class="block truncate">
            {{ voce.alimento.nome }}
            <UIcon
              v-if="voce.alimento.archiviato"
              name="i-lucide-archive"
              class="text-muted align-middle"
              aria-label="Alimento archiviato"
            />
          </span>
          <span class="block text-sm text-muted">
            {{ formattaValore(voce.quantita) }} {{ voce.alimento.unitaBase }} · C
            {{ formattaValore(voce.valori.carboidrati) }} · G
            {{ formattaValore(voce.valori.grassi) }} · P
            {{ formattaValore(voce.valori.proteine) }}
          </span>
        </span>
        <span class="text-sm shrink-0">{{ formattaValore(voce.valori.kcal) }} kcal</span>
      </button>
    </div>

    <p
      v-if="!pasto.voci.length && !(modificabile && pasto.suggerite.length)"
      class="text-sm text-muted py-1"
    >
      Nessun alimento.
    </p>

    <div
      v-if="modificabile && !pasto.voci.length && pasto.suggerite.length"
      class="rounded-md bg-elevated/50 p-3 my-1 space-y-2"
    >
      <p class="text-sm">
        <span class="font-medium">Come ieri:</span>
        {{ pasto.suggerite.map((v) => v.alimento.nome).join(", ") }}
        <span class="text-muted">({{ formattaValore(kcalSuggerite) }} kcal)</span>
      </p>
      <UButton
        size="sm"
        variant="subtle"
        icon="i-lucide-copy-plus"
        :disabled="inCorso"
        @click="accettaSuggerite"
      >
        Aggiungi gli stessi alimenti
      </UButton>
    </div>

    <UButton
      v-if="modificabile"
      icon="i-lucide-plus"
      variant="ghost"
      size="sm"
      class="mt-1"
      :disabled="inCorso"
      @click="scelta = true"
    >
      Aggiungi alimento
    </UButton>

    <SceltaAlimento
      v-model:open="scelta"
      :titolo="`Aggiungi a ${nomiPasti[pasto.tipo]}`"
      @scelta="emit('aggiungi', [$event])"
    />

    <UModal v-model:open="modificaAperta" :title="inModifica?.alimento.nome">
      <template #body>
        <form v-if="inModifica" class="space-y-4" @submit.prevent="salvaQuantita">
          <UFormField :label="`Quantità (${inModifica.alimento.unitaBase})`">
            <UInputNumber
              v-model="quantita"
              :min="0"
              :step="10"
              :format-options="{ maximumFractionDigits: 1 }"
              locale="it-IT"
              class="w-full"
              autofocus
            />
          </UFormField>
          <div class="flex gap-2">
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="subtle"
              class="flex-1 justify-center"
              @click="eliminaVoce"
            >
              Rimuovi
            </UButton>
            <UButton
              type="submit"
              icon="i-lucide-check"
              class="flex-1 justify-center"
              :disabled="!quantita"
            >
              Salva
            </UButton>
          </div>
        </form>
      </template>
    </UModal>
  </UCard>
</template>
