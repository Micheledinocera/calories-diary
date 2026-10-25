<script setup lang="ts">
import type { Alimento, NuovoAlimento } from "@calories-diary/shared";

const route = useRoute();
const id = route.params.id as string;
const { trova, modifica, elimina } = useAlimenti();

const stato = ref<StatoFormAlimento>(statoVuoto());
const { data: alimento, error } = useAsyncData(`alimento-${id}`, () => trova(id));
watch(
  alimento,
  (a) => {
    if (a) stato.value = statoDaAlimento(a);
  },
  { immediate: true },
);

const inCorso = ref(false);
const errore = ref<ErroreNormalizzato | null>(null);
const toast = useToast();

async function esegui(azione: () => Promise<void>) {
  inCorso.value = true;
  errore.value = null;
  try {
    await azione();
  } catch (err) {
    errore.value = err as ErroreNormalizzato;
  } finally {
    inCorso.value = false;
  }
}

const aggiorna = (a: Alimento) => {
  alimento.value = a;
};

function salva({ barcode: _, ...dati }: NuovoAlimento) {
  return esegui(async () => {
    aggiorna(await modifica(id, dati));
    toast.add({ title: "Alimento salvato", color: "success", icon: "i-lucide-check" });
  });
}

function archivia(archiviato: boolean) {
  return esegui(async () => aggiorna(await modifica(id, { archiviato })));
}

function eliminaAlimento() {
  if (!confirm("Eliminare l'alimento?")) return;
  return esegui(async () => {
    await elimina(id);
    await navigateTo("/alimenti", { replace: true });
  });
}

const erroreCaricamento = computed(() => (error.value ? normalizzaErrore(error.value) : null));
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
      <h1 class="text-2xl font-bold truncate">{{ alimento?.nome ?? "Alimento" }}</h1>
    </div>

    <UAlert
      v-if="erroreCaricamento"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="erroreCaricamento.messaggio"
    />

    <template v-else-if="alimento">
      <div class="flex flex-wrap gap-2 text-sm">
        <UBadge v-if="alimento.archiviato" color="neutral">Archiviato</UBadge>
        <UBadge v-if="alimento.barcode" color="neutral" variant="outline">
          {{ alimento.barcode }}
        </UBadge>
        <UBadge v-if="alimento.fonte === 'off'" color="neutral" variant="outline">
          Da Open Food Facts
        </UBadge>
      </div>

      <AlimentoForm v-model="stato" :avvisi="alimento.avvisi" :in-corso="inCorso" @salva="salva">
        <template #errori>
          <UAlert
            v-if="errore"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errore.messaggio"
          />
        </template>
      </AlimentoForm>

      <div class="flex flex-col gap-2">
        <UButton
          :icon="alimento.archiviato ? 'i-lucide-archive-restore' : 'i-lucide-archive'"
          color="neutral"
          variant="subtle"
          block
          :disabled="inCorso"
          @click="archivia(!alimento.archiviato)"
        >
          {{ alimento.archiviato ? "Ripristina" : "Archivia (nascondi dalla ricerca)" }}
        </UButton>
        <UButton
          v-if="alimento.utilizzi === 0"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          block
          :disabled="inCorso"
          @click="eliminaAlimento"
        >
          Elimina
        </UButton>
      </div>
    </template>

    <div v-else class="space-y-3">
      <USkeleton v-for="i in 5" :key="i" class="h-10 w-full" />
    </div>
  </UContainer>
</template>
