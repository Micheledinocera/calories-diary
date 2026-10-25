---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/analisi-iniziale-calorie-tracker.md
  - raw/compiled/first-develop/2026-10-25-decisioni-e-piano.md
  - raw/compiled/auth/2026-10-25-decisioni-utente.md
  - raw/compiled/food-catalog/2026-10-25-obiettivo.md
  - raw/compiled/offline-cache/2026-10-25-decisione-niente-sync.md
  - raw/compiled/foods/2026-10-25-note-ui-ux.md
  - raw/compiled/foods/2026-10-25-decisioni-utente.md
  - raw/compiled/diary/2026-10-25-obiettivo.md
  - raw/compiled/diary/2026-10-25-decisioni-diario.md
  - raw/compiled/export/2026-10-25-obiettivo.md
  - raw/compiled/export/2026-10-25-decisioni-utente.md
  - raw/compiled/pre-deploy/2026-10-25-tasks.md
  - raw/compiled/pre-deploy/2026-10-25-design.md
---

# Prodotto

Applicazione **personale** per tracciare ogni giorno calorie e macronutrienti. È una PWA installabile, usata soprattutto da Android; offline si possono consultare i dati già scaricati. Può essere resa disponibile a qualche amico, ognuno per uso personale e con i propri dati (vedi [Autenticazione multiutente](../progetto/decisione-autenticazione.md)).

## Obiettivi

- Registrare rapidamente cosa si mangia, per pasto e per giorno.
- Calcolare kcal e macronutrienti a partire da grammi o porzioni.
- Costruire nel tempo una **base dati locale consolidata** degli alimenti abituali, riducendo la dipendenza da fonti esterne. Le regole sono in [Dati degli alimenti](./dati-alimenti.md).

## Non obiettivi (prima versione)

- Qualsiasi interazione social o condivisione tra utenti: ognuno vede solo i propri dati.
- Piani dietetici.
- Micronutrienti dettagliati (vitamine, minerali). Nell'MVP si tracciano solo kcal e macro (carboidrati, grassi, proteine).

## Requisiti funzionali dell'MVP

**Diario**
- Pagina **"Oggi"** divisa per pasti, in quest'ordine: Colazione, Pranzo, Cena (tipi fissi; nessuna schermata di configurazione nell'MVP).
- Colazione, Pranzo e Cena: **uno per giorno**, visibili vuoti anche prima di aggiungerli. Lo **Spuntino** può essere più di uno, si aggiunge con un bottone e si **sposta** in qualsiasi posizione, anche tra gli altri pasti (drag and drop). Gli altri pasti restano nel loro ordine.
- In un pasto vuoto l'app propone gli alimenti dello stesso pasto del giorno prima, da accettare e poi modificare.
- Aggiunta di una voce: alimento e quantità, sempre **in grammi o ml**. Le porzioni dell'alimento sono scorciatoie che impostano la quantità (la predefinita è già scelta); prima di confermare si vedono kcal e macro di quella quantità e come cambia la giornata. Modifica della quantità ed eliminazione.
- Calcolo automatico di kcal e macro; totali per pasto e per giorno: kcal, proteine, carboidrati, grassi.
- Navigazione tra i giorni.

