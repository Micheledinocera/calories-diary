# Decisioni sulle segnalazioni — ui-tweaks

Risposte dell'utente alle domande aperte da `2026-10-27-task.md`.

## Deploy

- Il deploy parte **solo da `main`**, cioè quando si chiude una release (o un hotfix). Niente build su `develop`, feature, preview delle PR: tutto il resto si prova in locale.

## Alimenti condivisi

- Il pool degli alimenti è **condiviso** tra tutti gli utenti; i pasti restano del singolo utente.
- **Modifica**: chiunque può modificare un alimento, per tutti.
- **Eliminazione**: solo l'autore, e solo se l'alimento non è usato nel diario di nessuno.
- **Archiviazione**: chiunque, ma vale solo per sé ("nascondi per me").
- **Recenti e Più usati**: restano per utente.
- **Dati esistenti**: i doppioni con lo stesso barcode tra utenti diversi si uniscono, tenendo quello aggiornato più di recente e spostandoci voci del diario e utilizzi.
