import { Migration } from "@mikro-orm/migrations";

export class Migration20261120084000_tag_pasti_preferiti extends Migration {
  override name = "Migration20261120084000_tag_pasti_preferiti";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "tag" ("id" uuid not null, "nome" varchar(30) not null, primary key ("id"));`,
    );
    this.addSql(`alter table "tag" add constraint "tag_nome_unique" unique ("nome");`);

    this.addSql(
      `create table "pasto_preferito_tags" ("pasto_preferito_id" uuid not null, "tag_id" uuid not null, primary key ("pasto_preferito_id", "tag_id"));`,
    );

    this.addSql(
      `alter table "pasto_preferito_tags" add constraint "pasto_preferito_tags_pasto_preferito_id_foreign" foreign key ("pasto_preferito_id") references "pasto_preferito" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "pasto_preferito_tags" add constraint "pasto_preferito_tags_tag_id_foreign" foreign key ("tag_id") references "tag" ("id") on update cascade on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "pasto_preferito_tags" drop constraint "pasto_preferito_tags_tag_id_foreign";`,
    );

    this.addSql(`drop table if exists "tag" cascade;`);
    this.addSql(`drop table if exists "pasto_preferito_tags" cascade;`);
  }
}
