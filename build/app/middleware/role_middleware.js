export default class RoleMiddleware {
    async handle(ctx, next, allowedRoles) {
        const user = ctx.authUser;
        if (!user) {
            return ctx.response.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        if (user.role === 'ADMIN') {
            return await next();
        }
        if (!allowedRoles.includes(user.role)) {
            return ctx.response.status(403).json({
                success: false,
                message: `Forbidden: Access restricted to ${allowedRoles.join(' or ')} role`,
            });
        }
        return await next();
    }
}
//# sourceMappingURL=role_middleware.js.map