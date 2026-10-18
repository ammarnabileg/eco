import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261018214851 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "wa_conversation" drop constraint if exists "wa_conversation_phone_unique";`);
    this.addSql(`create table if not exists "wa_conversation" ("id" text not null, "phone" text not null, "name" text null, "instance" text null, "last_message_at" timestamptz null, "last_preview" text null, "unread" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wa_conversation_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wa_conversation_phone_unique" ON "wa_conversation" ("phone") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wa_conversation_deleted_at" ON "wa_conversation" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wa_conversation_last_message_at" ON "wa_conversation" ("last_message_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "wa_message" ("id" text not null, "conversation_id" text not null, "phone" text not null, "instance" text null, "direction" text check ("direction" in ('in', 'out')) not null, "kind" text not null, "body" text not null, "status" text check ("status" in ('sent', 'failed', 'received')) not null, "error" text null, "external_id" text null, "author_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wa_message_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wa_message_deleted_at" ON "wa_message" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wa_message_conversation_id_created_at" ON "wa_message" ("conversation_id", "created_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wa_message_instance_direction_created_at" ON "wa_message" ("instance", "direction", "created_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wa_conversation" cascade;`);

    this.addSql(`drop table if exists "wa_message" cascade;`);
  }

}
