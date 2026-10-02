import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'providers';
    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id').notNullable();
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
            table.string('business_name', 255).notNullable();
            table.string('owner_name', 255).nullable();
            table.string('primary_category', 100).notNullable();
            table.integer('experience_years').defaultTo(1);
            table.string('completed_events', 50).defaultTo('50+');
            table.text('about').nullable();
            table.decimal('rating', 2, 1).defaultTo(4.8);
            table.integer('review_count').defaultTo(0);
            table.boolean('verified').defaultTo(false);
            table.enum('verification_status', ['PENDING', 'APPROVED', 'REJECTED']).defaultTo('PENDING');
            table.string('response_time', 100).nullable().defaultTo('Usually responds within 2 hours');
            table.string('city', 100).nullable().defaultTo('Chennai');
            table.text('cover_image', 'longtext').nullable();
            table.text('logo_image', 'longtext').nullable();
            table.string('phone', 20).nullable();
            table.string('whatsapp', 20).nullable();
            table.string('alternate_phone', 20).nullable();
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').nullable();
        });
        this.schema.createTable('provider_service_areas', (table) => {
            table.increments('id').notNullable();
            table.integer('provider_id').unsigned().references('id').inTable('providers').onDelete('CASCADE');
            table.string('locality', 100).notNullable();
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').nullable();
        });
        this.schema.createTable('provider_social_links', (table) => {
            table.increments('id').notNullable();
            table.integer('provider_id').unsigned().references('id').inTable('providers').onDelete('CASCADE');
            table.string('platform', 50).notNullable();
            table.string('url', 500).notNullable();
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').nullable();
        });
    }
    async down() {
        this.schema.dropTable('provider_social_links');
        this.schema.dropTable('provider_service_areas');
        this.schema.dropTable(this.tableName);
    }
}
//# sourceMappingURL=1710000000002_create_providers_table.js.map