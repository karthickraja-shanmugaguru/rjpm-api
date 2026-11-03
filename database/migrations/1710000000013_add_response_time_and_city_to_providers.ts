import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'providers'

  async up() {
    const hasResponseTime = await this.schema.hasColumn(this.tableName, 'response_time')
    const hasCity = await this.schema.hasColumn(this.tableName, 'city')

    if (!hasResponseTime || !hasCity) {
      this.schema.alterTable(this.tableName, (table) => {
        if (!hasResponseTime) {
          table.string('response_time', 100).nullable().defaultTo('Usually responds within 2 hours')
        }
        if (!hasCity) {
          table.string('city', 100).nullable().defaultTo('Chennai')
        }
      })
    }
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('response_time')
      table.dropColumn('city')
    })
  }
}
