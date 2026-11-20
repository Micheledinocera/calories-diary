# Implementazione — tag-system

## Regole scelte in implementazione (oltre alle [decisioni utente](./2026-11-20-decisioni-utente.md))

- Un tag si salva **normalizzato**: minuscolo, spazi iniziali e finali tolti, spazi ripetuti ridotti a uno. "Pre Allenamento " e "pre allenamento" sono lo stesso tag. Da 1 a 30 caratteri.
- Al massimo **10 tag** per pasto preferito; i doppioni contano una volta.
- Un tag che nessun pasto ha più **non si elenca** (né nel filtro né tra i suggerimenti): la riga resta nella tabella `tag` e torna in uso se qualcuno lo riscrive.
- Cambiare solo i tag di un preferito, come cambiarne solo il nome, **non toglie il collegamento** con i pasti del diario.
- "Salva come preferito" dal diario crea il pasto senza tag: si aggiungono dalla sua schermata.

## API

- Entità `Tag` (`tag`: `id`, `nome` varchar(30) unico) e relazione molti-a-molti `PastoPreferito.tags` (tabella `pasto_preferito_tags`, cascata su entrambe le FK). Migrazione `tag_pasti_preferiti`.
- `POST`/`PUT /pasti-preferiti`: campo `tags` (default `[]`); come le voci, il `PUT` li sostituisce per intero. I tag nuovi entrano nel vocabolario condiviso.
- DTO del pasto preferito: `tags` in ordine alfabetico.
- `GET /pasti-preferiti?tag=a&tag=b`: solo i pasti con **tutti** i tag (filtro in memoria, come ordinamento e paginazione).
- `GET /pasti-preferiti/tag`: `{ nome, pasti }[]`, i tag usati su tutti i pasti di tutti gli utenti, dal più usato, a pari conteggio A-Z. Rotta prima di `/:id`.
- Contratti in `packages/shared/src/pasti-preferiti.ts`: `tagSchema`, `tagUsatoSchema`; `NuovoPastoPreferito` è ora il tipo di input dello schema (`tags` facoltativo).

## Web

- `PastoPreferitoForm`: campo "Tag" con `UInputMenu` multiplo e `create-item`; suggerisce il vocabolario condiviso, normalizza il tag creato e svuota il testo dopo l'aggiunta.
- Dettaglio del preferito: i tag come badge sopra i valori.
- `FiltroTag` (nuovo): i 5 tag più usati sempre visibili, gli altri dietro "Altri tag (n)" che espande l'elenco ("Meno tag" lo richiude). Un tag scelto resta visibile anche se non è tra i 5. Usato nella schermata Pasti preferiti e nel drawer "Aggiungi preferito" del diario.

## Verifiche

- Test API in `test/pasti-preferiti.test.ts` (blocco "tag dei pasti preferiti" e collegamento con nome e tag cambiati).
- Provato nel browser con un utente temporaneo (poi eliminato): filtro AND, espansione, modifica con creazione, scelta da suggerimento e rimozione, elenco aggiornato tornando alla lista. Il drawer del diario usa lo stesso componente ma non è stato provato a mano.
