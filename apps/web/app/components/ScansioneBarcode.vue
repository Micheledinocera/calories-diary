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
  <UModal v-model:open="aperto" title="Scansiona il codice a barre" @after:enter="avvia">
    <template #body>
      <div class="space-y-3">
        <div class="relative aspect-[4/3] overflow-hidden rounded-md bg-black">
          <video ref="video" class="size-full object-cover" muted playsinline />
          <div
            v-if="!errore"
            class="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-md border-2 border-white/80"
          />
          <div v-if="avvio" class="absolute inset-0 flex items-center justify-center text-white">
            <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
          </div>
        </div>
        <UAlert
          v-if="errore"
          color="error"
          variant="subtle"
          icon="i-lucide-camera-off"
          :title="errore"
          :actions="[{ label: 'Riprova', onClick: avvia }]"
        />
        <p v-else class="text-sm text-muted">Inquadra il codice a barre dentro il riquadro.</p>
      </div>
    </template>
  </UModal>
</template>
