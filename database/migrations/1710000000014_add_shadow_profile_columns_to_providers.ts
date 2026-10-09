import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected providersTable = 'providers'
  protected usersTable = 'users'

  async up() {
    this.schema.alterTable(this.providersTable, (table) => {
      table.string('provider_status', 50).defaultTo('CLAIMED_ACTIVE').notNullable()
      table.boolean('claimed').defaultTo(true).notNullable()
      table.string('source', 100).defaultTo('DIRECT_SIGNUP').notNullable()
      table.string('attribution_text', 255).nullable()
    })

    this.schema.alterTable(this.usersTable, (table) => {
      table.string('status', 20).defaultTo('ACTIVE').notNullable()
    })
  }

  async down() {
    this.schema.alterTable(this.providersTable, (table) => {
      table.dropColumn('attribution_text')
      table.dropColumn('source')
      table.dropColumn('claimed')
      table.dropColumn('provider_status')
    })

    this.schema.alterTable(this.usersTable, (table) => {
      table.dropColumn('status')
    })
  }
}
