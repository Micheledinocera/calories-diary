# Progetto

Come è costruito e gestito il progetto: repo, stack, ambienti, git-flow, wiki.

- [Architettura](./architettura.md): componenti, flussi, ruolo del monorepo.
- [Server come fonte di verità, con le fonti esterne dietro il back-end](./decisione-server-fonte-di-verita.md): niente sync, offline solo in lettura, provider solo dal back-end · presa
- [Cache offline in sola lettura](./decisione-cache-offline.md): cosa tenere in locale per l'uso offline e come · in analisi
- [Local-first, con le fonti esterne dietro il back-end](./decisione-local-first.md): store locale con sync, provider solo dal back-end · superata
- [Autenticazione multiutente](./decisione-autenticazione.md): utenti da CLI, JWT Bearer di una settimana con rinnovo scorrevole, diario per utente · presa
- [Design](./design.md): design system su Claude Design, colori e loro significato, anello dei macro, tema chiaro/scuro.
- [Stack e strumenti](./stack.md): tecnologie, vincoli sulle versioni, server MCP.
- [Sviluppo, CI e ambienti](./sviluppo-e-ambienti.md): Docker locale, CI, ambienti e deploy previsti.
