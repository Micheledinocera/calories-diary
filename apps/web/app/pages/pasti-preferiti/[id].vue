<script setup lang="ts">
import type { NuovoPastoPreferito } from "@calories-diary/shared";

const route = useRoute();
const id = route.params.id as string;
const { trova, modifica, elimina } = usePastiPreferiti();
const toast = useToast();

const { data: pasto, error } = useAsyncData(`pasto-preferito-${id}`, () => trova(id));

const inModifica = ref(false);
const inCorso = ref(false);
const errore = ref<ErroreNormalizzato | null>(null);

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

function salva(dati: NuovoPastoPreferito) {
  return esegui(async () => {
    pasto.value = await modifica(id, dati);
    inModifica.value = false;
    toast.add({ title: "Pasto salvato", color: "success", icon: "i-lucide-check" });
  });
}

function eliminaPasto() {
  if (!confirm("Eliminare il pasto preferito? Il diario non cambia.")) return;
  return esegui(async () => {
    await elimina(id);
    await navigateTo("/pasti-preferiti", { replace: true });
  });
}

const erroreCaricamento = computed(() => (error.value ? normalizzaErrore(error.value) : null));
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-4">
    <div class="flex items-center gap-1">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        to="/pasti-preferiti"
        aria-label="Indietro"
      />
      <div class="min-w-0">
        <h1 class="text-2xl font-bold text-highlighted truncate">
          {{ pasto?.nome ?? "Pasto preferito" }}
        </h1>
        <p v-if="pasto" class="text-sm text-muted truncate">
          {{ pasto.mio ? "Creato da te" : `Creato da ${pasto.autore}` }}
        </p>
      </div>
    </div>

    <UAlert
      v-if="erroreCaricamento"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="erroreCaricamento.messaggio"
    />

    <template v-else-if="pasto">
      <template v-if="inModifica">
        <PastoPreferitoForm
          :nome="pasto.nome"
          :voci="pasto.voci"
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
            />
          </template>
        </PastoPreferitoForm>
        <UButton
          color="neutral"
          variant="ghost"
          size="xl"
          block
          :disabled="inCorso"
          @click="inModifica = false"
        >
          Annulla
        </UButton>
      </template>

      <template v-else>
        <UCard :ui="{ body: 'space-y-3 sm:p-4' }">
          <div class="grid grid-cols-[1.2fr_repeat(3,1fr)] gap-2">
            <div class="rounded-md bg-elevated px-3 py-2">
              <p class="text-lg font-bold tabular-nums text-highlighted">
                {{ formattaValore(Math.round(pasto.totali.kcal)) }}
              </p>
              <p class="text-xs text-muted">kcal</p>
            </div>
            <div v-for="m in macro" :key="m.chiave" class="rounded-md bg-elevated px-3 py-2">
              <p class="text-lg font-bold tabular-nums text-highlighted">
                {{ formattaValore(pasto.totali[m.chiave]) }}
              </p>
              <p class="text-xs text-muted">{{ m.sigla }} g</p>
            </div>
          </div>
        </UCard>

        <UCard :ui="{ body: 'sm:p-4' }">
          <h2 class="text-sm font-semibold text-highlighted mb-2">Alimenti</h2>
          <ul class="divide-y divide-default">
            <li
              v-for="(voce, i) in pasto.voci"
              :key="i"
              class="flex items-center justify-between gap-3 py-2"
            >
              <span class="min-w-0">
                <span class="block truncate">
                  {{ voce.alimento.nome }}
                  <UIcon
                    v-if="voce.alimento.archiviato"
                    name="i-lucide-archive"
                    class="text-muted align-middle"
                    aria-label="Alimento archiviato"
                  />
                </span>
                <span class="block text-sm text-muted tabular-nums">
                  {{ formattaValore(voce.quantita) }} {{ voce.alimento.unitaBase }}
                </span>
              </span>
              <span class="text-sm shrink-0 tabular-nums">
                {{ formattaValore(Math.round(voce.valori.kcal)) }} kcal
              </span>
            </li>
          </ul>
        </UCard>

        <template v-if="pasto.mio">
          <UAlert
            v-if="errore"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errore.messaggio"
          />
          <UButton icon="i-lucide-pencil" size="xl" block @click="inModifica = true">
            Modifica
          </UButton>
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xl"
            block
            :disabled="inCorso"
            @click="eliminaPasto"
          >
            Elimina
          </UButton>
        </template>
        <p v-else class="text-sm text-muted text-center">
          Lo aggiungi al diario da un pasto vuoto, con "Aggiungi preferito". Lo modifica solo chi
          l'ha creato.
        </p>
      </template>
    </template>

    <div v-else class="space-y-3">
      <USkeleton v-for="i in 3" :key="i" class="h-24 w-full rounded-lg" />
    </div>
  </UContainer>
</template>
