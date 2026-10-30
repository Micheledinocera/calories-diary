import { Migration } from "@mikro-orm/migrations";

export class Migration20261030100245_condivisioni extends Migration {
  override name = "Migration20261030100245_condivisioni";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "condivisione" ("id" uuid not null, "utente_id" uuid not null, "token" varchar(32) not null, "da" date not null, "a" date not null, "scade_il" timestamptz null, "dati" jsonb not null, "creato_il" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "condivisione" add constraint "condivisione_token_unique" unique ("token");`,
    );
    this.addSql(`create index "condivisione_utente_id_index" on "condivisione" ("utente_id");`);

    this.addSql(
      `alter table "condivisione" add constraint "condivisione_utente_id_foreign" foreign key ("utente_id") references "utente" ("id") on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "condivisione" cascade;`);
  }
}
