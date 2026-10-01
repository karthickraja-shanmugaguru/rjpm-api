import { Env } from '@adonisjs/core/env';
export default await Env.create(new URL('../', import.meta.url), {
    NODE_ENV: Env.schema.enum.optional(['development', 'production', 'test']),
    PORT: Env.schema.number.optional(),
    APP_KEY: Env.schema.string.optional(),
    HOST: Env.schema.string.optional({ format: 'host' }),
    LOG_LEVEL: Env.schema.enum.optional(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),
    DB_CONNECTION: Env.schema.enum.optional(['sqlite', 'mysql']),
    DB_HOST: Env.schema.string.optional({ format: 'host' }),
    DB_PORT: Env.schema.number.optional(),
    DB_USER: Env.schema.string.optional(),
    DB_PASSWORD: Env.schema.string.optional(),
    DB_DATABASE: Env.schema.string.optional(),
    JWT_SECRET: Env.schema.string.optional(),
});
//# sourceMappingURL=env.js.map