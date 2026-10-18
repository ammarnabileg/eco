import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261018094017 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "qb_webhook_event" drop constraint if exists "qb_webhook_event_event_key_unique";`);
    this.addSql(`create table if not exists "qb_webhook_event" ("id" text not null, "event_key" text not null, "realm_id" text not null, "entity" text not null, "entity_id" text not null, "operation" text not null, "occurred_at" timestamptz null, "local_entity" text null, "local_id" text null, "attention" boolean not null default false, "reviewed_at" timestamptz null, "raw" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "qb_webhook_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_qb_webhook_event_deleted_at" ON "qb_webhook_event" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_qb_webhook_event_event_key_unique" ON "qb_webhook_event" ("event_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_qb_webhook_event_attention_reviewed_at" ON "qb_webhook_event" ("attention", "reviewed_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "qb_webhook_event" cascade;`);
  }

}
