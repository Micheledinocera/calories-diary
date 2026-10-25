<script setup lang="ts">
import { obiettiviSchema, ripartizionePredefinita, type Obiettivi } from "@calories-diary/shared";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { ChiaveMacro } from "~/utils/diario";

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

const coloriMacro = {
  carboidrati: "bg-carboidrati",
  proteine: "bg-proteine",
  grassi: "bg-grassi",
} as const;

/** Target in grams of a macro with the values being typed, under its field. */
function grammi(chiave: ChiaveMacro) {
  const quota = stato.value.ripartizione[chiave];
  if (!stato.value.fabbisogno || !quota) return undefined;
  return `${formattaValore(Math.round((stato.value.fabbisogno * quota) / 100 / kcalPerGrammo[chiave]))} g`;
}

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
  <UContainer class="py-6 max-w-xl space-y-4">
    <div>
      <h1 class="text-2xl font-bold text-highlighted">Profilo</h1>
      <p class="text-sm text-muted">{{ sessione?.utente.email }}</p>
    </div>

    <UAlert
      v-if="erroreCaricamento"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="erroreCaricamento.messaggio"
    />

    <UForm v-else :schema="obiettiviSchema" :state="stato" class="space-y-4" @submit="salva">
      <UCard :ui="{ body: 'space-y-3 sm:p-4' }">
        <h2 class="font-semibold text-highlighted">Fabbisogno</h2>
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
            size="xl"
            class="w-full"
            placeholder="es. 2000"
            @update:model-value="stato.fabbisogno = $event ?? null"
          />
        </UFormField>
      </UCard>

      <UCard :ui="{ body: 'space-y-3 sm:p-4' }">
        <div>
          <h2 class="font-semibold text-highlighted">Ripartizione dei macro</h2>
          <p class="text-sm text-muted">
            Quota delle kcal da ciascun macro. Da qui vengono gli obiettivi in grammi.
          </p>
        </div>
        <UFormField name="ripartizione" :error-pattern="/^ripartizione(\..+)?$/">
          <div class="grid grid-cols-3 gap-3">
            <UFormField v-for="m in macro" :key="m.chiave" :help="grammi(m.chiave)">
              <template #label>
                <span class="inline-flex items-center gap-1.5 text-[13px]">
                  <span class="size-2 rounded-full" :class="coloriMacro[m.chiave]" />
                  {{ m.etichetta }}
                </span>
              </template>
              <UInputNumber
                v-model="stato.ripartizione[m.chiave]"
                :min="0"
                :max="100"
                locale="it-IT"
                :format-options="{ maximumFractionDigits: 0 }"
                size="lg"
                class="w-full"
                :increment="false"
                :decrement="false"
              />
            </UFormField>
          </div>
        </UFormField>
        <div class="flex h-2.5 gap-0.5 rounded-full overflow-hidden bg-traccia" aria-hidden="true">
          <span
            v-for="m in macro"
            :key="m.chiave"
            :class="coloriMacro[m.chiave]"
            :style="{ width: `${Math.min(stato.ripartizione[m.chiave] ?? 0, 100)}%` }"
          />
        </div>
        <div class="flex items-center justify-between gap-2">
          <UBadge
            :color="somma === 100 ? 'success' : 'error'"
            variant="soft"
            :icon="somma === 100 ? 'i-lucide-circle-check' : 'i-lucide-circle-alert'"
            class="rounded-full"
          >
            Totale {{ somma }}%
          </UBadge>
          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-rotate-ccw"
            @click="stato.ripartizione = { ...ripartizionePredefinita }"
          >
            Valori consigliati
          </UButton>
        </div>
      </UCard>

      <UCard :ui="{ body: 'space-y-3 sm:p-4' }">
        <h2 class="font-semibold text-highlighted">Tema</h2>
        <SelettoreTema />
      </UCard>

      <UButton type="submit" size="xl" block :loading="inCorso">Salva</UButton>
    </UForm>
  </UContainer>
</template>
