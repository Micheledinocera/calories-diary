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
  { label: "grammi (per 100 g)", value: "g" },
  { label: "millilitri (per 100 ml)", value: "ml" },
];

const campiValori = [
  { chiave: "kcal", etichetta: "Kcal" },
  { chiave: "carboidrati", etichetta: "Carboidrati" },
  { chiave: "grassi", etichetta: "Grassi" },
  { chiave: "proteine", etichetta: "Proteine" },
] as const;

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
  <UForm :schema="nuovoAlimentoSchema" :state="stato" class="space-y-6" @submit="invia">
    <div class="space-y-4">
      <UFormField label="Nome" name="nome" required>
        <UInput v-model="stato.nome" class="w-full" autocomplete="off" />
      </UFormField>
      <UFormField label="Marca" name="marca">
        <UInput
          :model-value="stato.marca ?? ''"
          class="w-full"
          autocomplete="off"
          @update:model-value="stato.marca = String($event) || null"
        />
      </UFormField>
      <UFormField v-if="barcodeModificabile" label="Codice a barre" name="barcode">
        <UInput
          :model-value="stato.barcode ?? ''"
          class="w-full"
          inputmode="numeric"
          autocomplete="off"
          @update:model-value="stato.barcode = String($event) || null"
        />
      </UFormField>
    </div>

    <div class="space-y-3">
      <UFormField label="Valori riferiti a" name="unitaBase">
        <USelect v-model="stato.unitaBase" :items="unita" class="w-full" />
      </UFormField>

      <UAlert
        v-for="avviso in avvisi"
        :key="avviso"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="messaggiAvvisi[avviso] ?? avviso"
      />

      <div class="grid grid-cols-2 gap-3">
        <UFormField
          v-for="campo in campiValori"
          :key="campo.chiave"
          :label="campo.etichetta"
          :name="`valoriPer100.${campo.chiave}`"
          required
        >
          <UInputNumber
            v-model="stato.valoriPer100[campo.chiave]"
            :min="0"
            :step="0.1"
            :format-options="formatoValori"
            locale="it-IT"
            class="w-full"
          />
        </UFormField>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">Porzioni</span>
        <UButton
          icon="i-lucide-plus"
          size="sm"
          variant="subtle"
          color="neutral"
          @click="aggiungiPorzione"
        >
          Aggiungi
        </UButton>
      </div>
      <UFormField name="porzioni" :error-pattern="/^porzioni(\..+)?$/">
        <div class="space-y-2">
          <div v-for="(porzione, i) in stato.porzioni" :key="i" class="flex items-center gap-2">
            <UInput
              v-model="porzione.nome"
              placeholder="es. 1 vasetto"
              class="flex-1"
              aria-label="Nome della porzione"
            />
            <UInputNumber
              v-model="porzione.quantita"
              :min="0"
              :format-options="formatoValori"
              locale="it-IT"
              class="w-28"
              :aria-label="`Quantità in ${stato.unitaBase}`"
            />
            <span class="text-sm text-muted">{{ stato.unitaBase }}</span>
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
            Nessuna porzione: l'alimento si aggiunge in {{ stato.unitaBase }}.
          </p>
        </div>
      </UFormField>
    </div>

    <UFormField name="verificato">
      <USwitch v-model="stato.verificato" label="Valori verificati sull'etichetta" />
    </UFormField>

    <slot name="errori" />

    <UButton type="submit" block :loading="inCorso">{{ etichettaSalva ?? "Salva" }}</UButton>
  </UForm>
</template>
