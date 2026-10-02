import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'services';
    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id').notNullable();
            table.integer('provider_id').unsigned().references('id').inTable('providers').onDelete('CASCADE');
            table.integer('category_id').unsigned().references('id').inTable('categories').onDelete('SET NULL').nullable();
            table.string('category_name', 100).notNullable();
            table.string('name', 255).notNullable();
            table.text('description').nullable();
            table.enum('pricing_type', ['FIXED', 'STARTING_FROM', 'PER_PLATE', 'PER_DAY']).defaultTo('STARTING_FROM');
            table.string('price_display', 100).notNullable();
            table.decimal('price_amount', 10, 2).defaultTo(0);
            table.enum('status', ['LIVE', 'PAUSED', 'DRAFT']).defaultTo('LIVE');
            table.text('cover_image', 'longtext').nullable();
            table.string('icon', 50).defaultTo('✨');
            table.string('service_area_override', 255).nullable();
            table.text('inclusions').nullable();
            table.text('terms').nullable();
            table.string('duration', 100).nullable();
            table.string('setup_time', 100).nullable();
            table.text('highlights').nullable();
            table.string('video_url', 500).nullable();
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').nullable();
        });
        this.schema.createTable('service_images', (table) => {
            table.increments('id').notNullable();
            table.integer('service_id').unsigned().references('id').inTable('services').onDelete('CASCADE');
            table.text('image_url', 'longtext').notNullable();
            table.integer('sort_order').defaultTo(0);
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').nullable();
        });
        this.schema.createTable('labour_listings', (table) => {
            table.increments('id').notNullable();
            table.integer('provider_id').unsigned().references('id').inTable('providers').onDelete('CASCADE').nullable();
            table.string('name', 255).notNullable();
            table.string('type', 100).notNullable();
            table.string('provider_name', 255).notNullable();
            table.string('price_display', 100).notNullable();
            table.decimal('price_amount', 10, 2).defaultTo(0);
            table.decimal('rating', 2, 1).defaultTo(4.5);
            table.boolean('verified').defaultTo(true);
            table.text('details').nullable();
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').nullable();
        });
    }
    async down() {
        this.schema.dropTable('labour_listings');
        this.schema.dropTable('service_images');
        this.schema.dropTable(this.tableName);
    }
}
//# sourceMappingURL=1710000000004_create_services_table.js.map