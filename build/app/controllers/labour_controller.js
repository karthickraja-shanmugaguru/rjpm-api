import db from '@adonisjs/lucid/services/db';
export default class LabourController {
    async index({ request, response }) {
        const { type, search } = request.qs();
        let query = db.from('labour_listings').select('*');
        if (type && type !== 'All Labour') {
            query = query.where('type', type);
        }
        if (search && String(search).trim()) {
            const q = `%${String(search).trim().toLowerCase()}%`;
            query = query.where((sub) => {
                sub.whereILike('name', q).orWhereILike('type', q).orWhereILike('provider_name', q);
            });
        }
        const items = await query.orderBy('id', 'asc');
        return response.json({
            success: true,
            data: items,
        });
    }
}
//# sourceMappingURL=labour_controller.js.map