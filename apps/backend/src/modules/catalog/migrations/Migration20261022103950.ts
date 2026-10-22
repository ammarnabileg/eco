import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261022103950 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "install_request" ("id" text not null, "customer_name" text not null, "phone" text not null, "governorate" text not null, "area" text null, "service" text check ("service" in ('cctv', 'networking', 'smart_home', 'intercom', 'other')) not null, "preferred_date" text null, "message" text null, "product_id" text null, "customer_id" text null, "locale" text not null default 'ar', "status" text check ("status" in ('new', 'contacted', 'scheduled', 'done', 'cancelled')) not null default 'new', "admin_note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "install_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_install_request_deleted_at" ON "install_request" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_install_request_status" ON "install_request" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_install_request_created_at" ON "install_request" ("created_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "install_request" cascade;`);
  }

}
