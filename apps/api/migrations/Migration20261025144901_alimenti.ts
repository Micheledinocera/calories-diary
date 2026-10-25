import { Migration } from "@mikro-orm/migrations";

export class Migration20261025144901_alimenti extends Migration {
  override name = "Migration20261025144901_alimenti";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "alimento" ("id" uuid not null, "utente_id" uuid not null, "nome" varchar(255) not null, "marca" varchar(255) null, "barcode" varchar(14) null, "fonte" text not null, "prodotto_catalogo_id" uuid null, "unita_base" text not null, "kcal" numeric(10,3) not null, "proteine" numeric(10,3) not null, "carboidrati" numeric(10,3) not null, "grassi" numeric(10,3) not null, "verificato" boolean not null default false, "archiviato" boolean not null default false, "ultimo_uso" timestamptz null, "utilizzi" int not null default 0, "importato_il" timestamptz null, "creato_il" timestamptz not null, "aggiornato_il" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "alimento" add constraint "alimento_utente_id_barcode_unique" unique ("utente_id", "barcode");`,
    );

    this.addSql(
      `create table "porzione" ("id" uuid not null, "alimento_id" uuid not null, "nome" varchar(50) not null, "quantita" numeric(10,3) not null, "predefinita" boolean not null default false, primary key ("id"));`,
    );
    this.addSql(`create index "porzione_alimento_id_index" on "porzione" ("alimento_id");`);

    this.addSql(
      `alter table "alimento" add constraint "alimento_utente_id_foreign" foreign key ("utente_id") references "utente" ("id") on delete cascade;`,
    );
    this.addSql(
      `alter table "alimento" add constraint "alimento_prodotto_catalogo_id_foreign" foreign key ("prodotto_catalogo_id") references "prodotto_catalogo" ("id") on delete set null;`,
    );
    this.addSql(
      `alter table "alimento" add constraint "alimento_fonte_check" check ("fonte" in ('manuale', 'off'));`,
    );
    this.addSql(
      `alter table "alimento" add constraint "alimento_unita_base_check" check ("unita_base" in ('g', 'ml'));`,
    );

    this.addSql(
      `alter table "porzione" add constraint "porzione_alimento_id_foreign" foreign key ("alimento_id") references "alimento" ("id") on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "porzione" drop constraint "porzione_alimento_id_foreign";`);

    this.addSql(`drop table if exists "alimento" cascade;`);
    this.addSql(`drop table if exists "porzione" cascade;`);
  }
}
