<script setup lang="ts">
import type { Alimento, NuovaVoce, Valori } from "@calories-diary/shared";

const aperto = defineModel<boolean>("open", { required: true });
const props = defineProps<{
  nomePasto: string;
  /** Day totals and need: the quantity step shows how the day changes. Absent outside the diary. */
  totaliGiorno?: Valori;
  fabbisogno?: number | null;
}>();
const emit = defineEmits<{ scelta: [voce: NuovaVoce, alimento: Alimento] }>();

const { elenca } = useAlimenti();
const toast = useToast();

const cerca = ref("");
// Search sent 300 ms after the last keystroke.
const testo = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;
watch(cerca, (valore) => {
  clearTimeout(timer);
  timer = setTimeout(() => (testo.value = valore), 300);
});
onBeforeUnmount(() => clearTimeout(timer));

// Without a search, the most used foods first (frequency, then recency). One instance per meal:
// a key of its own, and nothing loaded until it is opened.
const { data, status, error, refresh } = useAsyncData(
  `scelta-alimento-${useId()}`,
  () => {
    const q = testo.value.trim() || undefined;
    return elenca(q ? { q, ordine: "nome", limite: 50 } : { ordine: "uso", limite: 50 });
  },
  { watch: [testo], immediate: false },
);

const scelto = ref<Alimento | null>(null);
const quantita = ref<number | undefined>(100);

watch(aperto, (a) => {
  if (!a) return;
  cerca.value = "";
  testo.value = "";
  scelto.value = null;
  refresh();
});

/** The default portion first; quantity 100 when the food has none. */
function scegli(alimento: Alimento) {
  scelto.value = alimento;
  quantita.value = alimento.porzioni.find((p) => p.predefinita)?.quantita ?? 100;
}

// Portions as shortcuts, plus "100 g"; a chip is selected when the quantity matches it.
const scorciatoie = computed(() => {
  const a = scelto.value;
  if (!a) return [];
  const porzioni = [...a.porzioni]
    .sort((x, y) => Number(y.predefinita) - Number(x.predefinita))
    .map((p) => ({ chiave: p.id, nome: p.nome, quantita: p.quantita, dettaglio: true }));
  return [
    ...porzioni,
    { chiave: "100", nome: `100 ${a.unitaBase}`, quantita: 100, dettaglio: false },
  ];
});

const valori = computed(() => {
  const a = scelto.value;
  const q = quantita.value;
  if (!a || !q) return null;
  const per = (v: number) => (v * q) / 100;
  return {
    kcal: per(a.valoriPer100.kcal),
    carboidrati: per(a.valoriPer100.carboidrati),
    proteine: per(a.valoriPer100.proteine),
    grassi: per(a.valoriPer100.grassi),
  };
});

const coloriMacro = {
  carboidrati: "bg-carboidrati",
  proteine: "bg-proteine",
  grassi: "bg-grassi",
} as const;

// How the day changes with this food.
const dopo = computed(() => {
  if (!valori.value || !props.fabbisogno || !props.totaliGiorno) return null;
  const kcal = props.totaliGiorno.kcal + valori.value.kcal;
  return {
    kcal,
    oltre: kcal > props.fabbisogno,
    eccesso: kcal - props.fabbisogno,
    larghezza: `${Math.min(kcal / props.fabbisogno, 1) * 100}%`,
  };
});

function conferma() {
  if (!scelto.value || !quantita.value || quantita.value <= 0) return;
  emit("scelta", { alimento: scelto.value.id, quantita: quantita.value }, scelto.value);
  aperto.value = false;
}

// A scanned code: straight to the quantity if it is one of the user's foods, otherwise a new food
// with the code already looked up.
const scansione = ref(false);
async function letto(codice: string) {
  try {
    const trovati = await elenca({ q: codice, ordine: "nome", limite: 5 });
    const alimento = trovati.find((a) => a.barcode === codice);
    if (alimento) return scegli(alimento);
    aperto.value = false;
    await navigateTo({ path: "/alimenti/nuovo", query: { barcode: codice } });
  } catch (err) {
    const errore = err as ErroreNormalizzato;
    toast.add({ title: errore.messaggio, color: "error", icon: "i-lucide-circle-alert" });
  }
}

const errore = computed(() => (error.value ? normalizzaErrore(error.value) : null));
</script>

