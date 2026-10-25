---
tipo: info
aggiornato: 2026-10-25
fonti:
  - raw/compiled/first-develop/analisi-iniziale-calorie-tracker.md
  - raw/compiled/first-develop/2026-10-25-decisioni-e-piano.md
---

# Prodotto

Applicazione **personale** (un solo utente) per tracciare ogni giorno calorie e macronutrienti. È una PWA installabile, usata soprattutto da Android, che funziona anche offline.

## Obiettivi

- Registrare rapidamente cosa si mangia, per pasto e per giorno.
- Calcolare kcal e macronutrienti a partire da grammi o porzioni.
- Costruire nel tempo una **base dati locale consolidata** degli alimenti abituali, riducendo la dipendenza da fonti esterne. Le regole sono in [Dati degli alimenti](./dati-alimenti.md).

## Non obiettivi (prima versione)

- Multi-utente, social, condivisione.
- Piani dietetici, consigli nutrizionali, obiettivi calcolati automaticamente.
- Micronutrienti dettagliati (vitamine, minerali).

## Requisiti funzionali dell'MVP

**Diario**
- Vista giornaliera divisa per pasti: Colazione, Pranzo, Cena, Spuntino (precaricati; nessuna schermata di configurazione nell'MVP).
- Aggiunta di una voce: alimento, quantità in grammi o in porzioni, pasto. Modifica ed eliminazione.
- Totali per pasto e per giorno: kcal, proteine, carboidrati, grassi.
- Navigazione tra i giorni.

**Ricerca e aggiunta alimenti**, in quest'ordine:
1. alimenti locali, ordinati per frequenza e recenza d'uso, con sezioni "Recenti" e "Più usati" in evidenza;
2. codice a barre, con la **fotocamera** o inserito a mano: prima nel nostro DB, poi presso il provider esterno;
3. ricerca testuale presso il provider (fase 2);
4. creazione manuale.

**Porzioni**: porzioni personalizzate per alimento (es. "1 vasetto = 125 g"); se il provider fornisce la porzione, viene proposta come predefinita.

**Backup**: export e import dei dati (JSON o CSV).

## Requisiti non funzionali

- **Offline-first**: diario e alimenti locali funzionano senza rete; la ricerca presso il provider esterno richiede la rete.
- **Inserimento rapido**: un alimento già noto si aggiunge in pochi tocchi.
- **Privacy**: dati solo locali o sul nostro back-end, nessuna telemetria.
- **Attribuzione**: l'app indica che parte dei dati viene da Open Food Facts (licenza ODbL).
- Interfaccia in italiano.

## Fasi

| Fase | Contenuto |
|---|---|
| **MVP** | Diario, alimenti manuali, lookup per barcode con import (anche da fotocamera), consolidamento locale, recenti e più usati, porzioni, totali, sync, backup |
| **Fase 2** | Ricette (ingredienti + peso finale, usate come alimenti), obiettivi kcal e macro impostati a mano, storico settimanale e mensile con grafici, ricerca testuale presso il provider |
| **Fase 3** | Import di tabelle generiche (CIQUAL, USDA, BDA), ri-sincronizzazione di un alimento dal provider con diff |

Ordine delle feature dell'MVP: `first-develop` (scaffolding), `auth`, `food-catalog`, `sync`, `foods`, `diary`, `barcode-scan`, `backup`, `deploy`, poi release `v0.1.0`.

## Domande aperte

- Formato di export/backup: JSON, CSV o entrambi; import in sostituzione o in unione con i dati esistenti.
