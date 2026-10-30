<script setup lang="ts">
import type { GiornoCondiviso, VistaCondivisa } from "@calories-diary/shared";

// Open to anyone with the link: no navigation of the app, and no place in search engines.
definePageMeta({ layout: false });
useHead({
  title: "Diario condiviso",
  meta: [{ name: "robots", content: "noindex" }],
});

const route = useRoute();
const condivisioni = useCondivisioni();
const token = route.params.token as string;

// No useAsyncData: it would replace the API error with a generic one, and the expired link needs
// its code.
const data = ref<VistaCondivisa | null>(null);
const errore = ref<ErroreNormalizzato | null>(null);
const inCaricamento = ref(false);

async function carica() {
  inCaricamento.value = true;
  errore.value = null;
  try {
    data.value = await condivisioni.vista(token);
  } catch (err) {
    errore.value = err as ErroreNormalizzato;
  } finally {
    inCaricamento.value = false;
  }
}
void carica();

const stato = (giorno: GiornoCondiviso) =>
  data.value?.obiettivi ? statoGiornata(giorno.totali, data.value.obiettivi) : null;

const kcal = (v: number) => formattaValore(Math.round(v));
const nomeGiorno = (giorno: string) => formattaGiorno(giorno).split(" ")[0]!.slice(0, 3);

const coloriMacro = {
  carboidrati: "bg-carboidrati",
  proteine: "bg-proteine",
  grassi: "bg-grassi",
} as const;

const selezionato = ref<string | null>(null);
const giorno = computed(() => {
  const giorni = data.value?.giorni ?? [];
  return giorni.find((g) => g.giorno === selezionato.value) ?? giornoIniziale(giorni);
});

