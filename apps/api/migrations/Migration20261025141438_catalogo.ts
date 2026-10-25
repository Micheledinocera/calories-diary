import { Migration } from "@mikro-orm/migrations";

export class Migration20261025141438_catalogo extends Migration {
  override name = "Migration20261025141438_catalogo";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "prodotto_catalogo" ("id" uuid not null, "barcode" varchar(14) not null, "fonte" text not null, "id_fonte" varchar(50) not null, "nome" varchar(255) null, "marca" varchar(255) null, "unita_base" text not null, "kcal" numeric(10,3) null, "proteine" numeric(10,3) null, "carboidrati" numeric(10,3) null, "grassi" numeric(10,3) null, "zuccheri" numeric(10,3) null, "grassi_saturi" numeric(10,3) null, "fibre" numeric(10,3) null, "sale" numeric(10,3) null, "porzione_descrizione" varchar(100) null, "porzione_quantita" numeric(10,3) null, "immagine_url" varchar(500) null, "importato_il" timestamptz not null, "aggiornato_il" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "prodotto_catalogo" add constraint "prodotto_catalogo_barcode_unique" unique ("barcode");`,
    );

    this.addSql(
      `alter table "prodotto_catalogo" add constraint "prodotto_catalogo_fonte_check" check ("fonte" in ('off'));`,
    );
    this.addSql(
      `alter table "prodotto_catalogo" add constraint "prodotto_catalogo_unita_base_check" check ("unita_base" in ('g', 'ml'));`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "prodotto_catalogo" cascade;`);
  }
}
