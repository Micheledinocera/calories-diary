<script setup lang="ts">
import type { NuovoAlimento } from "@calories-diary/shared";

const { crea, cercaBarcode } = useAlimenti();

const stato = ref<StatoFormAlimento>(statoVuoto());
const avvisi = ref<string[]>([]);

// Barcode typed by hand: the camera comes with the barcode-scan feature.
const codice = ref("");
const ricerca = ref<"ferma" | "in-corso" | "trovato" | "non-trovato">("ferma");
const erroreRicerca = ref<ErroreNormalizzato | null>(null);

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
    const alimento = await crea(dati);
    await navigateTo(`/alimenti/${alimento.id}`, { replace: true });
  } catch (err) {
    errore.value = err as ErroreNormalizzato;
  } finally {
    inCorso.value = false;
  }
}
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-6">
    <div class="flex items-center gap-2">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        to="/alimenti"
        aria-label="Indietro"
      />
      <h1 class="text-2xl font-bold">Nuovo alimento</h1>
    </div>

    <UCard>
      <form class="space-y-3" @submit.prevent="cerca">
        <UFormField
          label="Hai il codice a barre?"
          description="Cerchiamo il prodotto e precompiliamo i valori."
        >
          <div class="flex gap-2">
            <UInput
              v-model="codice"
              inputmode="numeric"
              placeholder="es. 8076809513753"
              class="flex-1"
              autocomplete="off"
            />
            <UButton type="submit" icon="i-lucide-search" :loading="ricerca === 'in-corso'">
              Cerca
            </UButton>
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
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          title="Prodotto non trovato: inseriscilo a mano dall'etichetta."
        />
        <UAlert
          v-else-if="ricerca === 'trovato'"
          color="success"
          variant="subtle"
          icon="i-lucide-check"
          title="Prodotto trovato: controlla i valori prima di salvare."
          description="Dati da Open Food Facts (licenza ODbL)."
        />
      </form>
    </UCard>

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
