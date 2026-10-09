import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class PackageController {
  async index({ request, response }: HttpContext) {
    const { eventType, search } = request.qs()

    let query = db
      .from('packages')
      .leftJoin('providers', 'packages.provider_id', 'providers.id')
      .where('packages.status', 'LIVE')
      .select(
        'packages.*',
        'packages.phone as package_phone',
        'packages.whatsapp as package_whatsapp',
        'packages.attribution_text as package_attribution_text',
        'providers.business_name as provider_name',
        'providers.rating as provider_rating',
        'providers.review_count as provider_reviews',
        'providers.verified as provider_verified',
        'providers.provider_status as provider_status',
        'providers.claimed as provider_claimed',
        'providers.source as provider_source',
        'providers.attribution_text as provider_attribution_text'
      )

    if (eventType && eventType !== 'All Packages') {
      query = query.where('packages.event_type', eventType)
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim().toLowerCase()}%`
      query = query.where((sub) => {
        sub.whereILike('packages.name', q)
          .orWhereILike('packages.event_type', q)
          .orWhereILike('providers.business_name', q)
      })
    }

    const packages = await query.orderBy('packages.id', 'desc')

    // Hydrate bundled services and reference images for each package
    const packageIds = packages.map((p) => p.id)
    const [bundledServices, packageImages] = await Promise.all([
      db
        .from('package_services')
        .join('services', 'package_services.service_id', 'services.id')
        .whereIn('package_services.package_id', packageIds)
        .select(
          'package_services.package_id',
          'services.id as service_id',
          'services.name as service_name',
          'services.category_name'
        ),
      db
        .from('package_images')
        .whereIn('package_id', packageIds)
        .orderBy('sort_order', 'asc'),
    ])

    const result = packages.map((pkg) => {
      const services = bundledServices.filter((s) => s.package_id === pkg.id)
      const images = packageImages.filter((img) => img.package_id === pkg.id).map((img) => img.image_url)
      const includesText = services.map((s) => s.service_name).join(' · ')
      const priceNum = Number(pkg.price_amount) || parseFloat(String(pkg.price_display || '').replace(/[^0-9.]/g, '')) || 0
      const isClaimed = Boolean(
        Number(pkg.provider_claimed) === 1 &&
        pkg.provider_status === 'CLAIMED_ACTIVE' &&
        pkg.provider_id
      )
      const resolvedAttribution =
        pkg.attribution_text ||
        pkg.package_attribution_text ||
        pkg.provider_attribution_text ||
        (isClaimed ? null : 'Public Listing • Powered by Google Search')

      return {
        ...pkg,
        price: priceNum,
        priceAmount: priceNum,
        priceDisplay: pkg.price_display || (priceNum > 0 ? `₹${priceNum.toLocaleString('en-IN')}` : 'On request'),
        eventType: pkg.event_type,
        pricingType: pkg.pricing_type,
        guestCapacity: pkg.guest_capacity,
        coverImage: pkg.cover_image,
        inclusions: pkg.inclusions,
        exclusions: pkg.exclusions,
        highlights: pkg.highlights,
        duration: pkg.duration,
        setupTime: pkg.setup_time,
        advanceNotice: pkg.advance_notice,
        terms: pkg.terms,
        customizable: Boolean(pkg.customizable ?? true),
        images,
        services,
        includes: includesText || pkg.description || 'Full celebration package',
        is_claimed: isClaimed,
        provider_claimed: isClaimed,
        provider_status: isClaimed ? 'CLAIMED_ACTIVE' : 'SHADOW',
        provider_name: isClaimed ? (pkg.provider_name || 'Verified Vendor') : 'Google Search',
        attribution_text: resolvedAttribution,
      }
    })

    return response.json({
      success: true,
      data: result,
    })
  }

  async show({ params, response }: HttpContext) {
    const pkg = await db
      .from('packages')
      .leftJoin('providers', 'packages.provider_id', 'providers.id')
      .where('packages.id', params.id)
      .select(
        'packages.*',
        'packages.phone as package_phone',
        'packages.whatsapp as package_whatsapp',
        'packages.attribution_text as package_attribution_text',
        'providers.business_name as provider_name',
        'providers.rating as provider_rating',
        'providers.review_count as provider_reviews',
        'providers.verified as provider_verified',
        'providers.provider_status as provider_status',
        'providers.claimed as provider_claimed',
        'providers.source as provider_source',
        'providers.attribution_text as provider_attribution_text',
        'providers.phone as provider_phone',
        'providers.whatsapp as provider_whatsapp'
      )
      .first()

    if (!pkg) {
      return response.status(404).json({
        success: false,
        message: 'Package not found',
      })
    }

    // Fetch joined bundled services and reference photos
    const [services, images] = await Promise.all([
      db
        .from('package_services')
        .join('services', 'package_services.service_id', 'services.id')
        .where('package_services.package_id', pkg.id)
        .select(
          'services.id',
          'services.name',
          'services.category_name',
          'services.price_display',
          'services.description',
          'services.icon'
        ),
      db
        .from('package_images')
        .where('package_id', pkg.id)
        .orderBy('sort_order', 'asc'),
    ])

    const priceNum = Number(pkg.price_amount) || parseFloat(String(pkg.price_display || '').replace(/[^0-9.]/g, '')) || 0
    const resolvedPhone = pkg.phone || pkg.package_phone || pkg.provider_phone || ''
    const resolvedWhatsapp = pkg.whatsapp || pkg.package_whatsapp || pkg.provider_whatsapp || resolvedPhone || ''
    const isClaimed = Boolean(
      Number(pkg.provider_claimed) === 1 &&
      pkg.provider_status === 'CLAIMED_ACTIVE' &&
      pkg.provider_id
    )
    const resolvedAttribution =
      pkg.attribution_text ||
      pkg.package_attribution_text ||
      pkg.provider_attribution_text ||
      (isClaimed ? null : 'Public Listing • Powered by Google Search')

    return response.json({
      success: true,
      data: {
        ...pkg,
        price: priceNum,
        priceAmount: priceNum,
        priceDisplay: pkg.price_display || (priceNum > 0 ? `₹${priceNum.toLocaleString('en-IN')}` : 'Price on request'),
        eventType: pkg.event_type,
        pricingType: pkg.pricing_type,
        guestCapacity: pkg.guest_capacity,
        coverImage: pkg.cover_image,
        inclusions: pkg.inclusions,
        exclusions: pkg.exclusions,
        highlights: pkg.highlights,
        duration: pkg.duration,
        setupTime: pkg.setup_time,
        advanceNotice: pkg.advance_notice,
        terms: pkg.terms,
        customizable: Boolean(pkg.customizable ?? true),
        images: images.map((img) => img.image_url),
        services,
        includes: services.map((s) => s.name).join(' · '),
        phone: resolvedPhone,
        whatsapp: resolvedWhatsapp,
        attribution_text: resolvedAttribution,
        is_claimed: isClaimed,
        provider_claimed: isClaimed,
        provider_status: isClaimed ? 'CLAIMED_ACTIVE' : 'SHADOW',
        provider: {
          id: isClaimed ? pkg.provider_id : null,
          businessName: isClaimed ? (pkg.provider_name || 'Verified Vendor') : 'Google Search',
          rating: isClaimed ? pkg.provider_rating : 0,
          reviewCount: isClaimed ? pkg.provider_reviews : 0,
          verified: isClaimed && Boolean(pkg.provider_verified),
          claimed: isClaimed,
          status: isClaimed ? 'CLAIMED_ACTIVE' : 'SHADOW',
          phone: resolvedPhone,
          whatsapp: resolvedWhatsapp,
          attributionText: resolvedAttribution,
        },
      },
    })
  }
}
