import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'providers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('response_time', 100).nullable().defaultTo('Usually responds within 2 hours')
      table.string('city', 100).nullable().defaultTo('Chennai')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('response_time')
      table.dropColumn('city')
    })
  }
}
