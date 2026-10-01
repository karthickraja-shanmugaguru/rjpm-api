import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('phone', 20).notNullable().unique()
      table.string('name', 255).nullable()
      table.string('email', 255).nullable()
      table.enum('role', ['CUSTOMER', 'PROVIDER', 'ADMIN']).defaultTo('CUSTOMER').notNullable()
      table.string('location', 255).defaultTo('Chennai')
      table.string('event_preference', 100).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
