# Obiettivo — workflows-main-only

Da develop non deve partire niente: non c'è niente collegato e non serve a niente. I deploy partono solo ed esclusivamente da main dopo le release. Anche i tag sono solo per maggiore leggibilità umana, ma non servono a niente per il deploy.

## Contesto

- Dopo [ci-skip-merge-tag](../compiled/ci-skip-merge-tag/) (che saltava solo il merge del tag in develop), il merge di ogni PR su develop faceva ancora partire CI (ripetuta, già girata sulla PR) e Deploy API (job saltato, staging spento, ma il run resta in lista e in coda).
