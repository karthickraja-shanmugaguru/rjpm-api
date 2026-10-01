import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class CategoryController {
  async index({ response }: HttpContext) {
    try {
      const categories = await db.from('categories').orderBy('id', 'asc')
      return response.json({
        success: true,
        data: categories,
      })
    } catch (err) {
      console.error('CategoryController error:', err)
      return response.status(500).json({
        success: false,
        error: String(err),
      })
    }
  }
}
