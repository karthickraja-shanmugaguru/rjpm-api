import db from '@adonisjs/lucid/services/db';
export default class LabourController {
    async index({ request, response }) {
        const { type, category, search } = request.qs();
        const selectedType = type || category;
        let query = db
            .from('labour_listings')
            .leftJoin('providers', 'labour_listings.provider_id', 'providers.id')
            .select('labour_listings.*', 'providers.phone as provider_phone', 'providers.whatsapp as provider_whatsapp', 'providers.rating as provider_rating', 'providers.verified as provider_verified');
        if (selectedType && selectedType !== 'All Labour') {
            query = query.where('labour_listings.type', selectedType);
        }
        if (search && String(search).trim()) {
            const q = `%${String(search).trim().toLowerCase()}%`;
            query = query.where((sub) => {
                sub.whereILike('labour_listings.name', q)
                    .orWhereILike('labour_listings.type', q)
                    .orWhereILike('labour_listings.provider_name', q);
            });
        }
        const items = await query.orderBy('labour_listings.id', 'desc');
        const formatted = items.map((l) => {
            let parsedImages = [];
            if (typeof l.images === 'string') {
                try {
                    parsedImages = JSON.parse(l.images);
                }
                catch {
                    parsedImages = [];
                }
            }
            else if (Array.isArray(l.images)) {
                parsedImages = l.images;
            }
            return {
                ...l,
                coverImage: l.cover_image,
                images: parsedImages,
            };
        });
        return response.json({
            success: true,
            data: formatted,
        });
    }
    async show({ params, response }) {
        const item = await db
            .from('labour_listings')
            .leftJoin('providers', 'labour_listings.provider_id', 'providers.id')
            .where('labour_listings.id', params.id)
            .select('labour_listings.*', 'providers.phone as provider_phone', 'providers.whatsapp as provider_whatsapp', 'providers.rating as provider_rating', 'providers.verified as provider_verified')
            .first();
        if (!item) {
            return response.status(404).json({
                success: false,
                message: 'Labour listing not found',
            });
        }
        let parsedImages = [];
        if (typeof item.images === 'string') {
            try {
                parsedImages = JSON.parse(item.images);
            }
            catch {
                parsedImages = [];
            }
        }
        else if (Array.isArray(item.images)) {
            parsedImages = item.images;
        }
        return response.json({
            success: true,
            data: {
                ...item,
                coverImage: item.cover_image,
                images: parsedImages,
            },
        });
    }
}
//# sourceMappingURL=labour_controller.js.map