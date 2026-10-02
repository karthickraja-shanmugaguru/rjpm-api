import db from '@adonisjs/lucid/services/db';
export default class PackageController {
    async index({ request, response }) {
        const { eventType, search } = request.qs();
        let query = db
            .from('packages')
            .join('providers', 'packages.provider_id', 'providers.id')
            .where('packages.status', 'LIVE')
            .select('packages.id', 'packages.provider_id', 'packages.name', 'packages.event_type', 'packages.pricing_type', 'packages.price_display', 'packages.price_amount', 'packages.guest_capacity', 'packages.description', 'packages.icon', 'packages.cover_image', 'providers.business_name as provider_name', 'providers.rating as provider_rating', 'providers.review_count as provider_reviews', 'providers.verified as provider_verified');
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
        const bundledServices = await db
            .from('package_services')
            .join('services', 'package_services.service_id', 'services.id')
            .whereIn('package_services.package_id', packageIds)
            .select('package_services.package_id', 'services.id as service_id', 'services.name as service_name', 'services.category_name');
        const result = packages.map((pkg) => {
            const services = bundledServices.filter((s) => s.package_id === pkg.id);
            const includesText = services.map((s) => s.service_name).join(' · ');
            return {
                ...pkg,
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
        const services = await db
            .from('package_services')
            .join('services', 'package_services.service_id', 'services.id')
            .where('package_services.package_id', pkg.id)
            .select('services.id', 'services.name', 'services.category_name', 'services.price_display', 'services.description', 'services.icon');
        return response.json({
            success: true,
            data: {
                ...pkg,
                services,
                includes: services.map((s) => s.name).join(' · '),
            },
        });
    }
}
//# sourceMappingURL=package_controller.js.map