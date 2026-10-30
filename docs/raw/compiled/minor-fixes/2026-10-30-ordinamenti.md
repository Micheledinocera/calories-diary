# Ordinamenti e paginazione — scelte

## Alimenti

- Spariscono le sezioni "Recenti", "Più usati" e "Tutti": c'è un solo elenco completo, con l'ordinamento scelto dalla tendina.
- Ordinamenti: **Recenti** (default, ultimo uso nel diario), **Più usati**, **A-Z**, **Z-A**. Sostituiscono "ultimo inserimento", che per gli alimenti non c'è più.
- In "Recenti" compaiono anche gli alimenti mai usati, in fondo e per nome: l'elenco è sempre completo.

## Pasti preferiti

- Non hanno un dato d'uso, quindi restano **A-Z** (default), **Z-A**, **Più recenti**, **Meno recenti**. Qui "recenti" è la data di creazione del pasto.

## Paginazione

- `GET /alimenti` e `GET /pasti-preferiti` rispondono con `{ elementi, totale, pagina }` e accettano `pagina` e `limite`.
- Ordine e pagine sono calcolati sul server. Le schermate chiedono 20 elementi alla volta: su desktop (da 640 px) c'è la paginazione a numeri, su mobile l'infinite scroll.
- Le scelte nel diario (alimento, pasto preferito) non sono paginate: mostrano i primi risultati (50 alimenti, 100 pasti) come prima.
- Ordinamento e filtri non vengono ricordati: tornano al default riaprendo la pagina.
