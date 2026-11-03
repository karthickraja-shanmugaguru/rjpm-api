import fs from 'node:fs'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'

const dbDir = app.makePath('database')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbHost = env.get('DB_HOST', '127.0.0.1')
const databaseUrl = env.get('DATABASE_URL') || process.env.DATABASE_URL
const isTiDB =
  (typeof dbHost === 'string' && dbHost.includes('tidbcloud.com')) ||
  (typeof databaseUrl === 'string' && databaseUrl.includes('tidbcloud.com'))

const isMysqlSsl =
  Boolean(env.get('DB_SSL')) ||
  String(process.env.DB_SSL || '').toLowerCase() === 'true' ||
  String(process.env.DB_SSL || '') === '1' ||
  isTiDB

const mysqlSsl = isMysqlSsl
  ? {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: env.get('DB_SSL_REJECT_UNAUTHORIZED') === false ? false : true,
    }
  : undefined

function getMysqlConnection() {
  if (databaseUrl && (databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mysqls://'))) {
    try {
      const parsed = new URL(databaseUrl)
      const parsedDb = parsed.pathname.replace(/^\//, '') || 'evently'
      return {
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 3306,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: (isTiDB && parsedDb === 'defaultdb') ? 'evently' : parsedDb,
        ssl: mysqlSsl,
      }
    } catch {
      // Fallback to standard env vars
    }
  }

  const rawDb = env.get('DB_DATABASE', 'evently')
  const targetDb = (isTiDB && rawDb === 'defaultdb') ? 'evently' : rawDb

  return {
    host: env.get('DB_HOST', '127.0.0.1'),
    port: env.get('DB_PORT', 3306),
    user: env.get('DB_USER', 'root'),
    password: env.get('DB_PASSWORD', ''),
    database: targetDb,
    ssl: mysqlSsl,
  }
}

const defaultConnection =
  env.get('DB_CONNECTION') ||
  (isTiDB ? 'mysql' : 'sqlite')

const dbConfig = defineConfig({
  connection: defaultConnection,
  connections: {
    sqlite: {
      client: 'better-sqlite3',
      connection: {
        filename: app.makePath('database/data.sqlite3'),
      },
      useNullAsDefault: true,
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      seeders: {
        paths: ['database/seeders'],
      },
    },
    mysql: {
      client: 'mysql2',
      connection: getMysqlConnection(),
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      seeders: {
        paths: ['database/seeders'],
      },
    },
    postgres: {
      client: 'pg',
      connection: env.get('DATABASE_URL') || {
        host: env.get('DB_HOST', '127.0.0.1'),
        port: env.get('DB_PORT', 5432),
        user: env.get('DB_USER', 'postgres'),
        password: env.get('DB_PASSWORD', ''),
        database: env.get('DB_DATABASE', 'evently'),
        ssl: env.get('DB_SSL') || env.get('DATABASE_URL') ? { rejectUnauthorized: false } : undefined,
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      seeders: {
        paths: ['database/seeders'],
      },
    },
    pg: {
      client: 'pg',
      connection: env.get('DATABASE_URL') || {
        host: env.get('DB_HOST', '127.0.0.1'),
        port: env.get('DB_PORT', 5432),
        user: env.get('DB_USER', 'postgres'),
        password: env.get('DB_PASSWORD', ''),
        database: env.get('DB_DATABASE', 'evently'),
        ssl: env.get('DB_SSL') || env.get('DATABASE_URL') ? { rejectUnauthorized: false } : undefined,
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      seeders: {
        paths: ['database/seeders'],
      },
    },
  },
})

export default dbConfig
