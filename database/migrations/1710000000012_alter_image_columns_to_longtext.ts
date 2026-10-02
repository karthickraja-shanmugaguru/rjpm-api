import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('services', (table) => {
      table.text('cover_image', 'longtext').nullable().alter()
    })

    this.schema.alterTable('service_images', (table) => {
      table.text('image_url', 'longtext').notNullable().alter()
    })

    this.schema.alterTable('packages', (table) => {
      table.text('cover_image', 'longtext').nullable().alter()
    })

    this.schema.alterTable('package_images', (table) => {
      table.text('image_url', 'longtext').notNullable().alter()
    })

    this.schema.alterTable('providers', (table) => {
      table.text('cover_image', 'longtext').nullable().alter()
      table.text('logo_image', 'longtext').nullable().alter()
    })

    this.schema.alterTable('labour_listings', (table) => {
      table.text('cover_image', 'longtext').nullable().alter()
      table.text('images', 'longtext').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable('services', (table) => {
      table.string('cover_image', 500).nullable().alter()
    })
  }
}
