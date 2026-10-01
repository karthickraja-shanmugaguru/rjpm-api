import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'packages';
    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.text('inclusions').nullable();
            table.text('exclusions').nullable();
            table.text('highlights').nullable();
            table.string('duration', 100).nullable();
            table.string('setup_time', 100).nullable();
            table.string('advance_notice', 100).nullable();
            table.text('terms').nullable();
            table.boolean('customizable').defaultTo(true);
        });
    }
    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('inclusions');
            table.dropColumn('exclusions');
            table.dropColumn('highlights');
            table.dropColumn('duration');
            table.dropColumn('setup_time');
            table.dropColumn('advance_notice');
            table.dropColumn('terms');
            table.dropColumn('customizable');
        });
    }
}
//# sourceMappingURL=1710000000009_add_package_details_columns.js.map