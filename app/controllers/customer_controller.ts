import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class CustomerController {
  /**
   * POST /api/enquiries
   * Customer sends enquiry to a provider
   */
  async createEnquiry(ctx: HttpContext) {
    const { request, response } = ctx
    const user = (ctx as any).authUser
    const {
      providerId,
      serviceId,
      packageId,
      eventType,
      eventDate,
      guestCount,
      requirements,
      notes,
      contactPreference,
    } = request.all()

    if (!providerId || !eventDate || !eventType) {
      return response.status(422).json({
        success: false,
        message: 'Provider, event type and event date are required',
      })
    }

    const now = new Date()
    const [enqIdRaw] = await db.table('enquiries').insert({
      customer_id: user.id,
      provider_id: providerId,
      service_id: serviceId || null,
      package_id: packageId || null,
      event_type: eventType,
      event_date: eventDate,
      guest_count: guestCount ? String(guestCount) : null,
      requirements: requirements || notes || null,
      contact_preference: contactPreference || 'Anytime',
      status: 'PENDING',
      created_at: now,
      updated_at: now,
    }).returning('id')

    const enquiryId = typeof enqIdRaw === 'object' ? (enqIdRaw as any).id : enqIdRaw

    return response.status(201).json({
      success: true,
      message: 'Enquiry sent successfully. The provider will contact you shortly.',
      data: { id: enquiryId },
    })
  }

  /**
   * GET /api/customer/bookings
   * Customer views all enquiries and converted bookings
   */
  async getBookings(ctx: HttpContext) {
    const { response } = ctx
    const user = (ctx as any).authUser

    try {


    // Fetch customer bookings
    const bookings = await db
      .from('bookings')
      .join('providers', 'bookings.provider_id', 'providers.id')
      .leftJoin('services', 'bookings.service_id', 'services.id')
      .leftJoin('packages', 'bookings.package_id', 'packages.id')
      .where('bookings.customer_id', user.id)
      .select(
        'bookings.*',
        'providers.business_name as provider_name',
        'providers.phone as provider_phone',
        'providers.primary_category as category',
        'services.name as service_name',
        'packages.name as package_name'
      )
      .orderBy('bookings.id', 'desc')

    // Fetch customer pending enquiries
    const enquiries = await db
      .from('enquiries')
      .join('providers', 'enquiries.provider_id', 'providers.id')
      .leftJoin('services', 'enquiries.service_id', 'services.id')
      .leftJoin('packages', 'enquiries.package_id', 'packages.id')
      .where('enquiries.customer_id', user.id)
      .where('enquiries.status', '!=', 'ACCEPTED') // Accepted ones are in bookings
      .select(
        'enquiries.id',
        'enquiries.provider_id',
        'enquiries.event_type',
        'enquiries.event_date',
        'enquiries.guest_count',
        'enquiries.requirements as notes',
        'enquiries.status',
        'enquiries.created_at',
        'providers.business_name as provider_name',
        'providers.phone as provider_phone',
        'providers.primary_category as category',
        'services.name as service_name',
        'packages.name as package_name'
      )
      .orderBy('enquiries.id', 'desc')

    // Combine list for customer UI
    const combined = [
      ...bookings.map((b) => ({
        id: b.id,
        providerId: b.provider_id,
        providerName: b.provider_name,
        provider: {
          id: b.provider_id,
          businessName: b.provider_name,
          phone: b.provider_phone,
        },
        serviceName: b.package_name || b.service_name || `${b.event_type} Booking`,
        category: b.category,
        eventDate: b.event_date,
        guestCount: b.guest_count,
        venueCity: 'Chennai',
        notes: b.notes,
        status: b.status,
        isBooking: true,
        createdAt: b.created_at,
      })),
      ...enquiries.map((e) => ({
        id: e.id,
        providerId: e.provider_id,
        providerName: e.provider_name,
        provider: {
          id: e.provider_id,
          businessName: e.provider_name,
          phone: e.provider_phone,
        },
        serviceName: e.package_name || e.service_name || `${e.event_type} Enquiry`,
        category: e.category,
        eventDate: e.event_date,
        guestCount: e.guest_count,
        venueCity: 'Chennai',
        notes: e.notes,
        status: e.status,
        isBooking: false,
        createdAt: e.created_at,
      })),
    ]

      return response.json({
        success: true,
        data: combined,
      })
    } catch (err: any) {
      console.error('CustomerController.getBookings error:', err)
      return response.status(500).json({
        success: false,
        message: err.message || 'Error fetching bookings',
      })
    }
  }

  /**
   * GET /api/customer/favorites
   */
  async getFavorites(ctx: HttpContext) {
    const { response } = ctx
    const user = (ctx as any).authUser
    const favorites = await db
      .from('favorites')
      .where('customer_id', user.id)
      .select('provider_id', 'service_id', 'package_id')

    const providerIds = favorites.map((f) => f.provider_id).filter(Boolean)
    const packageIds = favorites.map((f) => f.package_id).filter(Boolean)
    const serviceIds = favorites.map((f) => f.service_id).filter(Boolean)

    const providers = providerIds.length > 0 ? await db.from('providers').whereIn('id', providerIds) : []
    const packages = packageIds.length > 0 ? await db.from('packages').whereIn('id', packageIds) : []
    const services = serviceIds.length > 0 ? await db.from('services').whereIn('id', serviceIds) : []

    return response.json({
      success: true,
      data: {
        providerIds,
        packageIds,
        serviceIds,
        providers,
        packages,
        services,
      },
    })
  }

  /**
   * POST /api/customer/favorites/toggle
   */
  async toggleFavorite(ctx: HttpContext) {
    const { request, response } = ctx
    const user = (ctx as any).authUser
    const { providerId, serviceId, packageId } = request.all()

    let query = db.from('favorites').where('customer_id', user.id)
    if (providerId) query = query.where('provider_id', Number(providerId))
    if (serviceId) query = query.where('service_id', Number(serviceId))
    if (packageId) query = query.where('package_id', Number(packageId))

    const existing = await query.first()

    if (existing) {
      await db.from('favorites').where('id', existing.id).delete()
      return response.json({
        success: true,
        message: 'Removed from favorites',
        favorited: false,
      })
    } else {
      await db.table('favorites').insert({
        customer_id: user.id,
        provider_id: providerId ? Number(providerId) : null,
        service_id: serviceId ? Number(serviceId) : null,
        package_id: packageId ? Number(packageId) : null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      return response.json({
        success: true,
        message: 'Saved to favorites',
        favorited: true,
      })
    }
  }

  /**
   * POST /api/reviews
   * Submit customer star rating/review for a provider
   */
  async createReview(ctx: HttpContext) {
    const { request, response } = ctx
    const user = (ctx as any).authUser
    const { providerId, rating, comment, eventType } = request.all()

    if (!providerId || !rating) {
      return response.status(422).json({
        success: false,
        message: 'Provider ID and star rating are required',
      })
    }

    const numRating = Math.min(5, Math.max(1, Number(rating) || 5))
    const now = new Date()

    // Check if customer already submitted a rating/review for this provider
    const existing = await db
      .from('reviews')
      .where('provider_id', providerId)
      .where('customer_id', user.id)
      .first()

    let reviewId = existing?.id

    if (existing) {
      await db.from('reviews').where('id', existing.id).update({
        rating: numRating,
        comment: comment !== undefined ? String(comment).trim() : existing.comment,
        customer_name: user.name || existing.customer_name || 'RJPM Customer',
        updated_at: now,
      })
    } else {
      const [revIdRaw] = await db.table('reviews').insert({
        customer_id: user.id,
        provider_id: providerId,
        customer_name: user.name || 'RJPM Customer',
        rating: numRating,
        comment: comment ? String(comment).trim() : '',
        event_type: eventType || 'Celebration',
        event_date_text: 'Recent review',
        created_at: now,
        updated_at: now,
      }).returning('id')

      reviewId = typeof revIdRaw === 'object' ? (revIdRaw as any).id : revIdRaw
    }

    // Recompute provider average rating and review count from real reviews
    const reviews = await db.from('reviews').where('provider_id', providerId)
    const avg = reviews.length > 0
      ? Number((reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / reviews.length).toFixed(1))
      : 0

    await db.from('providers').where('id', providerId).update({
      rating: avg,
      review_count: reviews.length,
      updated_at: now,
    })

    return response.status(200).json({
      success: true,
      message: 'Star rating submitted successfully',
      data: {
        id: reviewId,
        rating: numRating,
        providerRating: avg,
        reviewCount: reviews.length,
      },
    })
  }
}
