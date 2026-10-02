import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class ClearProviderData extends BaseCommand {
  static commandName = 'clear:providers'
  static description = 'Clear all service provider data from database'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Clearing all service provider data...')

    // Clear dependent tables
    await db.from('review_replies').delete()
    await db.from('reviews').delete()
    await db.from('favorites').delete()
    await db.from('availability').delete()
    await db.from('bookings').delete()
    await db.from('enquiries').delete()
    await db.from('package_images').delete()
    await db.from('package_services').delete()
    await db.from('packages').delete()
    await db.from('service_images').delete()
    await db.from('labour_listings').delete()
    await db.from('services').delete()
    await db.from('provider_social_links').delete()
    await db.from('provider_service_areas').delete()
    await db.from('providers').delete()

    // Reset any users with PROVIDER role to CUSTOMER
    await db.from('users').where('role', 'PROVIDER').update({
      role: 'CUSTOMER',
      password: null,
    })

    this.logger.success('All service provider data has been removed successfully.')
  }
}
