<script setup lang="ts">
import { nuovoAlimentoSchema, type NuovoAlimento } from "@calories-diary/shared";
import type { FormSubmitEvent } from "@nuxt/ui";

const stato = defineModel<StatoFormAlimento>({ required: true });

defineProps<{
  /** Warnings to show above the values (from the lookup or the saved food). */
  avvisi?: string[];
  /** The barcode can be set only when the food is created. */
  barcodeModificabile?: boolean;
  etichettaSalva?: string;
  inCorso?: boolean;
}>();

const emit = defineEmits<{ salva: [dati: NuovoAlimento] }>();

const unita = [
  { valore: "g", etichetta: "per 100 g" },
  { valore: "ml", etichetta: "per 100 ml" },
] as const;

const unitaBase = computed({
  get: () => stato.value.unitaBase ?? "g",
  set: (valore) => (stato.value.unitaBase = valore),
});

const coloriMacro = {
  carboidrati: "bg-carboidrati",
  proteine: "bg-proteine",
  grassi: "bg-grassi",
} as const;

// Share of kcal from each macro, as the values are typed.
const ripartizione = computed(() => {
  const v = stato.value.valoriPer100;
  return ripartizioneGiorno({
    kcal: v.kcal ?? 0,
    carboidrati: v.carboidrati ?? 0,
    proteine: v.proteine ?? 0,
    grassi: v.grassi ?? 0,
  });
});

const formatoValori = { maximumFractionDigits: 3 };

function aggiungiPorzione() {
  stato.value.porzioni.push({ nome: "", predefinita: stato.value.porzioni.length === 0 });
}

function rendiPredefinita(indice: number) {
  stato.value.porzioni.forEach((p, i) => (p.predefinita = i === indice));
}

function invia({ data }: FormSubmitEvent<NuovoAlimento>) {
  emit("salva", data);
}
</script>

<template>
  <UForm :schema="nuovoAlimentoSchema" :state="stato" class="space-y-4" @submit="invia">
    <UCard :ui="{ body: 'space-y-4 sm:p-4' }">
      <h2 class="font-semibold text-highlighted">Prodotto</h2>
      <UFormField label="Nome" name="nome" required>
        <UInput v-model="stato.nome" size="xl" class="w-full" autocomplete="off" />
      </UFormField>
      <UFormField label="Marca" name="marca">
        <UInput
          :model-value="stato.marca ?? ''"
          size="xl"
          class="w-full"
          autocomplete="off"
          @update:model-value="stato.marca = String($event) || null"
        />
      </UFormField>
      <UFormField v-if="barcodeModificabile" label="Codice a barre" name="barcode">
        <UInput
          :model-value="stato.barcode ?? ''"
          size="xl"
          class="w-full"
          inputmode="numeric"
          autocomplete="off"
          @update:model-value="stato.barcode = String($event) || null"
        />
      </UFormField>
    </UCard>

    <UCard :ui="{ body: 'space-y-4 sm:p-4' }">
      <div class="flex items-center justify-between gap-2">
        <h2 class="font-semibold text-highlighted">Valori</h2>
        <ControlloSegmentato v-model="unitaBase" :opzioni="unita" etichetta="Valori riferiti a" />
      </div>

      <UAlert
        v-for="avviso in avvisi"
        :key="avviso"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="messaggiAvvisi[avviso] ?? avviso"
      />

      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Kcal" name="valoriPer100.kcal" required>
          <UInputNumber
            v-model="stato.valoriPer100.kcal"
            :min="0"
            :step="0.1"
            :format-options="formatoValori"
            locale="it-IT"
            size="xl"
            class="w-full"
            :increment="false"
            :decrement="false"
          />
        </UFormField>
        <UFormField v-for="m in macro" :key="m.chiave" :name="`valoriPer100.${m.chiave}`" required>
          <template #label>
            <span class="inline-flex items-center gap-1.5">
              <span class="size-2 rounded-full" :class="coloriMacro[m.chiave]" />
              {{ m.etichetta }} (g)
            </span>
          </template>
          <UInputNumber
            v-model="stato.valoriPer100[m.chiave]"
            :min="0"
            :step="0.1"
            :format-options="formatoValori"
            locale="it-IT"
            size="xl"
            class="w-full"
            :increment="false"
            :decrement="false"
          />
        </UFormField>
      </div>

      <div v-if="ripartizione" class="space-y-1.5">
        <div class="flex h-2.5 gap-0.5 rounded-full overflow-hidden" aria-hidden="true">
          <span
            v-for="m in macro"
            :key="m.chiave"
            :class="coloriMacro[m.chiave]"
            :style="{ width: `${ripartizione[m.chiave]}%` }"
          />
        </div>
        <p class="text-sm text-muted">
          Kcal da
          <template v-for="(m, i) in macro" :key="m.chiave">
            {{ m.etichetta.toLowerCase() }} {{ Math.round(ripartizione[m.chiave]) }}%{{
              i < macro.length - 1 ? ", " : "."
            }}
          </template>
        </p>
      </div>
    </UCard>

    <UCard :ui="{ body: 'space-y-3 sm:p-4' }">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-highlighted">Porzioni</h2>
        <UButton icon="i-lucide-plus" size="sm" variant="ghost" @click="aggiungiPorzione">
          Aggiungi
        </UButton>
      </div>
      <p class="text-sm text-muted">
        Le trovi come scorciatoie quando aggiungi l'alimento a un pasto.
      </p>
      <UFormField name="porzioni" :error-pattern="/^porzioni(\..+)?$/">
        <div class="space-y-2">
          <div v-for="(porzione, i) in stato.porzioni" :key="i" class="flex items-center gap-2">
            <UInput
              v-model="porzione.nome"
              placeholder="es. 1 vasetto"
              size="lg"
              class="flex-1 min-w-0"
              aria-label="Nome della porzione"
            />
            <UInputNumber
              v-model="porzione.quantita"
              :min="0"
              :format-options="formatoValori"
              locale="it-IT"
              size="lg"
              class="w-24"
              :increment="false"
              :decrement="false"
              :aria-label="`Quantità in ${unitaBase}`"
            />
            <span class="text-sm text-muted">{{ unitaBase }}</span>
            <UButton
              :icon="porzione.predefinita ? 'i-lucide-star' : 'i-lucide-star-off'"
              :color="porzione.predefinita ? 'primary' : 'neutral'"
              variant="ghost"
              :aria-label="porzione.predefinita ? 'Porzione predefinita' : 'Rendi predefinita'"
              @click="rendiPredefinita(i)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              aria-label="Rimuovi porzione"
              @click="stato.porzioni.splice(i, 1)"
            />
          </div>
          <p v-if="!stato.porzioni.length" class="text-sm text-muted">
            Nessuna porzione: l'alimento si aggiunge in {{ unitaBase }}.
          </p>
        </div>
      </UFormField>
    </UCard>

    <UCard :ui="{ body: 'sm:p-4' }">
      <UFormField name="verificato">
        <USwitch
          v-model="stato.verificato"
          label="Valori verificati sull'etichetta"
          :ui="{ root: 'flex-row-reverse justify-between', label: 'text-[15px] font-normal' }"
        />
      </UFormField>
    </UCard>

    <slot name="errori" />

    <UButton type="submit" size="xl" block :loading="inCorso">
      {{ etichettaSalva ?? "Salva" }}
    </UButton>
  </UForm>
</template>
