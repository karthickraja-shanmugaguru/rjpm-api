import fs from 'node:fs';
import env from '#start/env';
import app from '@adonisjs/core/services/app';
import { defineConfig } from '@adonisjs/lucid';
const dbDir = app.makePath('database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const targetDb = app.makePath('database/data.sqlite3');
const backupDb = app.makePath('database/data.sqlite3.backup');
const rootBackupDb = app.makePath('../database/data.sqlite3.backup');
if (!fs.existsSync(targetDb)) {
    if (fs.existsSync(backupDb)) {
        try {
            fs.copyFileSync(backupDb, targetDb);
        }
        catch { }
    }
    else if (fs.existsSync(rootBackupDb)) {
        try {
            fs.copyFileSync(rootBackupDb, targetDb);
        }
        catch { }
    }
}
const dbConfig = defineConfig({
    connection: env.get('DB_CONNECTION', 'sqlite'),
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
            connection: {
                host: env.get('DB_HOST', '127.0.0.1'),
                port: env.get('DB_PORT', 3306),
                user: env.get('DB_USER', 'root'),
                password: env.get('DB_PASSWORD', ''),
                database: env.get('DB_DATABASE', 'evently'),
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
});
export default dbConfig;
//# sourceMappingURL=database.js.map