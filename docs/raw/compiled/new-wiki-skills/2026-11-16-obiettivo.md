# Obiettivo — new-wiki-skills

Facciamo un po' di modifiche alle skill e workflow della wiki.

## close

Facciamo 2 modifiche:
- Le pr devono venire chiuse automaticamente con uno squash e merge, e poi eliminato il branch di feature relativo. 
- L'ingest va fatto dopo la chiusura della feature, quindi va creata una feature apposta (nomenclatura *ingest-<nome-feature>*) con solo l'ingest e chiusa a sua volta con relativa pr automatica.