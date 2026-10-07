import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const CATEGORIES = [
  { name: 'Catering', slug: 'catering', color: '#ea580c', bg: 'linear-gradient(135deg,#ffedd5,#fff7ed)' },
  { name: 'Mandapam', slug: 'mandapam', color: '#b45309', bg: 'linear-gradient(135deg,#ffedd5,#fff7ed)' },
  { name: 'Panthal & Tent', slug: 'panthal-tent', color: '#c2410c', bg: 'linear-gradient(135deg,#ffedd5,#fff7ed)' },
  { name: 'Decoration', slug: 'decoration', color: '#e11d48', bg: 'linear-gradient(135deg,#ffe4e6,#fff1f2)' },
  { name: 'Muhurtham Malai', slug: 'muhurtham-malai', color: '#dc2626', bg: 'linear-gradient(135deg,#fee2e2,#fef2f2)' },
  { name: 'Flowers', slug: 'flowers', color: '#16a34a', bg: 'linear-gradient(135deg,#dcfce7,#f0fdf4)' },
  { name: 'Nadaswaram', slug: 'nadaswaram', color: '#d97706', bg: 'linear-gradient(135deg,#fef3c7,#fffbeb)' },
  { name: 'Photography', slug: 'photography', color: '#0284c7', bg: 'linear-gradient(135deg,#e0f2fe,#f0f9ff)' },
  { name: 'Videography', slug: 'videography', color: '#7c3aed', bg: 'linear-gradient(135deg,#ede9fe,#f5f3ff)' },
  { name: 'Music & DJ', slug: 'music-dj', color: '#9333ea', bg: 'linear-gradient(135deg,#f3e8ff,#faf5ff)' },
  { name: 'Seer Plates', slug: 'seer-plates', color: '#e11d48', bg: 'linear-gradient(135deg,#ffe4e6,#fff1f2)' },
  { name: 'Kolam', slug: 'kolam', color: '#0d9488', bg: 'linear-gradient(135deg,#ccfbf1,#f0fdfa)' },
  { name: 'Priest & Rituals', slug: 'priest-rituals', color: '#d97706', bg: 'linear-gradient(135deg,#fef3c7,#fffbeb)' },
  { name: 'Makeup', slug: 'makeup', color: '#db2777', bg: 'linear-gradient(135deg,#fce7f3,#fdf2f8)' },
  { name: 'Mehendi', slug: 'mehendi', color: '#059669', bg: 'linear-gradient(135deg,#d1fae5,#ecfdf5)' },
  { name: 'Jewellery', slug: 'jewellery', color: '#d97706', bg: 'linear-gradient(135deg,#fef3c7,#fffbeb)' },
  { name: 'Sweets & Desserts', slug: 'sweets-desserts', color: '#f59e0b', bg: 'linear-gradient(135deg,#fef3c7,#fffbeb)' },
  { name: 'Return Gifts', slug: 'return-gifts', color: '#be185d', bg: 'linear-gradient(135deg,#fce7f3,#fdf2f8)' },
  { name: 'Live Stalls', slug: 'live-stalls', color: '#ea580c', bg: 'linear-gradient(135deg,#ffedd5,#fff7ed)' },
  { name: 'Furniture', slug: 'furniture', color: '#4f46e5', bg: 'linear-gradient(135deg,#e0e7ff,#eef2ff)' },
  { name: 'Generator', slug: 'generator', color: '#475569', bg: 'linear-gradient(135deg,#e2e8f0,#f8fafc)' },
  { name: 'Water Supply', slug: 'water-supply', color: '#2563eb', bg: 'linear-gradient(135deg,#dbeafe,#eff6ff)' },
  { name: 'Chenda Melam', slug: 'chenda-melam', color: '#c2410c', bg: 'linear-gradient(135deg,#ffedd5,#fff7ed)' },
  { name: 'Event Staff', slug: 'event-staff', color: '#475569', bg: 'linear-gradient(135deg,#e2e8f0,#f8fafc)' },
  { name: 'Transport', slug: 'transport', color: '#1d4ed8', bg: 'linear-gradient(135deg,#dbeafe,#eff6ff)' },
  { name: 'Invitations', slug: 'invitations', color: '#be185d', bg: 'linear-gradient(135deg,#fce7f3,#fdf2f8)' },
  { name: 'Audio Visual', slug: 'audio-visual', color: '#6366f1', bg: 'linear-gradient(135deg,#e0e7ff,#eef2ff)' },
  { name: 'Special Effects', slug: 'special-effects', color: '#ec4899', bg: 'linear-gradient(135deg,#fce7f3,#fdf2f8)' },
  { name: 'Tailoring', slug: 'tailoring', color: '#0d9488', bg: 'linear-gradient(135deg,#ccfbf1,#f0fdfa)' },
  { name: 'Beauty & Spa', slug: 'beauty-spa', color: '#0891b2', bg: 'linear-gradient(135deg,#cffafe,#ecfeff)' },
  { name: 'Valet Parking', slug: 'valet-parking', color: '#3b82f6', bg: 'linear-gradient(135deg,#dbeafe,#eff6ff)' },
  { name: 'Security', slug: 'security', color: '#334155', bg: 'linear-gradient(135deg,#f1f5f9,#f8fafc)' },
]

