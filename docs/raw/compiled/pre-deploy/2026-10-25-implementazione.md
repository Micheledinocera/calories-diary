# Implementazione del nuovo design — pre-deploy

Design applicato a tutto il frontend tranne l'export, che verrà rifatto a parte (l'utente vuole ripensarlo: dettaglio di cosa si è mangiato a ogni pasto).

## Tema

- `app.config.ts`: `primary: "sky"`, `neutral: "slate"`, `success`/`warning`/`error` green/orange/red. Card con ombra leggera in chiaro, bordo in scuro; overlay di drawer e modali col token `velo`.
- `assets/css/main.css`: token del design system come variabili `--cd-*` (chiaro su `:root`, scuro su `.dark`), esposti a Tailwind come colori (`bg-sfondo`, `bg-ok`, `bg-ok-tenue`, `stroke-carboidrati`, `shadow-card`…). `--ui-primary` sky-700 in chiaro e sky-400 in scuro; testo di stato sui 700 in chiaro per il contrasto; `--ui-radius` 0.5rem (card 16px). Il fondo pagina è `sfondo`, le card `bg-default`.
- Font Figtree in `@theme` (`--font-sans`): `@nuxt/fonts` (incluso in Nuxt UI) lo scarica in build e lo serve dall'app.
- Tema chiaro/scuro/sistema con il color mode di Nuxt UI (`useColorMode`), scelta salvata sul dispositivo. `SelettoreTema` nel menu account e nel Profilo.
- PWA: `theme_color` `#0369a1`, `background_color` `#f1f5f9`; `public/logo.svg` ricolorato sul nuovo blu (le icone si rigenerano in build).

## Logica (`app/utils/diario.ts`, testata)

- `macro`: ordine unico carboidrati, proteine, grassi; `kcalPerGrammo`.
- `obiettiviGrammi(obiettivi)`: fabbisogno × % ÷ kcal per grammo; null senza fabbisogno.
- `statoGiornata(totali, obiettivi)`: `oltre` (kcal > fabbisogno, con l'eccesso), `attenzione` (kcal entro ma almeno un macro oltre il suo obiettivo in grammi, con i macro sforati), `ok`; null senza fabbisogno o senza niente mangiato. Stessa regola in giornata e calendario.
- `pastoPiuPesante(pasti)`: più kcal, il primo a parità. Mostrato solo se la giornata è oltre.
- `anelloMacro(totali, fabbisogno)`: spicchi come frazioni di giro (lunghezza = quota di fabbisogno mangiata, divisa per kcal dei macro), `extra` = eccesso come frazione di giro.

## Componenti e pagine

- Nuovi: `RiepilogoGiornata` (anello, legenda, stato, riga "Ha pesato di più…"), `AnelloMacro` (SVG), `StatoGiornata` (badge con icona e parola), `SelettoreTema`, `ControlloSegmentato`.
- `DiarioPasto`: etichetta "Più pesante" e kcal in rosso sul pasto più pesante; kcal arrotondate; ogni pasto ha l'ancora `pasto-<id>`.
- `SceltaAlimento`: `UDrawer` dal basso. Ricerca con pulsante di scansione: codice di un alimento già salvato → passo quantità, altrimenti `/alimenti/nuovo?barcode=…`, che lo cerca all'apertura. Passo quantità con chip delle porzioni (predefinita già scelta, più "100 g"), `UInputNumber` ±10, valori per quella quantità e come cambia la giornata (rosso se supera il fabbisogno).
- `ScansioneBarcode`: modale a schermo pieno su nero, con "Scrivi il codice a mano". Torcia non fatta (supporto browser incerto).
- `AlimentoRiga`: link o pulsante (con o senza `to`).
- Layout: tab a pillola fatte a mano (non più `UNavigationMenu`), menu account con `UPopover` (email, Profilo, Tema, Esci).
- Calendario: pallini con `statoGiornata` e legenda; senza fabbisogno nessun pallino e invito a impostarlo.
- Alimenti: filtro Attivi/Archiviati a chip, sezioni in card, scansione nella ricerca. Form alimento a card (Prodotto, Valori con "per 100 g / per 100 ml" segmentato e barra della ripartizione, Porzioni, verificato). Dettaglio con valori per 100, barra, badge, "usato N volte".
- Profilo: grammi obiettivo sotto ogni quota, barra, badge "Totale", "Valori consigliati", tema.
- Login: logo e card con `UAuthForm`.

## Seed demo

- `pnpm db:seed:demo <email>` (CLI `seed:demo`, `src/db/seeders/demo.seeder.ts`): per un utente già creato con `utente:crea` e senza alimenti; mai in produzione. Fabbisogno 2000, 50/30/20, 27 alimenti con porzioni, 35 giorni: per lo più entro, macro oltre ogni qualche giorno, oltre il sabato, due giorni vuoti, oggi solo colazione e pranzo.
- Test `apps/api/test/demo.test.ts`: ogni menu tipo dà lo stato dichiarato, il seed rifiuta utenti inesistenti o con alimenti.
