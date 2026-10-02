import db from '@adonisjs/lucid/services/db';
export default class CategoryController {
    async index({ response }) {
        const categories = await db.from('categories').orderBy('id', 'asc');
        return response.json({
            success: true,
            data: categories,
        });
    }
}
//# sourceMappingURL=category_controller.js.map