import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261021232416 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "hero_slide" add column if not exists "banner_url" text null, add column if not exists "banner_mobile_url" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "hero_slide" drop column if exists "banner_url", drop column if exists "banner_mobile_url";`);
  }

}
