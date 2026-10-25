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
- Vista giornaliera divisa per pasti: Colazione, Pranzo, Cena, Spuntino (precaricati; nessuna schermata di configurazione nell'MVP).
- Aggiunta di una voce: alimento, quantità in grammi o in porzioni, pasto. Modifica ed eliminazione.
- Totali per pasto e per giorno: kcal, proteine, carboidrati, grassi.
- Navigazione tra i giorni.

**Obiettivi ed equilibrio** (in `diary`)
- **Fabbisogno calorico giornaliero** dell'utente, inserito a mano, confrontato con quanto consumato nella giornata.
- **Rapporto carboidrati/grassi/proteine**: l'app propone il valore indicativo **50/30/20**, modificabile a mano, e mostra il rapporto della giornata per far capire se la dieta è equilibrata.

**Storico** (in `diary`)
- Vista a **calendario** per il colpo d'occhio, poi il dettaglio giorno per giorno: stessa visualizzazione della pagina "Oggi", in sola lettura, con un tasto "Modifica".

**Ricerca e aggiunta alimenti**, in quest'ordine:
1. alimenti locali, ordinati per frequenza e recenza d'uso, con sezioni "Recenti" e "Più usati" in evidenza;
2. codice a barre, con la **fotocamera** o inserito a mano: prima nel nostro DB, poi presso il provider esterno;
3. ricerca testuale presso il provider (fase 2);
4. creazione manuale.

**Porzioni**: porzioni personalizzate per alimento (es. "1 vasetto = 125 g"); se il provider fornisce la porzione, viene proposta come predefinita.

**Backup**: export e import dei dati (JSON o CSV).

## Requisiti non funzionali

- **Offline in sola lettura**: senza rete si consultano i dati già scaricati, ma non si registra né si modifica nulla (vedi [Server come fonte di verità](../progetto/decisione-server-fonte-di-verita.md)).
- **Inserimento rapido**: un alimento già noto si aggiunge in pochi tocchi.
- **Privacy**: dati solo locali o sul nostro back-end, nessuna telemetria.
- **Attribuzione**: l'app indica che parte dei dati viene da Open Food Facts (licenza ODbL).
- Interfaccia in italiano.

## Fasi

| Fase | Contenuto |
|---|---|
| **MVP** | Diario, alimenti manuali, lookup per barcode con import (anche da fotocamera), consolidamento locale, recenti e più usati, porzioni, totali, fabbisogno e rapporto macro, storico a calendario, cache offline in sola lettura, backup |
| **Fase 2** | Ricette (ingredienti + peso finale, usate come alimenti), grafici dello storico, ricerca testuale presso il provider |
| **Fase 3** | Import di tabelle generiche (CIQUAL, USDA, BDA), ri-sincronizzazione di un alimento dal provider con diff |

Ordine delle feature dell'MVP: `first-develop` (scaffolding), `auth`, `food-catalog`, `offline-cache` (decisione, cache in analisi), `foods`, `diary`, `barcode-scan`, `backup`, `deploy`, poi release `v0.1.0`.

## Domande aperte

- La UI dell'MVP è provvisoria: flussi ed esperienza si validano con un giro di design verso la fine dell'MVP.

- Formato di export/backup: JSON, CSV o entrambi; import in sostituzione o in unione con i dati esistenti.
