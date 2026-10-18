import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261018114819 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "wa_order_confirmation" drop constraint if exists "wa_order_confirmation_order_id_unique";`);
    this.addSql(`create table if not exists "wa_order_confirmation" ("id" text not null, "order_id" text not null, "phone" text not null, "status" text check ("status" in ('sent', 'failed', 'confirmed', 'cancel_requested')) not null default 'sent', "error" text null, "responded_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wa_order_confirmation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wa_order_confirmation_deleted_at" ON "wa_order_confirmation" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wa_order_confirmation_order_id_unique" ON "wa_order_confirmation" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wa_order_confirmation_phone_status" ON "wa_order_confirmation" ("phone", "status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "wa_otp" ("id" text not null, "cart_id" text not null, "phone" text not null, "code_hash" text not null, "expires_at" timestamptz not null, "attempts" integer not null default 0, "verified_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wa_otp_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wa_otp_deleted_at" ON "wa_otp" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wa_otp_cart_id" ON "wa_otp" ("cart_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wa_otp_phone_created_at" ON "wa_otp" ("phone", "created_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wa_order_confirmation" cascade;`);

    this.addSql(`drop table if exists "wa_otp" cascade;`);
  }

}
