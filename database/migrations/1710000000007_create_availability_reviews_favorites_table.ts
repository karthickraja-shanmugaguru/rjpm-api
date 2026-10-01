import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('availability', (table) => {
      table.increments('id').notNullable()
      table.integer('provider_id').unsigned().references('id').inTable('providers').onDelete('CASCADE')
      table.string('date', 20).notNullable()
      table.enum('status', ['AVAILABLE', 'BUSY', 'BOOKED']).defaultTo('AVAILABLE')
      table.string('title', 255).nullable()
      table.string('customer_name', 255).nullable()
      table.string('guests', 100).nullable()
      table.integer('booking_id').unsigned().references('id').inTable('bookings').onDelete('SET NULL').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('reviews', (table) => {
      table.increments('id').notNullable()
      table.integer('customer_id').unsigned().references('id').inTable('users').onDelete('CASCADE').nullable()
      table.integer('provider_id').unsigned().references('id').inTable('providers').onDelete('CASCADE')
      table.integer('booking_id').unsigned().references('id').inTable('bookings').onDelete('SET NULL').nullable()
      table.string('customer_name', 255).notNullable()
      table.integer('rating').defaultTo(5)
      table.text('comment').notNullable()
      table.string('event_type', 100).nullable()
      table.string('event_date_text', 100).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('review_replies', (table) => {
      table.increments('id').notNullable()
      table.integer('review_id').unsigned().references('id').inTable('reviews').onDelete('CASCADE')
      table.integer('provider_id').unsigned().references('id').inTable('providers').onDelete('CASCADE')
      table.text('reply_text').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('favorites', (table) => {
      table.increments('id').notNullable()
      table.integer('customer_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.integer('provider_id').unsigned().references('id').inTable('providers').onDelete('CASCADE').nullable()
      table.integer('service_id').unsigned().references('id').inTable('services').onDelete('CASCADE').nullable()
      table.integer('package_id').unsigned().references('id').inTable('packages').onDelete('CASCADE').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('favorites')
    this.schema.dropTable('review_replies')
    this.schema.dropTable('reviews')
    this.schema.dropTable('availability')
  }
}
