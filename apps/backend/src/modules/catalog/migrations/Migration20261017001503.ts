import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261017001503 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "brand" drop constraint if exists "brand_handle_unique";`);
    this.addSql(`create table if not exists "addon_group" ("id" text not null, "name_ar" text not null, "name_en" text not null, "kind" text check ("kind" in ('ram', 'ssd', 'hdd', 'memory_card', 'installation', 'warranty', 'other')) not null default 'other', "selection" text check ("selection" in ('single', 'multiple')) not null default 'single', "is_required" boolean not null default false, "rank" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "addon_group_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_addon_group_deleted_at" ON "addon_group" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "addon_option" ("id" text not null, "name_ar" text not null, "name_en" text not null, "price" numeric not null, "sku" text null, "is_active" boolean not null default true, "rank" integer not null default 0, "group_id" text not null, "raw_price" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "addon_option_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_addon_option_group_id" ON "addon_option" ("group_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_addon_option_deleted_at" ON "addon_option" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "brand" ("id" text not null, "name" text not null, "handle" text not null, "logo_url" text null, "description_ar" text null, "description_en" text null, "rank" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_handle_unique" ON "brand" ("handle") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_deleted_at" ON "brand" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "product_detail" ("id" text not null, "title_en" text null, "subtitle_ar" text null, "subtitle_en" text null, "description_en" text null, "highlights_ar" jsonb null, "highlights_en" jsonb null, "specs" jsonb null, "faq" jsonb null, "seo_title_ar" text null, "seo_title_en" text null, "seo_description_ar" text null, "seo_description_en" text null, "mpn" text null, "series" text null, "price_on_request" boolean not null default false, "warranty_months" integer null, "source_url" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_detail_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_detail_deleted_at" ON "product_detail" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "quote_request" ("id" text not null, "product_id" text not null, "variant_id" text null, "product_title" text not null, "customer_name" text not null, "phone" text not null, "email" text null, "company" text null, "quantity" integer not null default 1, "message" text null, "customer_id" text null, "locale" text not null default 'ar', "status" text check ("status" in ('new', 'contacted', 'quoted', 'won', 'lost')) not null default 'new', "admin_note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "quote_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quote_request_deleted_at" ON "quote_request" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quote_request_status" ON "quote_request" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "spec_template" ("id" text not null, "name_ar" text not null, "name_en" text not null, "attributes" jsonb not null, "rank" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "spec_template_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_spec_template_deleted_at" ON "spec_template" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "addon_option" add constraint "addon_option_group_id_foreign" foreign key ("group_id") references "addon_group" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "addon_option" drop constraint if exists "addon_option_group_id_foreign";`);

    this.addSql(`drop table if exists "addon_group" cascade;`);

    this.addSql(`drop table if exists "addon_option" cascade;`);

    this.addSql(`drop table if exists "brand" cascade;`);

    this.addSql(`drop table if exists "product_detail" cascade;`);

    this.addSql(`drop table if exists "quote_request" cascade;`);

    this.addSql(`drop table if exists "spec_template" cascade;`);
  }

}
