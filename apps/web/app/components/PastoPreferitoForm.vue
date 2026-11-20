<script setup lang="ts">
import {
  nuovoPastoPreferitoSchema,
  tagSchema,
  type Alimento,
  type NuovaVoce,
  type NuovoPastoPreferito,
  type VoceSuggerita,
} from "@calories-diary/shared";

const props = defineProps<{
  nome?: string;
  voci?: VoceSuggerita[];
  tags?: string[];
  inCorso?: boolean;
}>();
const emit = defineEmits<{ salva: [dati: NuovoPastoPreferito] }>();

const nome = ref(props.nome ?? "");
const voci = ref<VoceSuggerita[]>([...(props.voci ?? [])]);
const scelta = ref(false);
const tags = ref<string[]>([...(props.tags ?? [])]);

// The shared vocabulary as suggestions; a new tag is normalized as the API stores it.
const { tagUsati } = usePastiPreferiti();
const { data: vocabolario } = useAsyncData("tag-pasti-preferiti", tagUsati, { server: false });
const suggerimenti = computed(() => [
  ...new Set([...(vocabolario.value ?? []).map((t) => t.nome), ...tags.value]),
]);

// The text being typed: emptied once the new tag is added.
const cercaTag = ref("");

function creaTag(testo: string) {
  cercaTag.value = "";
  const tag = tagSchema.safeParse(testo);
  if (tag.success && !tags.value.includes(tag.data) && tags.value.length < 10) {
    tags.value.push(tag.data);
  }
}

function aggiungi({ quantita }: NuovaVoce, alimento: Alimento) {
  voci.value.push(voceDaAlimento(alimento, quantita));
}

function cambiaQuantita(i: number, quantita: number | undefined) {
  if (quantita && quantita > 0) voci.value[i] = conQuantita(voci.value[i]!, quantita);
}

const totali = computed(() => totaliVoci(voci.value));

const dati = computed(() => ({
  nome: nome.value,
  voci: voci.value.map((v) => ({ alimento: v.alimento.id, quantita: v.quantita })),
  tags: tags.value,
}));
const valido = computed(() => nuovoPastoPreferitoSchema.safeParse(dati.value).success);

function salva() {
  if (valido.value) emit("salva", dati.value);
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="salva">
    <UCard :ui="{ body: 'space-y-3 sm:p-4' }">
      <UFormField label="Nome">
        <UInput
          v-model="nome"
          placeholder="Es. Colazione del lunedì"
          maxlength="100"
          size="xl"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Tag" hint="Fino a 10">
        <UInputMenu
          v-model="tags"
          v-model:search-term="cercaTag"
          multiple
          create-item
          :items="suggerimenti"
          placeholder="Es. colazione, veloce"
          size="xl"
          class="w-full"
          :content="{ hideWhenEmpty: true }"
          @create="creaTag"
        />
      </UFormField>
    </UCard>

    <UCard :ui="{ body: 'space-y-2 sm:p-4' }">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-highlighted">Alimenti</h2>
        <span class="text-[15px] font-semibold tabular-nums text-highlighted">
          {{ formattaValore(Math.round(totali.kcal)) }} kcal
        </span>
      </div>

      <ul v-if="voci.length" class="divide-y divide-default">
        <li v-for="(voce, i) in voci" :key="i" class="py-2 space-y-1">
          <span class="block truncate">{{ voce.alimento.nome }}</span>
          <div class="flex items-center gap-2">
            <InputDecimale
              :model-value="voce.quantita"
              :passo="10"
              class="w-32 shrink-0"
              :aria-label="`Quantità di ${voce.alimento.nome} in ${voce.alimento.unitaBase}`"
              @update:model-value="cambiaQuantita(i, $event)"
            />
            <span class="text-sm text-muted">{{ voce.alimento.unitaBase }}</span>
            <span class="text-sm ms-auto tabular-nums">
              {{ formattaValore(Math.round(voce.valori.kcal)) }} kcal
            </span>
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="neutral"
              :aria-label="`Rimuovi ${voce.alimento.nome}`"
              @click="voci.splice(i, 1)"
            />
          </div>
        </li>
      </ul>
      <p v-else class="text-sm text-muted py-1">Nessun alimento.</p>

      <UButton icon="i-lucide-plus" variant="ghost" size="sm" @click="scelta = true">
        Aggiungi alimento
      </UButton>
      <SceltaAlimento
        v-model:open="scelta"
        :nome-pasto="nome.trim() || 'pasto preferito'"
        @scelta="aggiungi"
      />
    </UCard>

    <slot name="errori" />

    <UButton
      type="submit"
      icon="i-lucide-check"
      size="xl"
      block
      :loading="inCorso"
      :disabled="!valido"
    >
      Salva
    </UButton>
  </form>
</template>
