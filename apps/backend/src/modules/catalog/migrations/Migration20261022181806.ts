import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261022181806 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_detail" add column if not exists "box_contents_ar" jsonb null, add column if not exists "box_contents_en" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_detail" drop column if exists "box_contents_ar", drop column if exists "box_contents_en";`);
  }

}
