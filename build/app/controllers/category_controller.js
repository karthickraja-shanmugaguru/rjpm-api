import db from '@adonisjs/lucid/services/db';
import apiCache from '../utils/cache.js';
export default class CategoryController {
    async index({ response }) {
        const cached = apiCache.get('categories:all');
        if (cached) {
            return response.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600').json(cached);
        }
        try {
            const categories = await db.from('categories').orderBy('id', 'asc');
            const payload = {
                success: true,
                data: categories,
            };
            apiCache.set('categories:all', payload, 300);
            return response.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600').json(payload);
        }
        catch (err) {
            console.error('CategoryController error:', err);
            return response.status(500).json({
                success: false,
                error: String(err),
            });
        }
    }
}
//# sourceMappingURL=category_controller.js.map