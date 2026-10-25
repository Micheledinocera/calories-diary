import { Migration } from "@mikro-orm/migrations";

export class Migration20261025154039_diario extends Migration {
  override name = "Migration20261025154039_diario";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "voce" ("id" uuid not null, "pasto_id" uuid not null, "alimento_id" uuid not null, "quantita" numeric(10,3) not null, "creato_il" timestamptz not null, "aggiornato_il" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "voce_pasto_id_index" on "voce" ("pasto_id");`);
    this.addSql(`create index "voce_alimento_id_index" on "voce" ("alimento_id");`);

    this.addSql(
      `alter table "utente" add "fabbisogno" int null, add "quota_carboidrati" int not null default 50, add "quota_grassi" int not null default 30, add "quota_proteine" int not null default 20;`,
    );

    // The old rows were the per-user list of meal types, now fixed in code: no day to move them to.
    this.addSql(`delete from "pasto";`);
    this.addSql(`alter table "pasto" drop constraint "pasto_utente_id_nome_unique";`);
    this.addSql(`alter table "pasto" drop column "nome";`);
    this.addSql(`alter table "pasto" add "giorno" date not null, add "tipo" text not null;`);
    this.addSql(`create index "pasto_utente_id_giorno_index" on "pasto" ("utente_id", "giorno");`);
    this.addSql(
      `alter table "pasto" add constraint "pasto_tipo_check" check ("tipo" in ('colazione', 'pranzo', 'cena', 'spuntino'));`,
    );
    // At most one colazione, pranzo and cena per user and day; any number of snacks.
    this.addSql(
      `create unique index "pasto_utente_id_giorno_tipo_unique" on "pasto" ("utente_id", "giorno", "tipo") where "tipo" <> 'spuntino';`,
    );
    this.addSql(
      `alter table "utente" add constraint "utente_quote_check" check ("quota_carboidrati" + "quota_grassi" + "quota_proteine" = 100);`,
    );

    this.addSql(
      `alter table "voce" add constraint "voce_pasto_id_foreign" foreign key ("pasto_id") references "pasto" ("id") on delete cascade;`,
    );
    this.addSql(
      `alter table "voce" add constraint "voce_alimento_id_foreign" foreign key ("alimento_id") references "alimento" ("id");`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "voce" cascade;`);

    this.addSql(`delete from "pasto";`);
    this.addSql(`drop index "pasto_utente_id_giorno_tipo_unique";`);
    this.addSql(`drop index "pasto_utente_id_giorno_index";`);
    this.addSql(`alter table "pasto" drop constraint "pasto_tipo_check";`);
    this.addSql(`alter table "pasto" drop column "giorno", drop column "tipo";`);
    this.addSql(`alter table "pasto" add "nome" varchar(50) not null;`);
    this.addSql(
      `alter table "pasto" add constraint "pasto_utente_id_nome_unique" unique ("utente_id", "nome");`,
    );

    this.addSql(`alter table "utente" drop constraint "utente_quote_check";`);
    this.addSql(
      `alter table "utente" drop column "fabbisogno", drop column "quota_carboidrati", drop column "quota_grassi", drop column "quota_proteine";`,
    );
  }
}