<template>
  <UDrawer
    v-model:open="aperto"
    :title="scelto ? scelto.nome : `Aggiungi a ${nomePasto}`"
    :ui="{
      content: 'sm:max-w-xl sm:mx-auto sm:w-full',
      body: 'flex flex-col gap-3 min-h-0',
    }"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UButton
          v-if="scelto"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          aria-label="Scegli un altro alimento"
          @click="scelto = null"
        />
        <div class="flex-1 min-w-0">
          <h2 class="text-lg font-bold text-highlighted truncate">
            {{ scelto ? scelto.nome : `Aggiungi a ${nomePasto}` }}
          </h2>
          <p v-if="scelto" class="text-sm text-muted truncate">
            <template v-if="scelto.marca">{{ scelto.marca }} · </template>
            per 100 {{ scelto.unitaBase }}: {{ formattaValore(scelto.valoriPer100.kcal) }} kcal
          </p>
        </div>
        <UButton
          v-if="!scelto"
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          aria-label="Chiudi"
          @click="aperto = false"
        />
      </div>
    </template>

    <template #body>
      <form v-if="scelto" class="flex flex-col gap-4" @submit.prevent="conferma">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Porzioni">
          <UButton
            v-for="s in scorciatoie"
            :key="s.chiave"
            :variant="quantita === s.quantita ? 'soft' : 'outline'"
            :color="quantita === s.quantita ? 'primary' : 'neutral'"
            class="rounded-full"
            :aria-pressed="quantita === s.quantita"
            @click="quantita = s.quantita"
          >
            {{ s.nome }}
            <span v-if="s.dettaglio" class="font-normal opacity-80">
              {{ formattaValore(s.quantita) }} {{ scelto.unitaBase }}
            </span>
          </UButton>
        </div>

        <UFormField :label="`Quantità (${scelto.unitaBase})`">
          <UInputNumber
            v-model="quantita"
            :min="0"
            :step="10"
            :format-options="{ maximumFractionDigits: 1 }"
            locale="it-IT"
            size="xl"
            class="w-full"
            :ui="{ base: 'text-center text-xl font-bold tabular-nums' }"
          />
        </UFormField>

        <div v-if="valori" class="grid grid-cols-[1.2fr_repeat(3,1fr)] gap-2">
          <div class="rounded-md bg-elevated px-3 py-2">
            <p class="text-lg font-bold tabular-nums text-highlighted">
              {{ formattaValore(Math.round(valori.kcal)) }}
            </p>
            <p class="text-xs text-muted">kcal</p>
          </div>
          <div v-for="m in macro" :key="m.chiave" class="rounded-md bg-elevated px-3 py-2">
            <p class="text-lg font-bold tabular-nums text-highlighted">
              {{ formattaValore(valori[m.chiave]) }}
            </p>
            <p class="flex items-center gap-1 text-xs text-muted">
              <span class="size-2 rounded-full" :class="coloriMacro[m.chiave]" />
              {{ m.sigla }} g
            </p>
          </div>
        </div>

        <div v-if="dopo" class="space-y-1.5">
          <p class="text-sm" :class="dopo.oltre ? 'text-error' : 'text-muted'">
            <template v-if="dopo.oltre">
              Con questo superi il fabbisogno di
              <strong>{{ formattaValore(Math.round(dopo.eccesso)) }}</strong> kcal.
            </template>
            <template v-else>
              Con questo la giornata arriva a
              <strong class="text-highlighted">{{ formattaValore(Math.round(dopo.kcal)) }}</strong>
              di {{ formattaValore(fabbisogno!) }} kcal.
            </template>
          </p>
          <div class="h-2 rounded-full bg-traccia overflow-hidden">
            <div
              class="h-full rounded-full"
              :class="dopo.oltre ? 'bg-oltre' : 'bg-ok'"
              :style="{ width: dopo.larghezza }"
            />
          </div>
        </div>

        <UButton type="submit" size="xl" block icon="i-lucide-plus" :disabled="!quantita">
          Aggiungi a {{ nomePasto }}
        </UButton>
      </form>

      <template v-else>
        <UInput
          v-model="cerca"
          icon="i-lucide-search"
          placeholder="Cerca per nome, marca o codice"
          size="xl"
          class="w-full"
          :loading="status === 'pending'"
          :ui="{ trailing: 'pe-1' }"
        >
          <template #trailing>
            <UButton
              icon="i-lucide-scan-barcode"
              variant="ghost"
              aria-label="Scansiona il codice a barre"
              @click="scansione = true"
            />
          </template>
        </UInput>
        <UAlert
          v-if="errore"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="errore.messaggio"
          :actions="[{ label: 'Riprova', onClick: () => refresh() }]"
        />
        <template v-else>
          <p class="text-xs font-semibold tracking-wide uppercase text-muted mt-1">
            {{ testo.trim() ? "Risultati" : "Più usati" }}
          </p>
          <div class="divide-y divide-default max-h-[45dvh] overflow-y-auto">
            <AlimentoRiga v-for="a in data ?? []" :key="a.id" :alimento="a" @click="scegli(a)" />
            <p v-if="status === 'success' && !data?.length" class="text-sm text-muted py-3">
              Nessun alimento trovato.
            </p>
          </div>
        </template>
        <UButton
          to="/alimenti/nuovo"
          icon="i-lucide-plus"
          variant="soft"
          size="xl"
          block
          @click="aperto = false"
        >
          Nuovo alimento
        </UButton>
      </template>

      <ScansioneBarcode v-model:open="scansione" @letto="letto" />
    </template>
  </UDrawer>
</template>
