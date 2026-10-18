import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261018201731 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "wa_cart_reminder" drop constraint if exists "wa_cart_reminder_cart_id_unique";`);
    this.addSql(`create table if not exists "wa_cart_reminder" ("id" text not null, "cart_id" text not null, "phone" text not null, "status" text check ("status" in ('sent', 'failed')) not null default 'sent', "error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wa_cart_reminder_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wa_cart_reminder_cart_id_unique" ON "wa_cart_reminder" ("cart_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wa_cart_reminder_deleted_at" ON "wa_cart_reminder" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wa_cart_reminder_phone_created_at" ON "wa_cart_reminder" ("phone", "created_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wa_cart_reminder" cascade;`);
  }

}
