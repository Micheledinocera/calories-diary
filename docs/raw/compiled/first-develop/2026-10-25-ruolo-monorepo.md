# Ruolo del monorepo e di packages/shared

Indicazione dell'utente (2026-10-25).

- Il monorepo serve soprattutto a **passare i tipi dal back-end al front-end**: `packages/shared` contiene i contratti dell'API (schemi zod e tipi dei DTO di richiesta e risposta).
- È improbabile che si condivida altro: ci sono solo la logica di back-end e lo storefront (la PWA), senza back-office né altri layer.
- Conseguenza: in `shared` vanno i contratti, non la logica di dominio. Le regole di business stanno nel back-end; il front-end usa i tipi e, dove serve, gli schemi zod per validare l'input prima di inviarlo.
