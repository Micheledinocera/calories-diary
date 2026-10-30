import { Migration } from "@mikro-orm/migrations";

export class Migration20261030125334_pasto_collegato extends Migration {
  override name = "Migration20261030125334_pasto_collegato";

  override up(): void | Promise<void> {
    this.addSql(`alter table "pasto" add "preferito_id" uuid null;`);
    this.addSql(
      `alter table "pasto" add constraint "pasto_preferito_id_foreign" foreign key ("preferito_id") references "pasto_preferito" ("id") on delete set null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "pasto" drop constraint "pasto_preferito_id_foreign";`);

    this.addSql(`alter table "pasto" drop column "preferito_id";`);
  }
}
