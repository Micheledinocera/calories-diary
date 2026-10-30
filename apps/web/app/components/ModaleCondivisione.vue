<script setup lang="ts">
import type { Condivisione, DurataCondivisione } from "@calories-diary/shared";

const props = defineProps<{ da: string; a: string }>();
const emit = defineEmits<{ creata: [] }>();
const aperta = defineModel<boolean>("open", { required: true });

const condivisioni = useCondivisioni();
const toast = useToast();

const durata = ref<DurataCondivisione>("settimana");
// Off by default: the need is shown only by explicit choice.
const mostraFabbisogno = ref(false);
const creata = ref<Condivisione | null>(null);
const inCorso = ref(false);

watch(aperta, () => (creata.value = null));

async function crea() {
  inCorso.value = true;
  try {
    creata.value = await condivisioni.crea({
      da: props.da,
      a: props.a,
      durata: durata.value,
      mostraFabbisogno: mostraFabbisogno.value,
    });
    emit("creata");
  } catch (err) {
    const errore = err as ErroreNormalizzato;
    toast.add({ title: errore.messaggio, color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    inCorso.value = false;
  }
}

const condivisibile = computed(() => import.meta.client && !!navigator.share);

async function condividi(token: string) {
  try {
    await navigator.share({ title: "Diario alimentare", url: linkCondivisione(token) });
  } catch (err) {
    // Closing the share sheet is not an error.
    if ((err as DOMException).name !== "AbortError") {
      toast.add({
        title: "Condivisione non riuscita",
        color: "error",
        icon: "i-lucide-circle-alert",
      });
    }
  }
}
</script>

<template>
  <UModal v-model:open="aperta" title="Condividi con un link">
    <template #body>
      <div v-if="creata" class="space-y-4">
        <p class="text-sm text-muted">
          Chiunque abbia il link vede questi giorni, così come sono adesso.
          {{ testoScadenza(creata.scadeIl) }}.
        </p>
        <UInput :model-value="linkCondivisione(creata.token)" readonly size="xl" class="w-full" />
        <div class="flex gap-2">
          <UButton
            v-if="condivisibile"
            icon="i-lucide-share-2"
            class="flex-1 justify-center"
            @click="condividi(creata.token)"
          >
            Condividi
          </UButton>
          <UButton
            icon="i-lucide-copy"
            :variant="condivisibile ? 'subtle' : 'solid'"
            class="flex-1 justify-center"
            @click="condivisioni.copiaLink(creata.token)"
          >
            Copia link
          </UButton>
        </div>
      </div>

      <div v-else class="space-y-4">
        <p class="text-sm text-muted">
          Crei una pagina pubblica con cosa hai mangiato ({{ periodoCondiviso(da, a) }}). È una
          copia: le modifiche successive al diario non la cambiano.
        </p>
        <UFormField label="Durata del link">
          <ControlloSegmentato
            v-model="durata"
            :opzioni="opzioniDurata"
            etichetta="Durata del link"
          />
        </UFormField>
        <USwitch
          v-model="mostraFabbisogno"
          label="Mostra il fabbisogno"
          description="Pallini colorati e confronto con fabbisogno e macro di ogni giorno."
        />
        <UButton icon="i-lucide-link" block :loading="inCorso" @click="crea">Crea link</UButton>
      </div>
    </template>
  </UModal>
</template>
