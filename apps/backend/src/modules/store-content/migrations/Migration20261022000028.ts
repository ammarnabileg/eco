import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261022000028 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "content_page_revision" drop constraint if exists "content_page_revision_slug_version_unique";`);
    this.addSql(`alter table if exists "content_page" drop constraint if exists "content_page_slug_unique";`);
    this.addSql(`create table if not exists "content_page" ("id" text not null, "slug" text not null, "title_ar" text not null, "title_en" text not null default '', "summary_ar" text null, "summary_en" text null, "body_ar" text not null default '', "body_en" text not null default '', "faq" jsonb null, "is_published" boolean not null default false, "has_draft_changes" boolean not null default true, "version" integer not null default 0, "published_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_page_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_page_deleted_at" ON "content_page" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_content_page_slug_unique" ON "content_page" ("slug") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_page_revision" ("id" text not null, "page_id" text not null, "slug" text not null, "version" integer not null, "title_ar" text not null, "title_en" text not null, "summary_ar" text null, "summary_en" text null, "body_ar" text not null, "body_en" text not null, "faq" jsonb null, "published_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_page_revision_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_page_revision_deleted_at" ON "content_page_revision" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_content_page_revision_slug_version_unique" ON "content_page_revision" ("slug", "version") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "content_page" cascade;`);

    this.addSql(`drop table if exists "content_page_revision" cascade;`);
  }

}
