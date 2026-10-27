<script setup lang="ts">
import type { Alimento, NuovoAlimento } from "@calories-diary/shared";

const route = useRoute();
const id = route.params.id as string;
const { trova, modifica, elimina } = useAlimenti();

const { data: alimento, error } = useAsyncData(`alimento-${id}`, () => trova(id));

// Read only by default: the form opens with "Modifica", from the saved values.
const inModifica = ref(false);
const stato = ref<StatoFormAlimento>(statoVuoto());
function apriModifica() {
  if (!alimento.value) return;
  stato.value = statoDaAlimento(alimento.value);
  errore.value = null;
  inModifica.value = true;
}

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
    inModifica.value = false;
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

const coloriMacro = {
  carboidrati: "bg-carboidrati",
  proteine: "bg-proteine",
  grassi: "bg-grassi",
} as const;
const ripartizione = computed(() =>
  alimento.value ? ripartizioneGiorno(alimento.value.valoriPer100) : null,
);

const erroreCaricamento = computed(() => (error.value ? normalizzaErrore(error.value) : null));
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-4">
    <div class="flex items-center gap-1">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        to="/alimenti"
        aria-label="Indietro"
      />
      <div class="min-w-0">
        <h1 class="text-2xl font-bold text-highlighted truncate">
          {{ alimento?.nome ?? "Alimento" }}
        </h1>
        <p v-if="alimento" class="text-sm text-muted truncate">
          <template v-if="alimento.marca">{{ alimento.marca }} · </template>
          {{
            alimento.utilizzi
              ? `usato ${alimento.utilizzi} ${alimento.utilizzi === 1 ? "volta" : "volte"}`
              : "mai usato"
          }}
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

    <template v-else-if="alimento">
      <UCard :ui="{ body: 'space-y-3 sm:p-4' }">
        <div class="grid grid-cols-[1.2fr_repeat(3,1fr)] gap-2">
          <div class="rounded-md bg-elevated px-3 py-2">
            <p class="text-lg font-bold tabular-nums text-highlighted">
              {{ formattaValore(alimento.valoriPer100.kcal) }}
            </p>
            <p class="text-xs text-muted">kcal / 100 {{ alimento.unitaBase }}</p>
          </div>
          <div v-for="m in macro" :key="m.chiave" class="rounded-md bg-elevated px-3 py-2">
            <p class="text-lg font-bold tabular-nums text-highlighted">
              {{ formattaValore(alimento.valoriPer100[m.chiave]) }}
            </p>
            <p class="flex items-center gap-1 text-xs text-muted">
              <span class="size-2 rounded-full" :class="coloriMacro[m.chiave]" />
              {{ m.sigla }} g
            </p>
          </div>
        </div>
        <div v-if="ripartizione" class="flex h-2.5 gap-0.5 rounded-full overflow-hidden">
          <span
            v-for="m in macro"
            :key="m.chiave"
            :class="coloriMacro[m.chiave]"
            :style="{ width: `${ripartizione[m.chiave]}%` }"
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <UBadge v-if="alimento.verificato" variant="soft" icon="i-lucide-badge-check">
            Verificato
          </UBadge>
          <UBadge v-if="alimento.archiviato" color="neutral" variant="soft" icon="i-lucide-archive">
            Archiviato
          </UBadge>
          <UBadge v-if="alimento.barcode" color="neutral" variant="outline" class="tabular-nums">
            {{ alimento.barcode }}
          </UBadge>
          <UBadge v-if="alimento.fonte === 'off'" color="neutral" variant="outline">
            Da Open Food Facts
          </UBadge>
        </div>
      </UCard>

      <template v-if="inModifica">
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
        <UAlert
          v-for="avviso in alimento.avvisi"
          :key="avviso"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="messaggiAvvisi[avviso] ?? avviso"
        />

        <UCard :ui="{ body: 'sm:p-4' }">
          <h2 class="text-sm font-semibold text-highlighted mb-2">Porzioni</h2>
          <ul v-if="alimento.porzioni.length" class="divide-y divide-default">
            <li
              v-for="p in alimento.porzioni"
              :key="p.id"
              class="flex items-center justify-between gap-2 py-2"
            >
              <span class="min-w-0 truncate">{{ p.nome }}</span>
              <span class="flex items-center gap-2 shrink-0 text-muted tabular-nums">
                <UBadge v-if="p.predefinita" variant="soft" size="sm">Predefinita</UBadge>
                {{ formattaValore(p.quantita) }} {{ alimento.unitaBase }}
              </span>
            </li>
          </ul>
          <p v-else class="text-sm text-muted">
            Nessuna porzione: nel diario si inserisce la quantità in {{ alimento.unitaBase }}.
          </p>
        </UCard>

        <UButton icon="i-lucide-pencil" size="xl" block @click="apriModifica">Modifica</UButton>
      </template>

      <div v-if="!inModifica" class="flex flex-col gap-2 pt-2 border-t border-default">
        <UButton
          :icon="alimento.archiviato ? 'i-lucide-archive-restore' : 'i-lucide-archive'"
          color="neutral"
          variant="outline"
          size="xl"
          block
          :disabled="inCorso"
          @click="archivia(!alimento.archiviato)"
        >
          {{ alimento.archiviato ? "Ripristina" : "Archivia" }}
        </UButton>
        <UButton
          v-if="alimento.eliminabile"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="xl"
          block
          :disabled="inCorso"
          @click="eliminaAlimento"
        >
          Elimina
        </UButton>
        <p class="text-sm text-muted text-center">
          {{
            alimento.archiviato
              ? "Archiviato: non compare nella tua ricerca. Gli altri lo vedono ancora."
              : "Archiviarlo lo nasconde solo dalla tua ricerca: gli altri lo vedono ancora."
          }}
          <template v-if="!alimento.eliminabile">
            Lo elimina solo chi l'ha creato, finché nessun diario lo usa.
          </template>
        </p>
      </div>
    </template>

    <div v-else class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-24 w-full rounded-lg" />
    </div>
  </UContainer>
</template>
