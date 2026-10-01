import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'package_images';
    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id').notNullable();
            table.integer('package_id').unsigned().references('id').inTable('packages').onDelete('CASCADE');
            table.text('image_url').notNullable();
            table.integer('sort_order').defaultTo(0);
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').nullable();
        });
    }
    async down() {
        this.schema.dropTable(this.tableName);
    }
}
//# sourceMappingURL=1710000000008_create_package_images_table.js.map