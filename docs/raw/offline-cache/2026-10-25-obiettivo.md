# Obiettivo — sync

Continuiamo con l'MVP: feature `sync`, la quarta nell'ordine dell'MVP (dopo `first-develop`, `auth`, `food-catalog`).

Si parte dalla decisione [Local-first](../../wiki/progetto/decisione-local-first.md), che lascia aperti i dettagli del protocollo di sync "da definire nella feature `sync`". Già deciso lì: id UUID generati dal client, data di aggiornamento e cancellazione logica su ogni tabella sincronizzata, push/pull incrementale, in caso di conflitto vince l'ultima scrittura.
