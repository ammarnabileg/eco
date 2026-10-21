import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261021232358 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "ai_banner" ("id" text not null, "title" text not null, "product_id" text null, "background_url" text null, "product_image_url" text null, "canvas_width" integer not null, "canvas_height" integer not null, "elements" jsonb not null, "language" text check ("language" in ('ar', 'en', 'both')) not null default 'ar', "status" text check ("status" in ('draft', 'approved')) not null default 'draft', "output_url" text null, "price_snapshot" jsonb null, "slide_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_banner_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_banner_deleted_at" ON "ai_banner" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_banner_updated_at" ON "ai_banner" ("updated_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "ai_banner" cascade;`);
  }

}
