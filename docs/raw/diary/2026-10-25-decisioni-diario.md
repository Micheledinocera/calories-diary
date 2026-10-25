# Decisioni sul diario — diary

Risposte dell'utente alle domande aperte sul modello dei pasti del giorno.

1. **Spostare lo Spuntino**: può andare in qualsiasi posizione, anche tra gli altri pasti (es. tra Colazione e Pranzo).
2. **Modifica di un alimento**: i valori dei giorni passati si ricalcolano, non si congelano al momento della registrazione.
3. **Porzione**: le porzioni (pezzi, porzioni) restano nell'MVP, ma per adesso solo grammi e ml.
4. **Pasti vuoti**: aprendo un giorno senza registrazioni si vedono già Colazione, Pranzo e Cena vuoti, ognuno con "aggiungi alimento"; gli Spuntini si aggiungono con un bottone. In un pasto vuoto l'app può proporre gli alimenti dello stesso pasto del giorno prima, da accettare e modificare.
5. **Alimenti usati nel diario**: niente cancellazione definitiva, si archiviano (conseguenza del punto 2: i valori si leggono sempre dall'alimento).
6. **Valori congelati superati**: la regola "valori congelati" di `wiki/business/dati-alimenti.md` non vale più. Le voci del diario tengono solo alimento e quantità; kcal e macro si ricalcolano sempre dai valori attuali dell'alimento, anche per i giorni passati.
7. **Obiettivi ed equilibrio in questa feature**: fabbisogno calorico e rapporto carboidrati/grassi/proteine (proposta 50/30/20, modificabile) si fanno in `diary`. Il fabbisogno si imposta nella schermata utente, come valore unico dell'utente; in futuro forse uno storico anche del fabbisogno.
