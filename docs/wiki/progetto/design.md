---
tipo: info
aggiornato: 2026-10-27
fonti:
  - raw/compiled/pre-deploy/2026-10-25-tasks.md
  - raw/compiled/pre-deploy/2026-10-25-design.md
  - raw/compiled/pre-deploy/2026-10-25-implementazione.md
  - raw/compiled/ui-tweaks/2026-10-27-task.md
  - raw/compiled/ui-tweaks/2026-10-27-task2.md
---

# Design

Interfaccia pulita e silenziosa, ispirata a Yazio ma con meno decorazione: card bianche su un fondo grigio chiaro, numeri grandi, un grafico ad anello come firma.

## Dove sta

- **Design system** su Claude Design: https://claude.ai/artifact/HwnNi5FMYyAMJZyfRYuSNG. Token (colori in chiaro e scuro, tipografia, spazi, raggi, ombre), regole d'uso nel README e componenti con anteprima. È la fonte delle scelte grafiche: chi lavora sull'interfaccia parte da lì.
- **Schermate** su Claude Design: https://claude.ai/artifact/Mty5bPmmTMsFRLEtxNDn1s. Tutte le pagine dell'app a larghezza di telefono, alcune anche in tema scuro.
- Entrambi privati: si aprono solo se condivisi dal menu Share.
- Nel codice i token sono in `apps/web/app/assets/css/main.css` e `app.config.ts` (vedi [App web](../tecnico/web/app.md#tema)).

## Regole principali

- **Un colore, un significato.** Il blu (primario, sky) vuol dire "puoi toccare qui": pulsanti, link, tab attiva, oggi nel calendario. Verde, giallo e rosso dicono solo com'è andata la giornata (regola in [Prodotto](../business/prodotto.md)). Il primario era verde: è diventato blu perché si confondeva con il verde di stato. Lo stato intermedio era arancione: è diventato giallo perché nel calendario si confondeva con il rosso.
- **Lo stato si legge anche senza colore**: c'è sempre una parola o un'icona accanto.
- **Macro in tinte fredde**: carboidrati ciano, proteine viola, grassi rosa, sempre in quest'ordine, così non sembrano mai uno stato.
- **Anello dei macro**: la lunghezza colorata è la quota di fabbisogno già mangiata, divisa in spicchi per kcal di ciascun macro. Oltre il fabbisogno l'anello è pieno e un giro esterno sottile rosso mostra l'eccesso.
- **Font** Figtree, una sola famiglia; cifre tabellari dove i numeri si allineano.
- **Tema** chiaro, scuro o come il sistema (predefinito), scelto sul dispositivo dal menu account o dal Profilo.
- **Aggiungere un alimento** è l'azione più frequente: foglio dal basso, ricerca con scansione, porzioni come scorciatoie, anteprima prima di confermare.
- Testi in italiano, seconda persona, frasi brevi, niente emoji.

## Domande aperte

- **Export**: la schermata va ripensata (l'utente vuole vedere il dettaglio di cosa si è mangiato a ogni pasto); per ora resta com'era.
- **Torcia** nella scansione: proposta nel design, non fatta perché non tutti i browser la supportano.
- **Testo muted** nel tema chiaro: schiarito a `#8290a3` per scelta dell'utente. Su bianco ha un contrasto di circa 3,2:1 (meno di 3:1 sullo sfondo della pagina), sotto il 4,5:1 di WCAG AA per il testo piccolo; un compromesso sarebbe `#64748b` (circa 4,8:1). Da decidere se tenerlo.
