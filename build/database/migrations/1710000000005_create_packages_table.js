import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'packages';
    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id').notNullable();
            table.integer('provider_id').unsigned().references('id').inTable('providers').onDelete('CASCADE');
            table.string('name', 255).notNullable();
            table.enum('event_type', [
                'Wedding',
                'Birthday',
                'Reception',
                'Engagement',
                'Housewarming',
                'Baby Shower',
                'Anniversary',
                'Corporate',
            ]).notNullable();
            table.enum('pricing_type', ['FIXED', 'STARTING_FROM', 'PER_GUEST']).defaultTo('STARTING_FROM');
            table.string('price_display', 100).notNullable();
            table.decimal('price_amount', 10, 2).defaultTo(0);
            table.string('guest_capacity', 100).nullable();
            table.text('description').nullable();
            table.enum('status', ['LIVE', 'PAUSED', 'DRAFT']).defaultTo('LIVE');
            table.string('cover_image', 500).nullable();
            table.string('icon', 50).defaultTo('📦');
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').nullable();
        });
        this.schema.createTable('package_services', (table) => {
            table.increments('id').notNullable();
            table.integer('package_id').unsigned().references('id').inTable('packages').onDelete('CASCADE');
            table.integer('service_id').unsigned().references('id').inTable('services').onDelete('CASCADE');
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').nullable();
        });
    }
    async down() {
        this.schema.dropTable('package_services');
        this.schema.dropTable(this.tableName);
    }
}
//# sourceMappingURL=1710000000005_create_packages_table.js.map