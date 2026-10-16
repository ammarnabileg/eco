import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261016221212 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "hero_slide" ("id" text not null, "eyebrow_ar" text null, "eyebrow_en" text null, "title_ar" text not null, "title_en" text not null, "highlight_ar" text null, "highlight_en" text null, "subtitle_ar" text null, "subtitle_en" text null, "cta_label_ar" text null, "cta_label_en" text null, "cta_url" text null, "image_url" text null, "rank" integer not null default 0, "is_active" boolean not null default true, "starts_at" timestamptz null, "ends_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "hero_slide_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_hero_slide_deleted_at" ON "hero_slide" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "site_setting" ("id" text not null, "whatsapp" text null, "phone" text null, "email" text null, "address_ar" text null, "address_en" text null, "hours_ar" text null, "hours_en" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "site_setting_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_site_setting_deleted_at" ON "site_setting" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "trust_badge" ("id" text not null, "icon" text not null, "title_ar" text not null, "title_en" text not null, "subtitle_ar" text null, "subtitle_en" text null, "rank" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "trust_badge_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_trust_badge_deleted_at" ON "trust_badge" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "hero_slide" cascade;`);

    this.addSql(`drop table if exists "site_setting" cascade;`);

    this.addSql(`drop table if exists "trust_badge" cascade;`);
  }

}
