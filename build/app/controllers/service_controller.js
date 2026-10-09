import db from '@adonisjs/lucid/services/db';
export default class ServiceController {
    async index({ request, response }) {
        const { category, search, minRating, verified, city } = request.qs();
        let query = db
            .from('services')
            .leftJoin('providers', 'services.provider_id', 'providers.id')
            .where('services.status', 'LIVE')
            .select('services.id', 'services.provider_id', 'services.category_name', 'services.name', 'services.description', 'services.pricing_type', 'services.price_display', 'services.price_amount', 'services.icon', 'services.cover_image', 'services.service_area_override', 'services.phone as service_phone', 'services.whatsapp as service_whatsapp', 'services.attribution_text as service_attribution_text', 'providers.business_name as provider_name', 'providers.rating as provider_rating', 'providers.review_count as provider_reviews', 'providers.verified as provider_verified', 'providers.provider_status as provider_status', 'providers.claimed as provider_claimed', 'providers.source as provider_source', 'providers.attribution_text as provider_attribution_text');
        if (category && category !== 'All') {
            const qCat = String(category).trim().toLowerCase();
            const baseStem = qCat.split('/')[0].split('&')[0].trim();
            query = query.where((sub) => {
                sub.whereILike('services.category_name', `%${qCat}%`)
                    .orWhereILike('services.category_name', `%${baseStem}%`);
            });
        }
        if (search && String(search).trim()) {
            const q = `%${String(search).trim().toLowerCase()}%`;
            query = query.where((sub) => {
                sub.whereILike('services.name', q)
                    .orWhereILike('services.category_name', q)
                    .orWhereILike('providers.business_name', q);
            });
        }
        if (city && String(city).trim() && String(city).toLowerCase() !== 'all') {
            const cityClean = String(city).trim().toLowerCase();
            query = query.where((sub) => {
                sub.whereILike('services.service_area_override', `%${cityClean}%`)
                    .orWhereILike('services.service_area_override', '%entire%')
                    .orWhereNull('services.service_area_override');
            });
        }
        if (verified === 'true') {
            query = query.where((sub) => {
                sub.where('providers.verified', true)
                    .orWhere('services.attribution_text', 'like', '%Google Search%');
            });
        }
        if (minRating) {
            query = query.where('providers.rating', '>=', Number(minRating));
        }
        const rawServices = await query.orderBy('services.id', 'desc');
        const formatted = rawServices.map((s) => ({
            ...s,
            title: s.name,
            price: s.price_amount,
            priceDisplay: s.price_display,
            coverImage: s.cover_image,
            category: s.category_name,
            location: s.service_area_override || 'Rajapalayam',
            providerName: s.provider_name || '',
            rating: s.provider_rating || 4.8,
            reviewCount: s.provider_reviews || 0,
            verified: Boolean(s.provider_verified),
        }));
        return response.json({
            success: true,
            data: formatted,
        });
    }
    async show({ params, response }) {
        const service = await db
            .from('services')
            .leftJoin('providers', 'services.provider_id', 'providers.id')
            .where('services.id', params.id)
            .select('services.*', 'providers.business_name as provider_name', 'providers.rating as provider_rating', 'providers.review_count as provider_reviews', 'providers.verified as provider_verified', 'providers.provider_status as provider_status', 'providers.claimed as provider_claimed', 'providers.source as provider_source', 'providers.attribution_text as provider_attribution_text', 'providers.phone as provider_phone', 'providers.whatsapp as provider_whatsapp')
            .first();
        if (!service) {
            return response.status(404).json({
                success: false,
                message: 'Service not found',
            });
        }
        const images = await db.from('service_images').where('service_id', service.id).orderBy('sort_order', 'asc');
        let areaNames = [];
        let socialLinks = [];
        if (service.provider_id) {
            const areas = await db.from('provider_service_areas').where('provider_id', service.provider_id);
            areaNames = areas.map((a) => a.locality).filter(Boolean);
            const sLinks = await db.from('provider_social_links').where('provider_id', service.provider_id);
            socialLinks = sLinks.map((s) => ({ platform: s.platform, url: s.url }));
        }
        const resolvedArea = service.service_area_override || (areaNames.length > 0 ? areaNames.join(', ') : 'Rajapalayam');
        const resolvedPhone = service.phone || service.provider_phone || '';
        const resolvedWhatsapp = service.whatsapp || service.provider_whatsapp || resolvedPhone || '';
        const isClaimed = Boolean(Number(service.provider_claimed) === 1 &&
            service.provider_status === 'CLAIMED_ACTIVE' &&
            service.provider_id);
        const resolvedAttribution = service.attribution_text ||
            service.provider_attribution_text ||
            (isClaimed ? null : 'Public Listing • Powered by Google Search');
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
                socialLinks,
                images: images.map((img) => img.image_url),
                imageObjects: images,
                phone: resolvedPhone,
                whatsapp: resolvedWhatsapp,
                attribution_text: resolvedAttribution,
                is_claimed: isClaimed,
                provider_claimed: isClaimed,
                provider_status: isClaimed ? 'CLAIMED_ACTIVE' : 'SHADOW',
                provider_attribution_text: resolvedAttribution,
                provider: {
                    id: isClaimed ? service.provider_id : null,
                    businessName: isClaimed ? (service.provider_name || 'Verified Vendor') : (service.provider_name || ''),
                    rating: isClaimed ? service.provider_rating : 0,
                    reviewCount: isClaimed ? service.provider_reviews : 0,
                    verified: isClaimed && Boolean(service.provider_verified),
                    claimed: isClaimed,
                    status: isClaimed ? 'CLAIMED_ACTIVE' : 'SHADOW',
                    phone: resolvedPhone,
                    whatsapp: resolvedWhatsapp,
                    location: areaNames.join(', ') || 'Rajapalayam',
                    city: areaNames.join(', ') || 'Rajapalayam',
                    serviceAreas: areaNames,
                    socialLinks,
                    attributionText: resolvedAttribution,
                },
            },
        });
    }
}
//# sourceMappingURL=service_controller.js.map