const legenda = computed(() => {
  if (!giorno.value) return [];
  const { totali } = giorno.value;
  const quote = ripartizioneGiorno(totali);
  const grammi = data.value?.obiettivi ? obiettiviGrammi(data.value.obiettivi) : null;
  return macro.map((m) => {
    const obiettivo = grammi?.[m.chiave];
    return {
      ...m,
      valore: totali[m.chiave],
      obiettivo,
      sopra: obiettivo !== undefined && totali[m.chiave] > obiettivo,
      quota: Math.round(quote?.[m.chiave] ?? 0),
      colore: coloriMacro[m.chiave],
    };
  });
});
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-4">
    <h1 class="text-2xl font-bold text-highlighted">Diario alimentare</h1>

    <UAlert
      v-if="errore?.codice === 'NON_TROVATO'"
      color="neutral"
      variant="subtle"
      icon="i-lucide-link-2-off"
      title="Questo link non è più valido"
      description="È scaduto oppure è stato revocato da chi l'ha condiviso."
    />
    <UAlert
      v-else-if="errore"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="errore.messaggio"
      :actions="[{ label: 'Riprova', onClick: carica }]"
    />
    <div v-else-if="inCaricamento" class="space-y-3">
      <USkeleton class="h-20 w-full rounded-lg" />
      <USkeleton v-for="i in 3" :key="i" class="h-40 w-full rounded-lg" />
    </div>

    <template v-else-if="data">
      <p class="text-sm text-muted">
        {{ periodoCondiviso(data.da, data.a) }} · {{ testoScadenza(data.scadeIl) }}
      </p>

      <UCard :ui="{ body: 'sm:p-4' }">
        <div
          class="grid gap-1 text-center"
          :style="{ gridTemplateColumns: `repeat(${data.giorni.length}, minmax(0, 1fr))` }"
        >
          <button
            v-for="g in data.giorni"
            :key="g.giorno"
            type="button"
            class="flex flex-col items-center gap-1 rounded-md py-1 tabular-nums cursor-pointer"
            :class="g.giorno === giorno?.giorno && 'bg-elevated ring-1 ring-primary'"
            :aria-pressed="g.giorno === giorno?.giorno"
            :aria-label="formattaGiorno(g.giorno)"
            @click="selezionato = g.giorno"
          >
            <span class="text-xs font-semibold text-muted first-letter:uppercase">
              {{ nomeGiorno(g.giorno) }}
            </span>
            <span class="text-sm text-highlighted">{{ Number(g.giorno.slice(8)) }}</span>
            <span
              v-if="data.obiettivi"
              class="size-3 rounded-full"
              :class="stato(g) ? pallini[stato(g)!.tipo] : 'bg-transparent'"
            />
            <span class="text-xs text-muted">{{ g.pasti.length ? kcal(g.totali.kcal) : "–" }}</span>
          </button>
        </div>

        <div
          v-if="data.obiettivi"
          class="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[13px] text-muted"
        >
          <span
            v-for="(descrizione, tipo) in descrizioniStato"
            :key="tipo"
            class="inline-flex items-center gap-1.5"
          >
            <span class="size-3 rounded-full" :class="pallini[tipo]" />
            <span class="first-letter:uppercase">{{ descrizione }}</span>
          </span>
        </div>
      </UCard>

      <UCard v-if="giorno" :ui="{ body: 'space-y-3 sm:p-4' }">
        <div class="space-y-1">
          <h2 class="font-semibold text-highlighted first-letter:uppercase">
            {{ formattaGiorno(giorno.giorno) }}
          </h2>
          <StatoGiornata v-if="stato(giorno)" :stato="stato(giorno)!" />
        </div>

        <p v-if="!giorno.pasti.length" class="text-sm text-muted">Nessun alimento registrato.</p>
        <template v-else>
          <div class="flex items-center gap-4">
            <AnelloMacro
              piccolo
              :totali="giorno.totali"
              :fabbisogno="data.obiettivi?.fabbisogno ?? null"
            />
            <ul class="flex-1 min-w-0 space-y-1">
              <li v-for="m in legenda" :key="m.chiave" class="flex items-center gap-2">
                <div class="flex-1 min-w-0">
                  <span class="flex items-center gap-1.5 text-[13px] leading-4 text-muted">
                    <span class="size-2 shrink-0 rounded-full" :class="m.colore" />
                    {{ m.etichetta }}
                  </span>
                  <span
                    class="block pl-3.5 text-sm leading-5 font-semibold tabular-nums whitespace-nowrap"
                    :class="m.sopra ? 'text-warning' : 'text-highlighted'"
                  >
                    {{ kcal(m.valore) }}
                    <small class="text-xs font-normal text-muted">
                      {{ m.obiettivo ? `/ ${kcal(m.obiettivo)} g` : "g" }}
                    </small>
                  </span>
                </div>
                <span class="shrink-0 text-sm font-medium text-muted tabular-nums">
                  {{ m.quota }}%
                </span>
              </li>
            </ul>
          </div>

          <div v-for="(pasto, i) in giorno.pasti" :key="i" class="space-y-1">
            <div class="flex items-baseline justify-between gap-2">
              <h3 class="text-sm font-semibold text-highlighted">{{ nomiPasti[pasto.tipo] }}</h3>
              <span class="text-sm text-muted tabular-nums"
                >{{ kcal(pasto.totali.kcal) }} kcal</span
              >
            </div>
            <ul class="divide-y divide-default text-sm">
              <li
                v-for="(voce, j) in pasto.voci"
                :key="j"
                class="flex items-baseline justify-between gap-2 py-1"
              >
                <span class="min-w-0">
                  {{ voce.nome }}
                  <span v-if="voce.marca" class="text-muted">({{ voce.marca }})</span>
                  <span class="flex flex-wrap gap-x-2 text-xs text-muted tabular-nums">
                    <span>{{ formattaValore(voce.quantita) }} {{ voce.unitaBase }}</span>
                    <span v-for="m in macro" :key="m.chiave" class="inline-flex items-center gap-1">
                      <span class="size-1.5 rounded-full" :class="coloriMacro[m.chiave]" />
                      {{ m.sigla }} {{ formattaValore(voce.valori[m.chiave]) }}
                    </span>
                  </span>
                </span>
                <span class="shrink-0 tabular-nums">{{ kcal(voce.valori.kcal) }} kcal</span>
              </li>
            </ul>
          </div>
        </template>
      </UCard>
    </template>
  </UContainer>
</template>
