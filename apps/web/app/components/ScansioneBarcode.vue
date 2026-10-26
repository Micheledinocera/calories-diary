<script setup lang="ts">
const aperto = defineModel<boolean>("open", { required: true });
const emit = defineEmits<{ letto: [codice: string] }>();

const video = useTemplateRef<HTMLVideoElement>("video");
const errore = ref<string | null>(null);
const avvio = ref(false);

let stream: MediaStream | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
// Bumped on every stop: a start still awaiting the camera knows it is stale.
let sessione = 0;

// Interval between two reads: enough for a framed label, light on the CPU.
const INTERVALLO_MS = 200;

async function creaLettore() {
  // Loaded only when scanning: the ponyfill and its .wasm (~1 MB) stay out of the main bundle.
  const [{ BarcodeDetector, prepareZXingModule }, { default: urlWasm }] = await Promise.all([
    import("barcode-detector/ponyfill"),
    import("zxing-wasm/reader/zxing_reader.wasm?url"),
  ]);
  // The .wasm is served by us, not by the default jsDelivr CDN.
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? urlWasm : prefix + path,
    },
  });
  return new BarcodeDetector({ formats: [...FORMATI_BARCODE] });
}

async function avvia() {
  const corrente = ++sessione;
  errore.value = null;
  avvio.value = true;
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Fotocamera non supportata");
    }
    const [lettore, s] = await Promise.all([
      creaLettore(),
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }),
    ]);
    if (corrente !== sessione || !video.value) {
      s.getTracks().forEach((t) => t.stop());
      return;
    }
    stream = s;
    video.value.srcObject = s;
    await video.value.play();
    avvio.value = false;
    leggi(lettore, corrente);
  } catch (err) {
    if (corrente !== sessione) return;
    avvio.value = false;
    errore.value = messaggioErroreFotocamera(err);
  }
}

function leggi(lettore: Awaited<ReturnType<typeof creaLettore>>, corrente: number) {
  timer = setTimeout(async () => {
    if (corrente !== sessione || !video.value) return;
    try {
      const codice = codiceLetto(await lettore.detect(video.value));
      if (codice && corrente === sessione) {
        ferma();
        aperto.value = false;
        emit("letto", codice);
        return;
      }
    } catch {
      // Frame not ready yet: try again on the next one.
    }
    leggi(lettore, corrente);
  }, INTERVALLO_MS);
}

function ferma() {
  sessione++;
  clearTimeout(timer);
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  if (video.value) video.value.srcObject = null;
}

watch(aperto, (valore) => {
  if (!valore) ferma();
});
onBeforeUnmount(ferma);
</script>

<template>
  <!-- Full screen on a black ground, whatever the theme: it is a camera viewfinder. -->
  <UModal
    v-model:open="aperto"
    fullscreen
    title="Scansiona il codice a barre"
    :ui="{ content: 'bg-black text-white ring-0', header: 'hidden', body: 'p-0 sm:p-0 relative' }"
    @after:enter="avvia"
  >
    <template #body>
      <div class="absolute inset-0">
        <video ref="video" class="size-full object-cover" muted playsinline />
        <div
          v-if="!errore"
          class="pointer-events-none absolute inset-x-10 top-1/2 h-44 -translate-y-1/2 rounded-2xl border-[3px] border-white shadow-[0_0_0_200vmax_rgb(0_0_0/0.5)]"
        />
        <div v-if="avvio" class="absolute inset-0 flex items-center justify-center">
          <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
        </div>
      </div>

      <div class="absolute inset-x-0 top-0 flex items-center gap-2 bg-black/55 px-4 py-3">
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          size="lg"
          class="text-white hover:bg-white/15"
          aria-label="Chiudi la scansione"
          @click="aperto = false"
        />
        <h2 class="flex-1 text-[17px] font-semibold">Scansiona il codice a barre</h2>
      </div>

      <div class="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 px-4 pt-6 pb-10">
        <UAlert
          v-if="errore"
          color="error"
          variant="solid"
          icon="i-lucide-camera-off"
          :title="errore"
          :actions="[{ label: 'Riprova', color: 'neutral', variant: 'solid', onClick: avvia }]"
        />
        <p v-else class="text-center text-[15px] text-slate-200">
          Inquadra il codice a barre dentro il riquadro.<br />
          Lo leggiamo da soli, non serve toccare.
        </p>
        <UButton
          icon="i-lucide-keyboard"
          color="neutral"
          size="lg"
          class="rounded-full bg-white/15 text-white hover:bg-white/25"
          @click="aperto = false"
        >
          Scrivi il codice a mano
        </UButton>
      </div>
    </template>
  </UModal>
</template>
