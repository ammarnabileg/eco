import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261021221414 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "ai_usage" ("id" text not null, "run_id" text not null, "task" text not null, "provider" text not null, "model" text not null, "input_tokens" integer not null default 0, "output_tokens" integer not null default 0, "cached_tokens" integer not null default 0, "cost_usd" real null, "request_chars" integer not null default 0, "tool_calls" integer not null default 0, "duration_ms" integer not null default 0, "status" text check ("status" in ('ok', 'error')) not null, "error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_usage_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_usage_deleted_at" ON "ai_usage" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_usage_created_at" ON "ai_usage" ("created_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_usage_task_created_at" ON "ai_usage" ("task", "created_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_usage_run_id" ON "ai_usage" ("run_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "ai_usage" cascade;`);
  }

}
