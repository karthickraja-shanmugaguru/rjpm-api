import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import jwt from 'jsonwebtoken'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const authHeader = ctx.request.header('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ctx.response.status(401).json({
        success: false,
        message: 'Authentication token is required',
      })
    }

    const token = authHeader.substring(7)
    const secret = env.get('JWT_SECRET', 'evently_jwt_secret_key_super_secure_2026')

    try {
      const decoded = jwt.verify(token, secret) as { userId: number; role: string }
      const user = await db.from('users').where('id', decoded.userId).first()
      if (!user) {
        return ctx.response.status(401).json({
          success: false,
          message: 'User no longer exists or session is invalid',
        })
      }

      // If user is a provider, fetch provider profile id as well
      let provider = null
      if (user.role === 'PROVIDER') {
        provider = await db.from('providers').where('user_id', user.id).first()
      }

      // Attach user & provider to ctx
      ;(ctx as any).authUser = user
      ;(ctx as any).authProvider = provider

      return await next()
    } catch {
      return ctx.response.status(401).json({
        success: false,
        message: 'Invalid or expired session token',
      })
    }
  }
}
