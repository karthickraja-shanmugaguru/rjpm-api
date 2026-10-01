import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    async up() {
        this.schema.createTable('enquiries', (table) => {
            table.increments('id').notNullable();
            table.integer('customer_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
            table.integer('provider_id').unsigned().references('id').inTable('providers').onDelete('CASCADE');
            table.integer('service_id').unsigned().references('id').inTable('services').onDelete('SET NULL').nullable();
            table.integer('package_id').unsigned().references('id').inTable('packages').onDelete('SET NULL').nullable();
            table.string('event_type', 100).notNullable();
            table.string('event_date', 50).notNullable();
            table.string('guest_count', 50).nullable();
            table.text('requirements').nullable();
            table.string('contact_preference', 50).defaultTo('Anytime');
            table.enum('status', ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED']).defaultTo('PENDING');
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').nullable();
        });
        this.schema.createTable('bookings', (table) => {
            table.increments('id').notNullable();
            table.integer('enquiry_id').unsigned().references('id').inTable('enquiries').onDelete('CASCADE').nullable();
            table.integer('customer_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
            table.integer('provider_id').unsigned().references('id').inTable('providers').onDelete('CASCADE');
            table.integer('service_id').unsigned().references('id').inTable('services').onDelete('SET NULL').nullable();
            table.integer('package_id').unsigned().references('id').inTable('packages').onDelete('SET NULL').nullable();
            table.string('event_type', 100).notNullable();
            table.string('event_date', 50).notNullable();
            table.string('guest_count', 50).nullable();
            table.string('amount_display', 100).nullable();
            table.enum('status', ['ACCEPTED', 'COMPLETED', 'CANCELLED']).defaultTo('ACCEPTED');
            table.text('notes').nullable();
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').nullable();
        });
    }
    async down() {
        this.schema.dropTable('bookings');
        this.schema.dropTable('enquiries');
    }
}
//# sourceMappingURL=1710000000006_create_enquiries_bookings_table.js.map