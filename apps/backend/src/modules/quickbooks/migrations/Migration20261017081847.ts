import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261017081847 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "qb_connection" add column if not exists "rounding_item_id" text null;`);

    this.addSql(`alter table if exists "qb_sync_record" drop constraint if exists "qb_sync_record_entity_check";`);
    this.addSql(`alter table if exists "qb_sync_record" add constraint "qb_sync_record_entity_check" check("entity" in ('order', 'variant', 'customer', 'refund', 'payment_method', 'capture'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "qb_sync_record" drop constraint if exists "qb_sync_record_entity_check";`);
    this.addSql(`alter table if exists "qb_sync_record" add constraint "qb_sync_record_entity_check" check("entity" in ('order', 'variant', 'customer', 'refund', 'payment_method'));`);

    this.addSql(`alter table if exists "qb_connection" drop column if exists "rounding_item_id";`);
  }

}
