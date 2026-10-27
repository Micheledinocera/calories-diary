import { Migration } from "@mikro-orm/migrations";

export class Migration20261027093932_alimenti_condivisi extends Migration {
  override name = "Migration20261027093932_alimenti_condivisi";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "uso_alimento" ("id" uuid not null, "utente_id" uuid not null, "alimento_id" uuid not null, "ultimo_uso" timestamptz null, "utilizzi" int not null default 0, "archiviato" boolean not null default false, primary key ("id"));`,
    );
    this.addSql(`create index "uso_alimento_alimento_id_index" on "uso_alimento" ("alimento_id");`);
    this.addSql(
      `alter table "uso_alimento" add constraint "uso_alimento_utente_id_alimento_id_unique" unique ("utente_id", "alimento_id");`,
    );

    // Each owner's use and archive move to uso_alimento, while the food is still theirs.
    this.addSql(
      `insert into "uso_alimento" ("id", "utente_id", "alimento_id", "ultimo_uso", "utilizzi", "archiviato") select gen_random_uuid(), "utente_id", "id", "ultimo_uso", "utilizzi", "archiviato" from "alimento" where "utilizzi" > 0 or "ultimo_uso" is not null or "archiviato";`,
    );

    // The barcode becomes unique in the pool: of the foods sharing one (each of a different
    // user), the most recently updated stays and takes the others' entries and uses.
    // Their portions are dropped with them.
    this.addSql(
      `create temporary table "alimento_doppio" on commit drop as select "id", "tenuto" from (select "id", first_value("id") over (partition by "barcode" order by "aggiornato_il" desc, "id") as "tenuto" from "alimento" where "barcode" is not null) as "t" where "id" <> "tenuto";`,
    );
    this.addSql(
      `update "voce" set "alimento_id" = "d"."tenuto" from "alimento_doppio" as "d" where "voce"."alimento_id" = "d"."id";`,
    );
    // No conflict: a user had at most one food per barcode, so no use of the kept one yet.
    this.addSql(
      `update "uso_alimento" set "alimento_id" = "d"."tenuto" from "alimento_doppio" as "d" where "uso_alimento"."alimento_id" = "d"."id";`,
    );
    this.addSql(`delete from "alimento" where "id" in (select "id" from "alimento_doppio");`);

    this.addSql(`alter table "alimento" drop constraint "alimento_utente_id_foreign";`);
    this.addSql(`alter table "alimento" drop constraint "alimento_utente_id_barcode_unique";`);
    this.addSql(`alter table "alimento" rename column "utente_id" to "autore_id";`);
    this.addSql(`alter table "alimento" alter column "autore_id" drop not null;`);
    this.addSql(
      `alter table "alimento" drop column "archiviato", drop column "ultimo_uso", drop column "utilizzi";`,
    );
    this.addSql(
      `alter table "alimento" add constraint "alimento_autore_id_foreign" foreign key ("autore_id") references "utente" ("id") on delete set null;`,
    );
    this.addSql(
      `alter table "alimento" add constraint "alimento_barcode_unique" unique ("barcode");`,
    );

    this.addSql(
      `alter table "uso_alimento" add constraint "uso_alimento_utente_id_foreign" foreign key ("utente_id") references "utente" ("id") on delete cascade;`,
    );
    this.addSql(
      `alter table "uso_alimento" add constraint "uso_alimento_alimento_id_foreign" foreign key ("alimento_id") references "alimento" ("id") on delete cascade;`,
    );
  }

  /**
   * Back to one owner per food: the author, with the author's use. Merged duplicates are not
   * split again, and other users' entries keep pointing to the author's foods.
   */
  override down(): void | Promise<void> {
    this.addSql(`alter table "alimento" drop constraint "alimento_autore_id_foreign";`);
    this.addSql(`alter table "alimento" drop constraint "alimento_barcode_unique";`);
    this.addSql(
      `alter table "alimento" add "archiviato" boolean not null default false, add "ultimo_uso" timestamptz(6) null, add "utilizzi" int not null default 0;`,
    );
    this.addSql(
      `update "alimento" set "archiviato" = "u"."archiviato", "ultimo_uso" = "u"."ultimo_uso", "utilizzi" = "u"."utilizzi" from "uso_alimento" as "u" where "u"."alimento_id" = "alimento"."id" and "u"."utente_id" = "alimento"."autore_id";`,
    );
    this.addSql(`delete from "alimento" where "autore_id" is null;`);
    this.addSql(`alter table "alimento" rename column "autore_id" to "utente_id";`);
    this.addSql(`alter table "alimento" alter column "utente_id" set not null;`);
    this.addSql(
      `alter table "alimento" add constraint "alimento_utente_id_foreign" foreign key ("utente_id") references "utente" ("id") on delete cascade;`,
    );
    this.addSql(
      `alter table "alimento" add constraint "alimento_utente_id_barcode_unique" unique ("utente_id", "barcode");`,
    );

    this.addSql(`drop table if exists "uso_alimento" cascade;`);
  }
}
