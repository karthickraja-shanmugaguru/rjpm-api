import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'data.sqlite3'))

const labourItems = [
  {
    type: 'Food & Panthi Servers',
    name: 'Traditional Panthi & Buffet Food Servers',
    provider_name: 'Annapoorna Event Staffing (RJPM)',
    provider_id: 1,
    price_display: 'From ₹550 / staff',
    price_amount: 550,
    rating: 0,
    verified: 1,
    details: 'Trained in traditional banana-leaf panthi serving sequence (salt, sweet, kootu, poriyal, rice, sambar, rasam, payasam) in spotless clean uniforms.',
  },
  {
    type: 'Kitchen Helpers & Cutters',
    name: 'Vegetable Cutters & Kitchen Assistants',
    provider_name: 'Sri Krishna Catering Helpers',
    provider_id: 1,
    price_display: 'From ₹500 / staff',
    price_amount: 500,
    rating: 0,
    verified: 1,
    details: 'Fast, hygienic chopping for bulk weddings (50kg+ vegetables), grinding, coconut grating, and cooking assistant support.',
  },
  {
    type: 'Dishwashers & Vessel Cleaners',
    name: 'Heavy Catering Boiler & Vessel Cleaners',
    provider_name: 'CleanPro Event Services',
    provider_id: 1,
    price_display: 'From ₹600 / staff',
    price_amount: 600,
    rating: 0,
    verified: 1,
    details: 'Skilled in washing large catering vessels, brass boilers, steel dinner plates, and silver dining sets with hot water sanitization.',
  },
  {
    type: 'Cleaning Staff',
    name: 'Dining Hall & Mandapam Cleaners',
    provider_name: 'HelpingHands Event Staffing',
    provider_id: 1,
    price_display: 'From ₹450 / staff',
    price_amount: 450,
    rating: 0,
    verified: 1,
    details: 'Continuous dining table wiping, banana leaf disposal, floor mopping between panthi batches, and post-event waste clearing.',
  },
  {
    type: 'Panthal & Shamiana Riggers',
    name: 'Heavy Pandal & Bamboo Rigging Crew',
    provider_name: 'Sri Murugan Panthal Works',
    provider_id: 1,
    price_display: 'From ₹750 / staff',
    price_amount: 750,
    rating: 0,
    verified: 1,
    details: 'Experienced pandal rigging team for high-rise bamboo frames, waterproof German shamianas, and fabric ceiling draping.',
  },
  {
    type: 'Setup & Furniture Crew',
    name: 'Banquet Furniture & Stage Setup Crew',
    provider_name: 'EventRent Furniture & Chairs',
    provider_id: 1,
    price_display: 'From ₹550 / staff',
    price_amount: 550,
    rating: 0,
    verified: 1,
    details: 'Rapid unloading and arrangement of 500+ banquet chairs, round dining tables, sofa sets, VIP seating, and stage carpets.',
  },
  {
    type: 'Valet Parking & Marshals',
    name: 'Uniformed Valet Parking Drivers',
    provider_name: 'SafeDrive Valet & Marshals',
    provider_id: 1,
    price_display: 'From ₹700 / staff',
    price_amount: 700,
    rating: 0,
    verified: 1,
    details: 'Licensed, courteous drivers with parking token systems, safe car parking, and traffic marshals to avoid mandapam congestion.',
  },
  {
    type: 'Security & Bouncers',
    name: 'Certified Bouncers & Event Security Guards',
    provider_name: 'Z-Force Event Security Squad',
    provider_id: 1,
    price_display: 'From ₹950 / staff',
    price_amount: 950,
    rating: 0,
    verified: 1,
    details: 'Professional bouncers and security personnel for gate entry control, VIP crowd handling, and valuable gift counter security.',
  },
  {
    type: 'Hospitality & Thamboolam Staff',
    name: 'Traditional Welcome & Thamboolam Hosts',
    provider_name: 'Royal Welcome Hospitality',
    provider_id: 1,
    price_display: 'From ₹650 / staff',
    price_amount: 650,
    rating: 0,
    verified: 1,
    details: 'Traditional saree-clad welcome hostesses with panneer sombu (rose water), sandalwood, kalkandu, and gift thamboolam bag distribution.',
  },
  {
    type: 'Luggage & Room Attendants',
    name: 'Mandapam Room Attendants & Luggage Boys',
    provider_name: 'HelpingHands Event Staffing',
    provider_id: 1,
    price_display: 'From ₹500 / staff',
    price_amount: 500,
    rating: 0,
    verified: 1,
    details: 'Assisting wedding guests with luggage transfer from vehicles to marriage hall AC guest rooms, towel supply, and drinking water coordination.',
  },
  {
    type: 'Sound, Light & Generator Crew',
    name: 'Electrical, Lighting & Generator Attendants',
    provider_name: 'SparkEvent Technical Crew',
    provider_id: 1,
    price_display: 'From ₹800 / staff',
    price_amount: 800,
    rating: 0,
    verified: 1,
    details: 'On-site electricians for heavy generator fuel monitoring, focus spotlight rigging, mic testing, and uninterrupted power supply.',
  },
  {
    type: 'Flower & Garland Helpers',
    name: 'On-site Floral Stringers & Garland Assistants',
    provider_name: 'Malar Arts Floral Assistants',
    provider_id: 1,
    price_display: 'From ₹600 / staff',
    price_amount: 600,
    rating: 0,
    verified: 1,
    details: 'Skilled garland makers for stringing fresh jasmine (malligai), stage floral pillars, entrance toranam tying, and car decoration support.',
  },
  {
    type: 'Pooja & Homam Assistants',
    name: 'Vedic Pooja & Homakunda Helpers',
    provider_name: 'Divya Sankalpam Pooja Helpers',
    provider_id: 1,
    price_display: 'From ₹550 / staff',
    price_amount: 550,
    rating: 0,
    verified: 1,
    details: 'Preparation of homam firewood, samithu sticks, cleaning brass kuthuvilakku, arranging pooja dravyas, and supporting priests during rituals.',
  },
]

const now = new Date().toISOString()
const insertStmt = db.prepare(`
  INSERT INTO labour_listings (provider_id, name, type, provider_name, price_display, price_amount, rating, verified, details, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const insertMany = db.transaction((items) => {
  for (const item of items) {
    insertStmt.run(
      item.provider_id,
      item.name,
      item.type,
      item.provider_name,
      item.price_display,
      item.price_amount,
      item.rating,
      item.verified,
      item.details,
      now,
      now
    )
  }
})

insertMany(labourItems)
console.log('Inserted labour items successfully! Total count:', db.prepare('SELECT count(*) as count FROM labour_listings').get().count)
