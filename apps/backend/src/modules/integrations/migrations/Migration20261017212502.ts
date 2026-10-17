import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261017212502 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration_setting" drop constraint if exists "integration_setting_key_unique";`);
    this.addSql(`create table if not exists "integration_setting" ("id" text not null, "key" text not null, "enabled" boolean not null default false, "config" jsonb null, "secrets" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "integration_setting_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_setting_deleted_at" ON "integration_setting" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_integration_setting_key_unique" ON "integration_setting" ("key") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "integration_setting" cascade;`);
  }

}
