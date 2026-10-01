import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class RoleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, allowedRoles: string[]) {
    const user = (ctx as any).authUser
    if (!user) {
      return ctx.response.status(401).json({
        success: false,
        message: 'Unauthorized',
      })
    }

    if (user.role === 'ADMIN') {
      return await next()
    }

    if (!allowedRoles.includes(user.role)) {
      return ctx.response.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to ${allowedRoles.join(' or ')} role`,
      })
    }

    return await next()
  }
}
