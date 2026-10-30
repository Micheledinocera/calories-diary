<script setup lang="ts">
import { CalendarDate, type DateValue } from "@internationalized/date";
import { MAX_GIORNI_EXPORT } from "@calories-diary/shared";

const diario = useDiario();
const condivisioni = useCondivisioni();
const toast = useToast();

const [a, m, g] = giornoLocale().split("-").map(Number) as [number, number, number];
const oggi = new CalendarDate(a, m, g);

// The last week up to today; no future days to export.
const intervallo = shallowRef<{ start: DateValue | undefined; end: DateValue | undefined }>({
  start: oggi.subtract({ days: MAX_GIORNI_EXPORT - 1 }),
  end: oggi,
});

const giorni = computed(() => {
  const { start, end } = intervallo.value;
  if (!start || !end) return [];
  const lista: string[] = [];
  for (let d = start; d.compare(end) <= 0; d = d.add({ days: 1 })) lista.push(d.toString());
  return lista;
});

const markdown = ref("");
const inCorso = ref(false);

// A new range makes the preview stale.
watch(giorni, () => (markdown.value = ""));

async function genera() {
  inCorso.value = true;
  try {
    // At most a week: one call per day, in parallel.
    const [obiettivi, ...giornate] = await Promise.all([
      diario.obiettivi(),
      ...giorni.value.map((giorno) => diario.giornata(giorno)),
    ]);
    markdown.value = markdownDiario(giornate, obiettivi);
  } catch (err) {
    const errore = err as ErroreNormalizzato;
    toast.add({ title: errore.messaggio, color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    inCorso.value = false;
  }
}

const nomeFile = computed(() => {
  const lista = giorni.value;
  return lista.length > 1 ? `diario-${lista[0]}_${lista.at(-1)}.md` : `diario-${lista[0]}.md`;
});

const file = () => new File([markdown.value], nomeFile.value, { type: "text/markdown" });

function scarica() {
  const url = URL.createObjectURL(file());
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeFile.value;
  link.click();
  URL.revokeObjectURL(url);
}

const condivisioneAperta = ref(false);
const { data: link, refresh: aggiornaLink } = useAsyncData("condivisioni", () =>
  condivisioni.elenca(),
);

async function revoca(id: string) {
  if (!confirm("Revocare il link? Chi lo ha ricevuto non potrà più aprirlo.")) return;
  try {
    await condivisioni.revoca(id);
    toast.add({ title: "Link revocato", color: "success", icon: "i-lucide-check" });
    await aggiornaLink();
  } catch (err) {
    const errore = err as ErroreNormalizzato;
    toast.add({ title: errore.messaggio, color: "error", icon: "i-lucide-circle-alert" });
  }
}

async function copia() {
  try {
    await navigator.clipboard.writeText(markdown.value);
    toast.add({ title: "Copiato negli appunti", color: "success", icon: "i-lucide-check" });
  } catch {
    toast.add({ title: "Copia non riuscita", color: "error", icon: "i-lucide-circle-alert" });
  }
}
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-4">
    <div>
      <h1 class="text-2xl font-bold text-highlighted">Esporta</h1>
      <NuxtLink to="/diario" class="text-sm text-muted">Calendario</NuxtLink>
    </div>

    <p class="text-sm text-muted">
      Scegli i giorni (al massimo {{ MAX_GIORNI_EXPORT }}): l'export è un file markdown con cosa hai
      mangiato, kcal e macro di ogni alimento e i totali di ogni giorno rispetto agli obiettivi.
    </p>

    <UCalendar
      v-model="intervallo"
      range
      :maximum-days="MAX_GIORNI_EXPORT"
      :max-value="oggi"
      :year-controls="false"
      class="w-full"
      size="lg"
    />

    <UButton
      icon="i-lucide-file-text"
      block
      :loading="inCorso"
      :disabled="!giorni.length"
      @click="genera"
    >
      {{
        giorni.length
          ? `Genera export di ${giorni.length} ${giorni.length === 1 ? "giorno" : "giorni"}`
          : "Scegli i giorni"
      }}
    </UButton>

    <template v-if="markdown">
      <div class="flex flex-wrap gap-2">
        <UButton icon="i-lucide-share-2" @click="condivisioneAperta = true">Condividi</UButton>
        <UButton icon="i-lucide-download" variant="subtle" @click="scarica">Scarica .md</UButton>
        <UButton icon="i-lucide-copy" variant="subtle" color="neutral" @click="copia">
          Copia
        </UButton>
      </div>
      <pre
        class="text-xs whitespace-pre-wrap break-words bg-elevated rounded-md p-3 max-h-[60vh] overflow-auto"
        >{{ markdown }}</pre>
      <ModaleCondivisione
        v-model:open="condivisioneAperta"
        :da="giorni[0]!"
        :a="giorni.at(-1)!"
        @creata="aggiornaLink"
      />
    </template>

    <section v-if="link?.length" class="space-y-2">
      <h2 class="font-semibold text-highlighted">Link attivi</h2>
      <UCard :ui="{ body: 'py-0 sm:py-0 sm:px-4' }">
        <div class="divide-y divide-default">
          <div v-for="l in link" :key="l.id" class="flex items-center gap-2 py-3 min-h-14">
            <div class="flex-1 min-w-0">
              <p class="truncate font-medium text-highlighted">
                {{ periodoCondiviso(l.da, l.a) }}
              </p>
              <p class="text-xs text-muted">{{ testoScadenza(l.scadeIl) }}</p>
            </div>
            <UButton
              icon="i-lucide-copy"
              variant="ghost"
              color="neutral"
              aria-label="Copia link"
              @click="condivisioni.copiaLink(l.token)"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              aria-label="Revoca link"
              @click="revoca(l.id)"
            />
          </div>
        </div>
      </UCard>
    </section>
  </UContainer>
</template>
