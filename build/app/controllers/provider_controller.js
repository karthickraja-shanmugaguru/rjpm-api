import db from '@adonisjs/lucid/services/db';
export default class ProviderController {
    async index({ request, response }) {
        const { category, search, verified } = request.qs();
        let query = db.from('providers').select('*');
        if (category && category !== 'All') {
            query = query.where('primary_category', category);
        }
        if (search && String(search).trim()) {
            const q = `%${String(search).trim().toLowerCase()}%`;
            query = query.where((sub) => {
                sub.whereILike('business_name', q).orWhereILike('primary_category', q);
            });
        }
        if (verified === 'true') {
            query = query.where('verified', true);
        }
        const providers = await query.orderBy('rating', 'desc');
        const providerIds = providers.map((p) => p.id);
        const services = await db.from('services').whereIn('provider_id', providerIds).where('status', 'LIVE');
        const result = providers.map((p) => {
            const pServices = services.filter((s) => s.provider_id === p.id);
            const startingPrice = pServices.length > 0 ? pServices[0].price_display : 'On request';
            return {
                id: p.id,
                businessName: p.business_name,
                category: p.primary_category,
                rating: p.rating,
                reviewCount: p.review_count,
                location: 'Chennai',
                experience: `${p.experience_years} yrs`,
                completedEvents: p.completed_events,
                verified: Boolean(p.verified),
                price: startingPrice,
                serviceCount: pServices.length,
            };
        });
        return response.json({
            success: true,
            data: result,
        });
    }
    async show({ params, response }) {
        const provider = await db.from('providers').where('id', params.id).first();
        if (!provider) {
            return response.status(404).json({
                success: false,
                message: 'Provider not found',
            });
        }
        const areas = await db.from('provider_service_areas').where('provider_id', provider.id);
        const services = await db.from('services').where('provider_id', provider.id).where('status', 'LIVE');
        const packages = await db.from('packages').where('provider_id', provider.id).where('status', 'LIVE');
        const reviews = await db.from('reviews').where('provider_id', provider.id).orderBy('id', 'desc');
        const reviewIds = reviews.map((r) => r.id);
        const replies = await db.from('review_replies').whereIn('review_id', reviewIds);
        const formattedReviews = reviews.map((r) => ({
            ...r,
            reply: replies.find((rep) => rep.review_id === r.id)?.reply_text || null,
        }));
        const socialLinks = await db.from('provider_social_links').where('provider_id', provider.id);
        return response.json({
            success: true,
            data: {
                id: provider.id,
                businessName: provider.business_name,
                ownerName: provider.owner_name,
                category: provider.primary_category,
                rating: provider.rating,
                reviewCount: provider.review_count,
                experience: `${provider.experience_years} yrs`,
                completedEvents: provider.completed_events,
                about: provider.about,
                verified: Boolean(provider.verified),
                phone: provider.phone,
                whatsapp: provider.whatsapp,
                serviceAreas: areas.map((a) => a.locality),
                services,
                packages,
                reviews: formattedReviews,
                socialLinks,
            },
        });
    }
    async getServices({ params, response }) {
        const services = await db.from('services').where('provider_id', params.id).where('status', 'LIVE');
        return response.json({ success: true, data: services });
    }
    async getPackages({ params, response }) {
        const packages = await db.from('packages').where('provider_id', params.id).where('status', 'LIVE');
        return response.json({ success: true, data: packages });
    }
    async getReviews({ params, response }) {
        const reviews = await db.from('reviews').where('provider_id', params.id).orderBy('id', 'desc');
        return response.json({ success: true, data: reviews });
    }
}
//# sourceMappingURL=provider_controller.js.map