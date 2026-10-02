import db from '@adonisjs/lucid/services/db';
export default class ServiceController {
    async index({ request, response }) {
        const { category, search, minRating, verified } = request.qs();
        let query = db
            .from('services')
            .join('providers', 'services.provider_id', 'providers.id')
            .where('services.status', 'LIVE')
            .select('services.id', 'services.provider_id', 'services.category_name', 'services.name', 'services.description', 'services.pricing_type', 'services.price_display', 'services.price_amount', 'services.icon', 'services.cover_image', 'providers.business_name as provider_name', 'providers.rating as provider_rating', 'providers.review_count as provider_reviews', 'providers.verified as provider_verified');
        if (category && category !== 'All') {
            query = query.where('services.category_name', category);
        }
        if (search && String(search).trim()) {
            const q = `%${String(search).trim().toLowerCase()}%`;
            query = query.where((sub) => {
                sub.whereILike('services.name', q)
                    .orWhereILike('services.category_name', q)
                    .orWhereILike('providers.business_name', q);
            });
        }
        if (verified === 'true') {
            query = query.where('providers.verified', true);
        }
        if (minRating) {
            query = query.where('providers.rating', '>=', Number(minRating));
        }
        const services = await query.orderBy('services.id', 'desc');
        return response.json({
            success: true,
            data: services,
        });
    }
    async show({ params, response }) {
        const service = await db
            .from('services')
            .join('providers', 'services.provider_id', 'providers.id')
            .where('services.id', params.id)
            .select('services.*', 'providers.business_name as provider_name', 'providers.rating as provider_rating', 'providers.review_count as provider_reviews', 'providers.verified as provider_verified', 'providers.phone as provider_phone', 'providers.whatsapp as provider_whatsapp')
            .first();
        if (!service) {
            return response.status(404).json({
                success: false,
                message: 'Service not found',
            });
        }
        const images = await db.from('service_images').where('service_id', service.id).orderBy('sort_order', 'asc');
        return response.json({
            success: true,
            data: {
                ...service,
                images,
            },
        });
    }
}
//# sourceMappingURL=service_controller.js.map