# Decisioni sul collegamento pasto-preferito — meals

Completano `2026-10-30-modifiche.md`, proposte dall'agente e applicate alla richiesta dell'utente.

- Il collegamento significa "questo pasto è identico al preferito". Si perde quando cambiano le voci del pasto (aggiunta, quantità, rimozione) e anche quando l'autore cambia le voci del preferito. Cambiare solo il nome del preferito non lo toglie.
- La stella piena su un preferito proprio lo elimina, con conferma in una modale: tutti i pasti collegati, anche di altri utenti, perdono il collegamento e il diario non cambia. Su un preferito altrui toglie solo il collegamento di quel pasto.
- Un preferito aggiunto saltando alimenti archiviati non collega il pasto, perché non è identico.
- La copia di una giornata e "Come ieri" non portano il collegamento.
- Nei giorni in sola lettura la stella piena si vede, ma non si tocca.