async function cleanAll() {
  console.log('=== 1. CLEANING REMOTE MYSQL DATABASE (AIVEN) ===')
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  })
  console.log('✓ Connected to MySQL database.')

  const tablesToClear = [
    'review_replies',
    'reviews',
    'favorites',
    'availability',
    'bookings',
    'enquiries',
    'package_services',
    'package_images',
    'packages',
    'service_images',
    'labour_listings',
    'services',
    'provider_social_links',
    'provider_service_areas',
    'providers',
    'users',
    'categories',
  ]

  await connection.query('SET FOREIGN_KEY_CHECKS = 0')
  for (const table of tablesToClear) {
    try {
      await connection.query(`TRUNCATE TABLE \`${table}\``)
      console.log(`✓ Truncated table: ${table}`)
    } catch (e) {
      console.log(`Note: Table ${table} not found or failed: ${e.message}`)
    }
  }

  // Seed Clean Categories into MySQL
  const now = new Date()
  for (const cat of CATEGORIES) {
    await connection.query(
      'INSERT INTO categories (name, slug, color, bg, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [cat.name, cat.slug, cat.color, cat.bg, now, now]
    )
  }
  console.log(`✓ Inserted ${CATEGORIES.length} official categories into categories table.`)

  await connection.query('SET FOREIGN_KEY_CHECKS = 1')

  console.log('\n--- MySQL Table Status ---')
  for (const table of [...tablesToClear]) {
    try {
      const [rows] = await connection.query(`SELECT COUNT(*) as cnt FROM \`${table}\``)
      console.log(`${table.padEnd(25)}: ${rows[0].cnt} rows`)
    } catch {
      // ignore
    }
  }
  await connection.end()

  console.log('\n=== 2. CLEANING LOCAL SQLITE DATABASE ===')
  const sqliteFiles = [
    path.join(__dirname, 'data.sqlite3'),
    path.join(__dirname, '..', 'data.sqlite3'),
  ]

  for (const f of sqliteFiles) {
    try {
      const db = new Database(f)
      db.transaction(() => {
        for (const table of tablesToClear) {
          try {
            db.prepare(`DELETE FROM ${table}`).run()
          } catch {}
        }
        for (const cat of CATEGORIES) {
          try {
            db.prepare('INSERT OR IGNORE INTO categories (name, slug, color, bg, created_at) VALUES (?, ?, ?, ?, ?)')
              .run(cat.name, cat.slug, cat.color, cat.bg, now.toISOString())
          } catch {}
        }
      })()
      console.log(`✓ Cleaned local SQLite file: ${f}`)
    } catch (e) {
      console.log(`Notice for ${f}: ${e.message}`)
    }
  }

  console.log('\n🎉 ALL TEST DATA COMPLETELY REMOVED! THE DATABASE IS FRESH AND READY FOR REAL USERS.')
}

cleanAll().catch((err) => {
  console.error('Error during cleanup:', err)
  process.exit(1)
})
