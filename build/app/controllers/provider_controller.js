import db from '@adonisjs/lucid/services/db';
export default class ProviderController {
    async index({ request, response }) {
        const { category, search, verified, city } = request.qs();
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
        if (city && String(city).trim() && String(city).toLowerCase() !== 'all') {
            const cityClean = String(city).trim().toLowerCase();
            const matchingProviderIds = await db
                .from('provider_service_areas')
                .whereILike('locality', `%${cityClean}%`)
                .select('provider_id');
            const pIds = matchingProviderIds.map((m) => m.provider_id);
            if (pIds.length > 0) {
                query = query.whereIn('id', pIds);
            }
        }
        const providers = await query.orderBy('rating', 'desc');
        const providerIds = providers.map((p) => p.id);
        const services = await db.from('services').whereIn('provider_id', providerIds).where('status', 'LIVE');
        const areas = await db.from('provider_service_areas').whereIn('provider_id', providerIds);
        const result = providers.map((p) => {
            const pServices = services.filter((s) => s.provider_id === p.id);
            const startingPrice = pServices.length > 0 ? pServices[0].price_display : 'On request';
            const pAreas = areas.filter((a) => a.provider_id === p.id);
            const areaNames = pAreas.map((a) => a.locality).filter(Boolean);
            const locationDisplay = areaNames.length > 0
                ? areaNames.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(' · ')
                : 'Rajapalayam';
            const cleanCompleted = p.completed_events
                ? String(p.completed_events).replace(/\.0+$/, '')
                : '50+';
            return {
                id: p.id,
                businessName: p.business_name,
                category: p.primary_category,
                rating: p.rating,
                reviewCount: p.review_count,
                location: locationDisplay,
                experience: `${p.experience_years} yrs`,
                completedEvents: cleanCompleted,
                verified: Boolean(p.verified),
                price: startingPrice,
                serviceCount: pServices.length,
                coverImage: p.cover_image,
                logoImage: p.logo_image,
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
        const services = await db.from('services').where('provider_id', provider.id).where('status', 'LIVE').orderBy('id', 'desc');
        const formattedServices = services.map((s) => ({
            ...s,
            title: s.name,
            coverImage: s.cover_image,
            price: s.price_amount,
            priceDisplay: s.price_display,
        }));
        const packages = await db.from('packages').where('provider_id', provider.id).where('status', 'LIVE');
        const pkgIds = packages.map((p) => p.id);
        const [packageImages, pkgRelations] = await Promise.all([
            db.from('package_images').whereIn('package_id', pkgIds).orderBy('sort_order', 'asc'),
            db
                .from('package_services')
                .join('services', 'package_services.service_id', 'services.id')
                .whereIn('package_services.package_id', pkgIds)
                .select('package_services.package_id', 'services.id', 'services.name as title', 'services.category_name as category')
        ]);
        const formattedPackages = packages.map((p) => ({
            ...p,
            coverImage: p.cover_image,
            images: packageImages.filter((img) => img.package_id === p.id).map((img) => img.image_url),
            services: pkgRelations.filter((r) => r.package_id === p.id),
            includes: pkgRelations.filter((r) => r.package_id === p.id).map((r) => r.title).join(' · '),
        }));
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
                experience: `${Math.round(Number(provider.experience_years)) || 0} yrs`,
                yearsOfExperience: Math.round(Number(provider.experience_years)) || 0,
                experienceYears: Math.round(Number(provider.experience_years)) || 0,
                completedEvents: Math.round(Number(provider.completed_events)) || 0,
                responseTime: provider.response_time || 'Usually responds within 2 hours',
                about: provider.about,
                verified: Boolean(provider.verified),
                verificationStatus: provider.verification_status || (provider.verified ? 'VERIFIED' : 'PENDING'),
                phone: provider.phone,
                whatsapp: provider.whatsapp,
                coverImage: provider.cover_image,
                logoImage: provider.logo_image,
                serviceAreas: areas.map((a) => a.locality),
                services: formattedServices,
                packages: formattedPackages,
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
        const pkgIds = packages.map((p) => p.id);
        const [packageImages, pkgRelations] = await Promise.all([
            db.from('package_images').whereIn('package_id', pkgIds).orderBy('sort_order', 'asc'),
            db
                .from('package_services')
                .join('services', 'package_services.service_id', 'services.id')
                .whereIn('package_services.package_id', pkgIds)
                .select('package_services.package_id', 'services.id', 'services.name as title', 'services.category_name as category')
        ]);
        return response.json({
            success: true,
            data: packages.map((p) => ({
                ...p,
                coverImage: p.cover_image,
                images: packageImages.filter((img) => img.package_id === p.id).map((img) => img.image_url),
                services: pkgRelations.filter((r) => r.package_id === p.id),
            }))
        });
    }
    async getReviews({ params, response }) {
        const reviews = await db.from('reviews').where('provider_id', params.id).orderBy('id', 'desc');
        return response.json({ success: true, data: reviews });
    }
}
//# sourceMappingURL=provider_controller.js.map