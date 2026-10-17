import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261017081014 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "qb_sync_record" drop constraint if exists "qb_sync_record_entity_local_id_unique";`);
    this.addSql(`create table if not exists "qb_connection" ("id" text not null, "realm_id" text not null, "environment" text check ("environment" in ('sandbox', 'production')) not null default 'sandbox', "company_name" text null, "access_token" text not null, "refresh_token" text not null, "access_expires_at" timestamptz not null, "refresh_expires_at" timestamptz null, "income_account_id" text null, "deposit_account_id" text null, "shipping_item_id" text null, "refund_item_id" text null, "currency" text not null default 'KWD', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "qb_connection_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_qb_connection_deleted_at" ON "qb_connection" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "qb_sync_record" ("id" text not null, "entity" text check ("entity" in ('order', 'variant', 'customer', 'refund', 'payment_method')) not null, "local_id" text not null, "qb_type" text null, "qb_id" text null, "qb_sync_token" text null, "status" text check ("status" in ('synced', 'failed', 'skipped')) not null default 'synced', "error" text null, "attempts" integer not null default 0, "synced_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "qb_sync_record_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_qb_sync_record_deleted_at" ON "qb_sync_record" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_qb_sync_record_entity_local_id_unique" ON "qb_sync_record" ("entity", "local_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_qb_sync_record_status" ON "qb_sync_record" ("status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "qb_connection" cascade;`);

    this.addSql(`drop table if exists "qb_sync_record" cascade;`);
  }

}
