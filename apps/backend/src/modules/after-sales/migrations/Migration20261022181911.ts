import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261022181911 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "after_sales_request" ("id" text not null, "kind" text check ("kind" in ('return', 'exchange', 'warranty')) not null, "order_id" text not null, "order_display_id" integer not null, "customer_id" text null, "items" jsonb not null, "reason" text check ("reason" in ('defective', 'wrong_item', 'not_as_described', 'changed_mind', 'other')) not null, "details" text null, "phone" text not null, "status" text check ("status" in ('new', 'reviewing', 'approved', 'rejected', 'received', 'completed')) not null default 'new', "admin_note" text null, "locale" text not null default 'ar', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "after_sales_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_after_sales_request_deleted_at" ON "after_sales_request" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_after_sales_request_status" ON "after_sales_request" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_after_sales_request_created_at" ON "after_sales_request" ("created_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_after_sales_request_order_id" ON "after_sales_request" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_after_sales_request_customer_id" ON "after_sales_request" ("customer_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "after_sales_request" cascade;`);
  }

}
