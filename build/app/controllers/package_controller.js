import db from '@adonisjs/lucid/services/db';
export default class PackageController {
    async index({ request, response }) {
        const { eventType, search } = request.qs();
        let query = db
            .from('packages')
            .join('providers', 'packages.provider_id', 'providers.id')
            .where('packages.status', 'LIVE')
            .select('packages.*', 'providers.business_name as provider_name', 'providers.rating as provider_rating', 'providers.review_count as provider_reviews', 'providers.verified as provider_verified');
        if (eventType && eventType !== 'All Packages') {
            query = query.where('packages.event_type', eventType);
        }
        if (search && String(search).trim()) {
            const q = `%${String(search).trim().toLowerCase()}%`;
            query = query.where((sub) => {
                sub.whereILike('packages.name', q)
                    .orWhereILike('packages.event_type', q)
                    .orWhereILike('providers.business_name', q);
            });
        }
        const packages = await query.orderBy('packages.id', 'desc');
        const packageIds = packages.map((p) => p.id);
        const [bundledServices, packageImages] = await Promise.all([
            db
                .from('package_services')
                .join('services', 'package_services.service_id', 'services.id')
                .whereIn('package_services.package_id', packageIds)
                .select('package_services.package_id', 'services.id as service_id', 'services.name as service_name', 'services.category_name'),
            db
                .from('package_images')
                .whereIn('package_id', packageIds)
                .orderBy('sort_order', 'asc'),
        ]);
        const result = packages.map((pkg) => {
            const services = bundledServices.filter((s) => s.package_id === pkg.id);
            const images = packageImages.filter((img) => img.package_id === pkg.id).map((img) => img.image_url);
            const includesText = services.map((s) => s.service_name).join(' · ');
            const priceNum = Number(pkg.price_amount) || parseFloat(String(pkg.price_display || '').replace(/[^0-9.]/g, '')) || 0;
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
            };
        });
        return response.json({
            success: true,
            data: result,
        });
    }
    async show({ params, response }) {
        const pkg = await db
            .from('packages')
            .join('providers', 'packages.provider_id', 'providers.id')
            .where('packages.id', params.id)
            .select('packages.*', 'providers.business_name as provider_name', 'providers.rating as provider_rating', 'providers.review_count as provider_reviews', 'providers.verified as provider_verified', 'providers.phone as provider_phone', 'providers.whatsapp as provider_whatsapp')
            .first();
        if (!pkg) {
            return response.status(404).json({
                success: false,
                message: 'Package not found',
            });
        }
        const [services, images] = await Promise.all([
            db
                .from('package_services')
                .join('services', 'package_services.service_id', 'services.id')
                .where('package_services.package_id', pkg.id)
                .select('services.id', 'services.name', 'services.category_name', 'services.price_display', 'services.description', 'services.icon'),
            db
                .from('package_images')
                .where('package_id', pkg.id)
                .orderBy('sort_order', 'asc'),
        ]);
        const priceNum = Number(pkg.price_amount) || parseFloat(String(pkg.price_display || '').replace(/[^0-9.]/g, '')) || 0;
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
            },
        });
    }
}
//# sourceMappingURL=package_controller.js.map