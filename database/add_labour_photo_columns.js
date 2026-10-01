import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'data.sqlite3'))

const columns = db.prepare('PRAGMA table_info(labour_listings)').all().map((c) => c.name)

if (!columns.includes('cover_image')) {
  db.prepare('ALTER TABLE labour_listings ADD COLUMN cover_image TEXT').run()
  console.log('Added cover_image column')
}

if (!columns.includes('images')) {
  db.prepare('ALTER TABLE labour_listings ADD COLUMN images TEXT').run()
  console.log('Added images column')
}

if (!columns.includes('status')) {
  db.prepare("ALTER TABLE labour_listings ADD COLUMN status VARCHAR(20) DEFAULT 'LIVE'").run()
  console.log('Added status column')
}

console.log('Final columns:', db.prepare('PRAGMA table_info(labour_listings)').all().map((c) => c.name))
