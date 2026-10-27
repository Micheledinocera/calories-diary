<script setup lang="ts">
import type { NuovoAlimento } from "@calories-diary/shared";

const { crea, cercaBarcode } = useAlimenti();

const stato = ref<StatoFormAlimento>(statoVuoto());
const avvisi = ref<string[]>([]);

// Barcode typed by hand or read with the camera (ScansioneBarcode).
const codice = ref("");
const scansioneAperta = ref(false);
const ricerca = ref<"ferma" | "in-corso" | "trovato" | "non-trovato">("ferma");
const erroreRicerca = ref<ErroreNormalizzato | null>(null);

function letto(valore: string) {
  codice.value = valore;
  cerca();
}

async function cerca() {
  const valore = codice.value.trim();
  if (!/^\d{1,20}$/.test(valore)) {
    erroreRicerca.value = { codice: "VALIDAZIONE", messaggio: "Il codice a barre ha solo cifre" };
    return;
  }
  ricerca.value = "in-corso";
  erroreRicerca.value = null;
  try {
    const lookup = await cercaBarcode(valore);
    stato.value = statoDaProdotto(lookup.prodotto);
    avvisi.value = lookup.avvisi;
    ricerca.value = "trovato";
  } catch (err) {
    const errore = err as ErroreNormalizzato;
    if (errore.codice === "PRODOTTO_NON_TROVATO") {
      stato.value = { ...stato.value, barcode: valore };
      avvisi.value = [];
      ricerca.value = "non-trovato";
    } else {
      erroreRicerca.value = errore;
      ricerca.value = "ferma";
    }
  }
}

// A code scanned elsewhere (food picker, Alimenti list) arrives already looked up.
const route = useRoute();
onMounted(() => {
  const barcode = route.query.barcode;
  if (typeof barcode === "string" && barcode) {
    codice.value = barcode;
    cerca();
  }
});

// Back to where the form was opened from (Alimenti, or the diary's food picker).
const router = useRouter();
function tornaIndietro() {
  if (router.options.history.state.back) router.back();
  else navigateTo("/alimenti", { replace: true });
}

const toast = useToast();
const inCorso = ref(false);
const errore = ref<ErroreNormalizzato | null>(null);
const esistente = computed(() =>
  errore.value?.codice === "ALIMENTO_ESISTENTE"
    ? (errore.value.dettagli as { id?: string } | undefined)?.id
    : undefined,
);

async function salva(dati: NuovoAlimento) {
  inCorso.value = true;
  errore.value = null;
  try {
    await crea(dati);
    toast.add({ title: "Alimento salvato", color: "success", icon: "i-lucide-check" });
    tornaIndietro();
  } catch (err) {
    errore.value = err as ErroreNormalizzato;
  } finally {
    inCorso.value = false;
  }
}
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-4">
    <div class="flex items-center gap-1">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        aria-label="Indietro"
        @click="tornaIndietro"
      />
      <h1 class="text-2xl font-bold text-highlighted">Nuovo alimento</h1>
    </div>

    <UCard :ui="{ body: 'sm:p-4' }">
      <form class="space-y-3" @submit.prevent="cerca">
        <UFormField
          label="Hai il codice a barre?"
          description="Cerchiamo il prodotto e compiliamo i valori per te."
        >
          <div class="flex gap-2">
            <UInput
              v-model="codice"
              inputmode="numeric"
              placeholder="es. 8076809513753"
              size="xl"
              class="flex-1 min-w-0"
              autocomplete="off"
            />
            <UButton
              icon="i-lucide-scan-barcode"
              variant="soft"
              size="xl"
              aria-label="Scansiona con la fotocamera"
              @click="scansioneAperta = true"
            />
            <UButton type="submit" size="xl" :loading="ricerca === 'in-corso'">Cerca</UButton>
          </div>
        </UFormField>
        <UAlert
          v-if="erroreRicerca"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="erroreRicerca.messaggio"
        />
        <UAlert
          v-else-if="ricerca === 'non-trovato'"
          color="primary"
          variant="subtle"
          icon="i-lucide-info"
          title="Prodotto non trovato: inseriscilo a mano dall'etichetta."
        />
        <UAlert
          v-else-if="ricerca === 'trovato'"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check"
          title="Prodotto trovato: controlla i valori prima di salvare."
          description="Dati da Open Food Facts (licenza ODbL)."
        />
      </form>
    </UCard>

    <ScansioneBarcode v-model:open="scansioneAperta" @letto="letto" />

    <AlimentoForm
      v-model="stato"
      :avvisi="avvisi"
      barcode-modificabile
      etichetta-salva="Salva alimento"
      :in-corso="inCorso"
      @salva="salva"
    >
      <template #errori>
        <UAlert
          v-if="errore"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="errore.messaggio"
          :actions="
            esistente ? [{ label: 'Apri l\'alimento', to: `/alimenti/${esistente}` }] : undefined
          "
        />
      </template>
    </AlimentoForm>
  </UContainer>
</template>
