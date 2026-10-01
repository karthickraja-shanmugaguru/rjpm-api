import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'labour_listings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('cover_image').nullable()
      table.text('images').nullable()
      table.string('status', 20).defaultTo('LIVE')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('cover_image')
      table.dropColumn('images')
      table.dropColumn('status')
    })
  }
}
