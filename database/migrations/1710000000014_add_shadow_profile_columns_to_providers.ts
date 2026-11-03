import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected providersTable = 'providers'
  protected usersTable = 'users'

  async up() {
    const hasProviderStatus = await this.schema.hasColumn(this.providersTable, 'provider_status')
    const hasClaimed = await this.schema.hasColumn(this.providersTable, 'claimed')
    const hasSource = await this.schema.hasColumn(this.providersTable, 'source')
    const hasAttributionText = await this.schema.hasColumn(this.providersTable, 'attribution_text')

    if (!hasProviderStatus || !hasClaimed || !hasSource || !hasAttributionText) {
      this.schema.alterTable(this.providersTable, (table) => {
        if (!hasProviderStatus) table.string('provider_status', 50).defaultTo('CLAIMED_ACTIVE').notNullable()
        if (!hasClaimed) table.boolean('claimed').defaultTo(true).notNullable()
        if (!hasSource) table.string('source', 100).defaultTo('DIRECT_SIGNUP').notNullable()
        if (!hasAttributionText) table.string('attribution_text', 255).nullable()
      })
    }

    const hasStatus = await this.schema.hasColumn(this.usersTable, 'status')
    if (!hasStatus) {
      this.schema.alterTable(this.usersTable, (table) => {
        table.string('status', 20).defaultTo('ACTIVE').notNullable()
      })
    }
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