**Obiettivi ed equilibrio** (in `diary`)
- **Fabbisogno calorico giornaliero** dell'utente, inserito a mano nella **schermata utente** (Profilo), confrontato con quanto consumato nella giornata. È un valore unico, che vale per tutti i giorni; in futuro forse uno storico.
- **Rapporto carboidrati/grassi/proteine**: l'app propone il valore indicativo **50/30/20**, modificabile a mano, e mostra il rapporto della giornata per far capire se la dieta è equilibrata.
- **Obiettivo in grammi** di ogni macro: fabbisogno × quota ÷ kcal per grammo (4 per carboidrati e proteine, 9 per i grassi). Con 2000 kcal e 50/30/20: 250 g di carboidrati, 100 g di proteine, 67 g di grassi.
- **Stato della giornata**, uguale nella giornata e nel calendario, sempre con colore e parola:
  - **verde** (entro il fabbisogno): kcal ≤ fabbisogno e ogni macro entro il suo obiettivo in grammi;
  - **arancione** (macro oltre l'obiettivo): kcal ≤ fabbisogno, ma almeno un macro oltre il suo obiettivo;
  - **rosso** (oltre il fabbisogno): kcal > fabbisogno.
  Senza fabbisogno impostato non c'è stato.
- **Pasto più pesante**: solo quando la giornata è oltre il fabbisogno, l'app segnala il pasto con più kcal (a parità, il primo della giornata), con la sua quota sul totale.

**Storico** (in `diary`)
- Vista a **calendario** per il colpo d'occhio (un pallino per giorno nel colore del suo stato), poi il dettaglio giorno per giorno: stessa identica visualizzazione della pagina "Oggi", in sola lettura, con un tasto "Modifica".

**Ricerca e aggiunta alimenti**, in quest'ordine:
1. alimenti locali, ordinati per frequenza e recenza d'uso, con sezioni "Recenti" e "Più usati" in evidenza;
2. codice a barre, con la **fotocamera** o inserito a mano: prima nel nostro DB, poi presso il provider esterno;
3. ricerca testuale presso il provider (fase 2);
4. creazione manuale.

**Porzioni**: porzioni personalizzate per alimento (es. "1 vasetto = 125 g"); se il provider fornisce la porzione, viene proposta come predefinita.

**Export di condivisione** (in `export`): si sceglie un intervallo di giorni, **al massimo una settimana**, e si ottiene un file **markdown**, facile da mandare in giro o da convertire in PDF. Contiene gli obiettivi (fabbisogno e ripartizione dei macro), un riepilogo dei giorni e, per ogni giorno, i totali di consumo rispetto agli obiettivi e il dettaglio di cosa si è mangiato per pasto, con kcal e macro di ogni alimento. Lo genera il front-end dai dati del diario.

**Niente backup nell'app**: non c'è export/import dei dati in JSON o CSV. Il requisito veniva dall'analisi iniziale local-first, quando i dati stavano solo sul dispositivo; con il [server come fonte di verità](../progetto/decisione-server-fonte-di-verita.md) i dati stanno in PostgreSQL, e la protezione dai guasti è un backup del database lato server, da trattare nel `deploy`.

## Requisiti non funzionali

- **Offline in sola lettura**: senza rete si consultano i dati già scaricati, ma non si registra né si modifica nulla (vedi [Server come fonte di verità](../progetto/decisione-server-fonte-di-verita.md)).
- **Inserimento rapido**: un alimento già noto si aggiunge in pochi tocchi.
- **Privacy**: dati solo locali o sul nostro back-end, nessuna telemetria.
- **Attribuzione**: l'app indica che parte dei dati viene da Open Food Facts (licenza ODbL).
- Interfaccia in italiano, tema chiaro, scuro o come il sistema. Linee guida grafiche in [Design](../progetto/design.md).

## Fasi

| Fase | Contenuto |
|---|---|
| **MVP** | Diario, alimenti manuali, lookup per barcode con import (anche da fotocamera), consolidamento locale, recenti e più usati, porzioni, totali, fabbisogno e rapporto macro, storico a calendario, cache offline in sola lettura, export di condivisione in markdown |
| **Fase 2** | Ricette (ingredienti + peso finale, usate come alimenti), grafici dello storico, ricerca testuale presso il provider |
| **Fase 3** | Import di tabelle generiche (CIQUAL, USDA, BDA), ri-sincronizzazione di un alimento dal provider con diff |

Ordine delle feature dell'MVP: `first-develop` (scaffolding), `auth`, `food-catalog`, `offline-cache` (decisione, cache in analisi), `foods`, `diary`, `barcode-scan`, `export`, `deploy` (con il backup del database), poi release `v0.1.0`.

## Domande aperte

- La UI dell'MVP è provvisoria: flussi ed esperienza si validano con un giro di design verso la fine dell'MVP.
