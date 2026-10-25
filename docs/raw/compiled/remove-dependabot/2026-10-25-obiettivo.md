# Obiettivo — remove-dependabot

Togliere del tutto Dependabot. Abbiamo troppe cose interconnesse, quindi fissiamo le versioni che vanno bene e poi ogni "tot" facciamo dei check di versione e decidiamo se portarci qualcosa dietro. Da questo momento in poi non devono più esserci PR automatiche di aggiornamento.

Contesto (25/10/2026): prima della rimozione è stata unita la PR #2 di Dependabot (gruppo nuxt: `@vite-pwa/assets-generator` 2.0.0, `vite-plugin-pwa` 2.0.0, CI verde) ed è stata chiusa la #3 (`@types/node` 26, non allineato al runtime Node 24).
