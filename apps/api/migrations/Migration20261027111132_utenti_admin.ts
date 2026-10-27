import { Migration } from "@mikro-orm/migrations";

export class Migration20261027111132_utenti_admin extends Migration {
  override name = "Migration20261027111132_utenti_admin";

  override up(): void | Promise<void> {
    this.addSql(
      `alter table "utente" add "username" varchar(254) null, add "chiave_username" varchar(254) null, add "ruolo" text not null default 'utente', add "versione_sessione" int not null default 0;`,
    );
    // Existing users log in with their email as username; the optional email starts empty.
    this.addSql(`update "utente" set "username" = "email", "chiave_username" = lower("email");`);
    this.addSql(
      `alter table "utente" alter column "username" set not null, alter column "chiave_username" set not null;`,
    );
    this.addSql(`alter table "utente" alter column "email" drop not null;`);
    this.addSql(`update "utente" set "email" = null;`);
    this.addSql(
      `alter table "utente" add constraint "utente_chiave_username_unique" unique ("chiave_username");`,
    );
    this.addSql(
      `alter table "utente" add constraint "utente_ruolo_check" check ("ruolo" in ('admin', 'utente'));`,
    );
    // The owner, in production. Elsewhere it matches nobody: promote with `utente:admin <username>`.
    this.addSql(
      `update "utente" set "ruolo" = 'admin' where "chiave_username" = 'michele@gmail.com';`,
    );
  }

  /** Back to the email login: users without email get their username as email. */
  override down(): void | Promise<void> {
    this.addSql(`update "utente" set "email" = lower("username") where "email" is null;`);
    this.addSql(`alter table "utente" drop constraint "utente_chiave_username_unique";`);
    this.addSql(`alter table "utente" drop constraint "utente_ruolo_check";`);
    this.addSql(
      `alter table "utente" drop column "username", drop column "chiave_username", drop column "ruolo", drop column "versione_sessione";`,
    );
    this.addSql(`alter table "utente" alter column "email" set not null;`);
  }
}
