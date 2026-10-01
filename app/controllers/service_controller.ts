import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class ServiceController {
  async index({ request, response }: HttpContext) {
    const { category, search, minRating, verified } = request.qs()

    let query = db
      .from('services')
      .join('providers', 'services.provider_id', 'providers.id')
      .where('services.status', 'LIVE')
      .select(
        'services.id',
        'services.provider_id',
        'services.category_name',
        'services.name',
        'services.description',
        'services.pricing_type',
        'services.price_display',
        'services.price_amount',
        'services.icon',
        'services.cover_image',
        'providers.business_name as provider_name',
        'providers.rating as provider_rating',
        'providers.review_count as provider_reviews',
        'providers.verified as provider_verified'
      )

    if (category && category !== 'All') {
      query = query.where('services.category_name', category)
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim().toLowerCase()}%`
      query = query.where((sub) => {
        sub.whereILike('services.name', q)
          .orWhereILike('services.category_name', q)
          .orWhereILike('providers.business_name', q)
      })
    }

    if (verified === 'true') {
      query = query.where('providers.verified', true)
    }

    if (minRating) {
      query = query.where('providers.rating', '>=', Number(minRating))
    }

    const services = await query.orderBy('services.id', 'desc')
    return response.json({
      success: true,
      data: services,
    })
  }

  async show({ params, response }: HttpContext) {
    const service = await db
      .from('services')
      .join('providers', 'services.provider_id', 'providers.id')
      .where('services.id', params.id)
      .select(
        'services.*',
        'providers.business_name as provider_name',
        'providers.rating as provider_rating',
        'providers.review_count as provider_reviews',
        'providers.verified as provider_verified',
        'providers.phone as provider_phone',
        'providers.whatsapp as provider_whatsapp'
      )
      .first()

    if (!service) {
      return response.status(404).json({
        success: false,
        message: 'Service not found',
      })
    }

    // Fetch service images if any
    const images = await db.from('service_images').where('service_id', service.id).orderBy('sort_order', 'asc')

    // Fetch provider service areas
    const areas = await db.from('provider_service_areas').where('provider_id', service.provider_id)
    const areaNames = areas.map((a) => a.locality).filter(Boolean)
    const resolvedArea = service.service_area_override || (areaNames.length > 0 ? areaNames.join(', ') : 'Rajapalayam')

    // Fetch provider social links
    const socialLinks = await db.from('provider_social_links').where('provider_id', service.provider_id)
    const formattedSocial = socialLinks.map((s) => ({ platform: s.platform, url: s.url }))

    return response.json({
      success: true,
      data: {
        ...service,
        title: service.name,
        coverImage: service.cover_image,
        price: service.price_amount,
        priceDisplay: service.price_display,
        category: service.category_name,
        serviceArea: resolvedArea,
        serviceAreaOverride: service.service_area_override,
        location: resolvedArea,
        inclusions: service.inclusions,
        terms: service.terms,
        duration: service.duration,
        setupTime: service.setup_time,
        highlights: service.highlights,
        videoUrl: service.video_url,
        socialLinks: formattedSocial,
        images: images.map((img) => img.image_url),
        imageObjects: images,
        provider: {
          id: service.provider_id,
          businessName: service.provider_name,
          rating: service.provider_rating,
          reviewCount: service.provider_reviews,
          verified: Boolean(service.provider_verified),
          phone: service.provider_phone,
          whatsapp: service.provider_whatsapp,
          location: areaNames.join(', ') || 'Rajapalayam',
          city: areaNames.join(', ') || 'Rajapalayam',
          serviceAreas: areaNames,
          socialLinks: formattedSocial,
        },
      },
    })
  }
}
