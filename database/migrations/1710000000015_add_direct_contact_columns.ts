import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    const tables = ['services', 'packages', 'labour_listings']

    for (const tableName of tables) {
      const hasPhone = await this.schema.hasColumn(tableName, 'phone')
      const hasWhatsapp = await this.schema.hasColumn(tableName, 'whatsapp')
      const hasAttribution = await this.schema.hasColumn(tableName, 'attribution_text')

      if (!hasPhone || !hasWhatsapp || !hasAttribution) {
        this.schema.alterTable(tableName, (table) => {
          if (!hasPhone) table.string('phone', 255).nullable()
          if (!hasWhatsapp) table.string('whatsapp', 255).nullable()
          if (!hasAttribution) table.string('attribution_text', 255).nullable()
        })
      }
    }
  }

  async down() {
    const tables = ['services', 'packages', 'labour_listings']
    for (const tableName of tables) {
      this.schema.alterTable(tableName, (table) => {
        table.dropColumn('phone')
        table.dropColumn('whatsapp')
        table.dropColumn('attribution_text')
      })
    }
  }
}
