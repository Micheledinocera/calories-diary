import { Migration } from "@mikro-orm/migrations";

export class Migration20261025132405_utenti extends Migration {
  override name = "Migration20261025132405_utenti";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "utente" ("id" uuid not null, "email" varchar(254) not null, "password_hash" varchar(255) not null, "creato_il" timestamptz not null, "aggiornato_il" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`alter table "utente" add constraint "utente_email_unique" unique ("email");`);

    // The shared meals from the old seed have no owner: each user gets their own (utente:crea, seed).
    this.addSql(`delete from "pasto";`);
    this.addSql(`alter table "pasto" drop constraint "pasto_nome_unique";`);
    this.addSql(`alter table "pasto" add "utente_id" uuid not null;`);
    this.addSql(
      `alter table "pasto" add constraint "pasto_utente_id_foreign" foreign key ("utente_id") references "utente" ("id") on delete cascade;`,
    );
    this.addSql(
      `alter table "pasto" add constraint "pasto_utente_id_nome_unique" unique ("utente_id", "nome");`,
    );
  }

  override down(): void | Promise<void> {
    // Per-user meals cannot become shared ones (the names would collide): they are dropped.
    this.addSql(`delete from "pasto";`);
    this.addSql(`alter table "pasto" drop constraint "pasto_utente_id_foreign";`);

    this.addSql(`drop table if exists "utente" cascade;`);

    this.addSql(`alter table "pasto" drop constraint "pasto_utente_id_nome_unique";`);
    this.addSql(`alter table "pasto" drop column "utente_id";`);
    this.addSql(`alter table "pasto" add constraint "pasto_nome_unique" unique ("nome");`);
  }
}
