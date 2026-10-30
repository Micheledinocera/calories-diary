import { Migration } from "@mikro-orm/migrations";

export class Migration20261030105251_pasti_preferiti extends Migration {
  override name = "Migration20261030105251_pasti_preferiti";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "pasto_preferito" ("id" uuid not null, "autore_id" uuid not null, "nome" varchar(100) not null, "creato_il" timestamptz not null, "aggiornato_il" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `create index "pasto_preferito_autore_id_index" on "pasto_preferito" ("autore_id");`,
    );

    this.addSql(
      `create table "voce_preferita" ("id" uuid not null, "pasto_preferito_id" uuid not null, "alimento_id" uuid not null, "quantita" numeric(10,3) not null, "ordine" int not null, primary key ("id"));`,
    );
    this.addSql(
      `create index "voce_preferita_pasto_preferito_id_index" on "voce_preferita" ("pasto_preferito_id");`,
    );
    this.addSql(
      `create index "voce_preferita_alimento_id_index" on "voce_preferita" ("alimento_id");`,
    );

    this.addSql(
      `alter table "pasto_preferito" add constraint "pasto_preferito_autore_id_foreign" foreign key ("autore_id") references "utente" ("id") on delete cascade;`,
    );

    this.addSql(
      `alter table "voce_preferita" add constraint "voce_preferita_pasto_preferito_id_foreign" foreign key ("pasto_preferito_id") references "pasto_preferito" ("id") on delete cascade;`,
    );
    this.addSql(
      `alter table "voce_preferita" add constraint "voce_preferita_alimento_id_foreign" foreign key ("alimento_id") references "alimento" ("id");`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "voce_preferita" drop constraint "voce_preferita_pasto_preferito_id_foreign";`,
    );

    this.addSql(`drop table if exists "pasto_preferito" cascade;`);
    this.addSql(`drop table if exists "voce_preferita" cascade;`);
  }
}
