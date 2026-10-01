import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'data.sqlite3')
const db = new Database(dbPath)

const tablesToClear = [
  'review_replies',
  'reviews',
  'favorites',
  'availability',
  'bookings',
  'enquiries',
  'package_services',
  'packages',
  'service_images',
  'labour_listings',
  'services',
  'provider_social_links',
  'provider_service_areas',
  'providers',
  'users',
]

console.log('--- Clearing test data from Evently SQLite database ---')

db.transaction(() => {
  for (const table of tablesToClear) {
    db.prepare(`DELETE FROM ${table}`).run()
    console.log(`✓ Cleared table: ${table}`)
  }

  for (const table of tablesToClear) {
    try {
      db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table)
    } catch {
      // sqlite_sequence might not have an entry for every table
    }
  }
  console.log('✓ Reset auto-increment sequence counters to 0.')
})()

console.log('\n--- Current table counts ---')
for (const table of [...tablesToClear, 'categories']) {
  const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get()
  console.log(`${table.padEnd(25)}: ${row.count} rows`)
}
console.log('\nDatabase is now completely clean and ready for fresh user/provider testing!')
