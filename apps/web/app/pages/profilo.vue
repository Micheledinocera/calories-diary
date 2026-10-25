<script setup lang="ts">
import { obiettiviSchema, ripartizionePredefinita, type Obiettivi } from "@calories-diary/shared";
import type { FormSubmitEvent } from "@nuxt/ui";

const { sessione } = useSessione();
const diario = useDiario();
const toast = useToast();

const { data: obiettivi, error } = useAsyncData("obiettivi", () => diario.obiettivi());

// The need can be empty while the user types (and is empty until set).
const stato = ref<{ fabbisogno?: number | null; ripartizione: Obiettivi["ripartizione"] }>({
  fabbisogno: null,
  ripartizione: { ...ripartizionePredefinita },
});
watch(
  obiettivi,
  (o) => {
    if (o) stato.value = { fabbisogno: o.fabbisogno, ripartizione: { ...o.ripartizione } };
  },
  { immediate: true },
);

const macro = [
  { chiave: "carboidrati", etichetta: "Carboidrati" },
  { chiave: "grassi", etichetta: "Grassi" },
  { chiave: "proteine", etichetta: "Proteine" },
] as const;

const somma = computed(() =>
  macro.reduce((t, m) => t + (stato.value.ripartizione[m.chiave] ?? 0), 0),
);

const inCorso = ref(false);
async function salva({ data }: FormSubmitEvent<Obiettivi>) {
  inCorso.value = true;
  try {
    obiettivi.value = await diario.salvaObiettivi(data);
    toast.add({ title: "Obiettivi salvati", color: "success", icon: "i-lucide-check" });
  } catch (err) {
    const errore = err as ErroreNormalizzato;
    toast.add({ title: errore.messaggio, color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    inCorso.value = false;
  }
}

const erroreCaricamento = computed(() => (error.value ? normalizzaErrore(error.value) : null));
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-6">
    <div>
      <h1 class="text-2xl font-bold">Profilo</h1>
      <p class="text-sm text-muted">{{ sessione?.utente.email }}</p>
    </div>

    <UAlert
      v-if="erroreCaricamento"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="erroreCaricamento.messaggio"
    />

    <UForm v-else :schema="obiettiviSchema" :state="stato" class="space-y-6" @submit="salva">
      <UFormField
        label="Fabbisogno calorico giornaliero"
        name="fabbisogno"
        description="In kcal: lo confronti ogni giorno con quanto hai mangiato."
      >
        <UInputNumber
          :model-value="stato.fabbisogno ?? undefined"
          :min="0"
          :step="50"
          locale="it-IT"
          class="w-full"
          placeholder="es. 2000"
          @update:model-value="stato.fabbisogno = $event ?? null"
        />
      </UFormField>

      <div class="space-y-3">
        <div>
          <p class="text-sm font-medium">Ripartizione dei macro</p>
          <p class="text-sm text-muted">
            Quota delle kcal da ciascun macro, in percentuale. Valore indicativo 50/30/20.
          </p>
        </div>
        <UFormField name="ripartizione" :error-pattern="/^ripartizione(\..+)?$/">
          <div class="grid grid-cols-3 gap-3">
            <UFormField v-for="m in macro" :key="m.chiave" :label="m.etichetta">
              <UInputNumber
                v-model="stato.ripartizione[m.chiave]"
                :min="0"
                :max="100"
                locale="it-IT"
                :format-options="{ maximumFractionDigits: 0 }"
                class="w-full"
              />
            </UFormField>
          </div>
        </UFormField>
        <p class="text-sm" :class="somma === 100 ? 'text-muted' : 'text-error'">
          Totale {{ somma }}%
        </p>
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-rotate-ccw"
          @click="stato.ripartizione = { ...ripartizionePredefinita }"
        >
          Usa 50/30/20
        </UButton>
      </div>

      <UButton type="submit" block :loading="inCorso">Salva</UButton>
    </UForm>
  </UContainer>
</template>
