import { Migration } from "@mikro-orm/migrations";

export class Migration20261025124715_iniziale extends Migration {
  override name = "Migration20261025124715_iniziale";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "pasto" ("id" uuid not null, "nome" varchar(50) not null, "ordine" int not null, "creato_il" timestamptz not null, "aggiornato_il" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`alter table "pasto" add constraint "pasto_nome_unique" unique ("nome");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "pasto" cascade;`);
  }
}
