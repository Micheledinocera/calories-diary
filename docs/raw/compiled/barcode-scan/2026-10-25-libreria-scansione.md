# Scansione con la fotocamera — libreria e scelte

Richiesta: un'icona nella ricerca per barcode di `pages/alimenti/nuovo.vue` apre una modale con la fotocamera accesa che legge il codice; la libreria deve essere la più stabile tra quelle gratuite.

## Libreria: `barcode-detector` (+ `zxing-wasm`)

- `barcode-detector` 3.2.3: ponyfill dell'API standard `BarcodeDetector` (Shape Detection API), basato su ZXing-C++ compilato in WebAssembly (`zxing-wasm` 3.1.6). Licenza MIT, rilasci regolari (ultimo ottobre 2026).
- Scartate: `html5-qrcode` (fermo dal 2023), `qr-scanner` (fermo dal 2022, solo QR), `@zxing/library` / `@zxing/browser` (porting JS di ZXing in manutenzione, più lento del C++ in wasm).
- Usiamo il **ponyfill**, non il `BarcodeDetector` nativo: stesso comportamento su tutti i browser (iOS Safari e Firefox non hanno l'API nativa).
- `zxing-wasm` è dipendenza diretta solo per importare il file `.wasm` con `?url`: con pnpm la dipendenza transitiva non è risolvibile dall'app. Va tenuto alla stessa versione usata da `barcode-detector`.

## Scelte

- Il `.wasm` (~950 KB, ~415 KB gzip) è servito dal nostro bundle (`prepareZXingModule` con `locateFile`), non dal CDN jsDelivr predefinito.
- Ponyfill e `.wasm` si caricano con `import()` solo all'apertura della modale: fuori dal bundle principale e fuori dal precache del service worker (la scansione serve solo online, perché il lookup passa dall'API).
- Formati letti: `ean_13`, `ean_8`, `upc_a`, `upc_e` (etichette alimentari). Si accetta il primo valore di sole cifre, come la ricerca a mano.
- Fotocamera posteriore (`facingMode: "environment"`), una lettura ogni 200 ms. Al primo codice valido la modale si chiude, il codice va nel campo e parte la ricerca.
- Errori di `getUserMedia` tradotti in messaggi italiani (permesso negato, nessuna fotocamera, fotocamera occupata), con "Riprova".
- `getUserMedia` richiede un contesto sicuro: funziona su `localhost` e in HTTPS, non da telefono su `http://<ip-lan>:3000`.

## Codice

- `app/components/ScansioneBarcode.vue`: modale con video e lettore.
- `app/utils/barcode.ts`: `FORMATI_BARCODE`, `codiceLetto`, `messaggioErroreFotocamera` (test in `test/barcode.test.ts`).
- Provato con Playwright: una fotocamera finta (canvas con un EAN-13 disegnato) legge `8076809513753`, la modale si chiude, parte il lookup e il form si precompila; con permesso negato compare l'errore.
