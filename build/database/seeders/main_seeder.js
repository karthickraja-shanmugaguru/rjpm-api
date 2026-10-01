import { BaseSeeder } from '@adonisjs/lucid/seeders';
import db from '@adonisjs/lucid/services/db';
export default class extends BaseSeeder {
    async run() {
        const now = new Date();
        await db.from('review_replies').delete();
        await db.from('reviews').delete();
        await db.from('favorites').delete();
        await db.from('availability').delete();
        await db.from('bookings').delete();
        await db.from('enquiries').delete();
        await db.from('package_services').delete();
        await db.from('packages').delete();
        await db.from('service_images').delete();
        await db.from('labour_listings').delete();
        await db.from('services').delete();
        await db.from('provider_social_links').delete();
        await db.from('provider_service_areas').delete();
        await db.from('providers').delete();
        await db.from('categories').delete();
        await db.from('users').delete();
        const [customerUserId] = await db.table('users').insert({
            phone: '9876543210',
            name: 'Karuppasamy',
            email: 'karuppasamy@evently.test',
            role: 'CUSTOMER',
            location: 'Chennai',
            event_preference: 'Wedding',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const [providerUserId] = await db.table('users').insert({
            phone: '9876500001',
            name: 'Lakshmi',
            email: 'lakshmi@srilakshmievents.test',
            role: 'PROVIDER',
            location: 'Chennai',
            created_at: now,
            updated_at: now,
        }).returning('id');
        await db.table('users').insert({
            phone: '9999999999',
            name: 'Evently Admin',
            email: 'admin@evently.app',
            role: 'ADMIN',
            location: 'Chennai',
            created_at: now,
            updated_at: now,
        });
        const categoryData = [
            { name: 'Catering', slug: 'catering', color: '#ea580c', bg: 'linear-gradient(135deg,#ffedd5,#fff7ed)' },
            { name: 'Decoration', slug: 'decoration', color: '#e11d48', bg: 'linear-gradient(135deg,#ffe4e6,#fff1f2)' },
            { name: 'Photography', slug: 'photography', color: '#0284c7', bg: 'linear-gradient(135deg,#e0f2fe,#f0f9ff)' },
            { name: 'Videography', slug: 'videography', color: '#7c3aed', bg: 'linear-gradient(135deg,#ede9fe,#f5f3ff)' },
            { name: 'Mehendi', slug: 'mehendi', color: '#059669', bg: 'linear-gradient(135deg,#d1fae5,#ecfdf5)' },
            { name: 'Jewellery', slug: 'jewellery', color: '#d97706', bg: 'linear-gradient(135deg,#fef3c7,#fffbeb)' },
            { name: 'Mandapam', slug: 'mandapam', color: '#b45309', bg: 'linear-gradient(135deg,#ffedd5,#fff7ed)' },
            { name: 'Music & DJ', slug: 'music-dj', color: '#9333ea', bg: 'linear-gradient(135deg,#f3e8ff,#faf5ff)' },
            { name: 'Tailoring', slug: 'tailoring', color: '#0d9488', bg: 'linear-gradient(135deg,#ccfbf1,#f0fdfa)' },
            { name: 'Makeup', slug: 'makeup', color: '#db2777', bg: 'linear-gradient(135deg,#fce7f3,#fdf2f8)' },
            { name: 'Flowers', slug: 'flowers', color: '#16a34a', bg: 'linear-gradient(135deg,#dcfce7,#f0fdf4)' },
            { name: 'Furniture', slug: 'furniture', color: '#4f46e5', bg: 'linear-gradient(135deg,#e0e7ff,#eef2ff)' },
            { name: 'Beauty & Spa', slug: 'beauty-spa', color: '#0891b2', bg: 'linear-gradient(135deg,#cffafe,#ecfeff)' },
            { name: 'Panthal & Tent', slug: 'panthal-tent', color: '#c2410c', bg: 'linear-gradient(135deg,#ffedd5,#fff7ed)' },
            { name: 'Sweets & Desserts', slug: 'sweets-desserts', color: '#f59e0b', bg: 'linear-gradient(135deg,#fef3c7,#fffbeb)' },
            { name: 'Water Supply', slug: 'water-supply', color: '#2563eb', bg: 'linear-gradient(135deg,#dbeafe,#eff6ff)' },
            { name: 'Event Staff', slug: 'event-staff', color: '#475569', bg: 'linear-gradient(135deg,#e2e8f0,#f8fafc)' },
            { name: 'Priest & Rituals', slug: 'priest-rituals', color: '#d97706', bg: 'linear-gradient(135deg,#fef3c7,#fffbeb)' },
            { name: 'Invitations', slug: 'invitations', color: '#be185d', bg: 'linear-gradient(135deg,#fce7f3,#fdf2f8)' },
            { name: 'Transport', slug: 'transport', color: '#1d4ed8', bg: 'linear-gradient(135deg,#dbeafe,#eff6ff)' },
        ];
        const categoryMap = new Map();
        for (const cat of categoryData) {
            const [id] = await db.table('categories').insert({
                ...cat,
                created_at: now,
                updated_at: now,
            }).returning('id');
            categoryMap.set(cat.name, typeof id === 'object' ? id.id : id);
        }
        const [slcIdRaw] = await db.table('providers').insert({
            user_id: typeof providerUserId === 'object' ? providerUserId.id : providerUserId,
            business_name: 'Sri Lakshmi Events & Catering',
            owner_name: 'Lakshmi',
            primary_category: 'Catering',
            experience_years: 12,
            completed_events: '1,200+',
            about: 'We provide complete catering, decoration and event support for weddings, receptions, birthdays and family celebrations across Chennai. With over 12 years of culinary expertise, our professional chefs and service staff deliver unforgettable traditional and contemporary dining experiences.',
            rating: 4.8,
            review_count: 326,
            verified: true,
            verification_status: 'APPROVED',
            phone: '+91 98765 43210',
            whatsapp: '+91 98765 43210',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const slcId = typeof slcIdRaw === 'object' ? slcIdRaw.id : slcIdRaw;
        const slcAreas = ['T. Nagar', 'Anna Nagar', 'Adyar', 'Velachery', 'Tambaram', 'OMR', 'Mylapore'];
        for (const loc of slcAreas) {
            await db.table('provider_service_areas').insert({
                provider_id: slcId,
                locality: loc,
                created_at: now,
                updated_at: now,
            });
        }
        const slcSocial = [
            { platform: 'instagram', url: 'https://instagram.com/srilakshmievents' },
            { platform: 'facebook', url: 'https://facebook.com/srilakshmievents' },
            { platform: 'youtube', url: 'https://youtube.com/@srilakshmievents' },
            { platform: 'telegram', url: 'https://t.me/srilakshmievents' },
            { platform: 'linkedin', url: 'https://linkedin.com/company/srilakshmievents' },
            { platform: 'twitter', url: 'https://x.com/srilakshmievents' },
            { platform: 'website', url: 'https://www.srilakshmievents.com' },
        ];
        for (const s of slcSocial) {
            await db.table('provider_social_links').insert({
                provider_id: slcId,
                ...s,
                created_at: now,
                updated_at: now,
            });
        }
        const [bloomIdRaw] = await db.table('providers').insert({
            business_name: 'Bloom Events',
            owner_name: 'Divya & Rajesh',
            primary_category: 'Decoration',
            experience_years: 8,
            completed_events: '640+',
            about: 'Premium floral styling, bespoke stage decorations, entrance arches, and themed setups for high-profile weddings and luxury parties.',
            rating: 4.9,
            review_count: 189,
            verified: true,
            verification_status: 'APPROVED',
            phone: '+91 98401 23456',
            whatsapp: '+91 98401 23456',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const bloomId = typeof bloomIdRaw === 'object' ? bloomIdRaw.id : bloomIdRaw;
        for (const loc of ['Adyar', 'Besant Nagar', 'Velachery', 'Guindy', 'ECR']) {
            await db.table('provider_service_areas').insert({ provider_id: bloomId, locality: loc, created_at: now, updated_at: now });
        }
        const [momentsIdRaw] = await db.table('providers').insert({
            business_name: 'Moments Studio',
            owner_name: 'Karthik Raja',
            primary_category: 'Photography',
            experience_years: 10,
            completed_events: '900+',
            about: 'Candid wedding photography, cinematic films, 4K drone cinematography, and traditional heirloom portraiture in South India.',
            rating: 4.7,
            review_count: 412,
            verified: true,
            verification_status: 'APPROVED',
            phone: '+91 98402 34567',
            whatsapp: '+91 98402 34567',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const momentsId = typeof momentsIdRaw === 'object' ? momentsIdRaw.id : momentsIdRaw;
        const [mehendiIdRaw] = await db.table('providers').insert({
            business_name: 'Bridal Mehendi Art',
            owner_name: 'Meena Kumari',
            primary_category: 'Mehendi',
            experience_years: 6,
            completed_events: '500+',
            about: 'Specialist organic herbal bridal mehendi, Arabic, Rajasthani, and personalized portrait henna artists.',
            rating: 4.9,
            review_count: 147,
            verified: true,
            verification_status: 'APPROVED',
            phone: '+91 98403 45678',
            whatsapp: '+91 98403 45678',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const mehendiId = typeof mehendiIdRaw === 'object' ? mehendiIdRaw.id : mehendiIdRaw;
        await db.table('providers').insert({
            business_name: 'Royal Mandapam Decorators',
            owner_name: 'Sundaram',
            primary_category: 'Mandapam',
            experience_years: 9,
            completed_events: '310+',
            about: 'Traditional temple style mandapams, carved pillars, wooden arch structures, and authentic South Indian wedding decor.',
            rating: 4.5,
            review_count: 64,
            verified: true,
            verification_status: 'APPROVED',
            phone: '+91 98404 56789',
            whatsapp: '+91 98404 56789',
            created_at: now,
            updated_at: now,
        });
        const [staffIdRaw] = await db.table('providers').insert({
            business_name: 'HelpingHands Event Staffing',
            owner_name: 'Saravanan',
            primary_category: 'Event Staff',
            experience_years: 7,
            completed_events: '850+',
            about: 'Trained, background-verified uniformed banquet staff, food servers, kitchen cleaners, setup crew, and guest coordinators.',
            rating: 4.6,
            review_count: 220,
            verified: true,
            verification_status: 'APPROVED',
            phone: '+91 98405 67890',
            whatsapp: '+91 98405 67890',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const staffId = typeof staffIdRaw === 'object' ? staffIdRaw.id : staffIdRaw;
        const slcServicesData = [
            { name: 'Wedding Catering', category_name: 'Catering', pricing_type: 'PER_PLATE', price_display: '₹350 / plate', price_amount: 350, icon: '🍽️', description: 'Complete South Indian wedding catering with authentic panthi and buffet serving staff.', status: 'LIVE' },
            { name: 'Reception Catering', category_name: 'Catering', pricing_type: 'PER_PLATE', price_display: '₹450 / plate', price_amount: 450, icon: '🍛', description: 'Multi-cuisine premium buffet catering featuring starters, live counters, main courses, and desserts.', status: 'LIVE' },
            { name: 'Birthday Catering', category_name: 'Catering', pricing_type: 'PER_PLATE', price_display: '₹250 / plate', price_amount: 250, icon: '🎂', description: 'Fun and delicious birthday menus curated for kids and adults.', status: 'LIVE' },
            { name: 'Live Food Counters', category_name: 'Catering', pricing_type: 'STARTING_FROM', price_display: 'From ₹8,000', price_amount: 8000, icon: '🎤', description: 'Live dosa varieties, Delhi chaat, Italian pasta, and artisanal ice cream counters.', status: 'LIVE' },
            { name: 'Tea & Coffee Service', category_name: 'Catering', pricing_type: 'STARTING_FROM', price_display: 'From ₹5,000', price_amount: 5000, icon: '☕', description: 'Filter coffee and masala chai counter with welcome biscuits and snacks.', status: 'LIVE' },
            { name: 'Wedding Decoration', category_name: 'Decoration', pricing_type: 'STARTING_FROM', price_display: 'From ₹25,000', price_amount: 25000, icon: '🌸', description: 'Complete stage, entrance arch, mandapam backdrop, and venue flower decoration.', status: 'LIVE' },
            { name: 'Flower Decoration', category_name: 'Flowers', pricing_type: 'STARTING_FROM', price_display: 'From ₹12,000', price_amount: 12000, icon: '💐', description: 'Fresh jasmine, marigold, orchid, and rose garlands for stage and muhurtham.', status: 'LIVE' },
            { name: 'Reception Stage', category_name: 'Decoration', pricing_type: 'STARTING_FROM', price_display: 'From ₹18,000', price_amount: 18000, icon: '✨', description: 'Modern thematic reception stage with fairy lights, drapery, and couple sofa.', status: 'LIVE' },
            { name: 'Shamiana & Tent', category_name: 'Panthal & Tent', pricing_type: 'STARTING_FROM', price_display: 'From ₹10,000', price_amount: 10000, icon: '🎪', description: 'Waterproof shamiana, aluminum German pagoda tents, and carpet flooring setup.', status: 'LIVE' },
            { name: 'Tables & Chairs', category_name: 'Furniture', pricing_type: 'STARTING_FROM', price_display: 'From ₹5,000', price_amount: 5000, icon: '🪑', description: 'Banquet chairs with covers, dining tables, stage seating, and cocktail bar stools.', status: 'LIVE' },
            { name: 'Sound System', category_name: 'Music & DJ', pricing_type: 'STARTING_FROM', price_display: 'From ₹7,500', price_amount: 7500, icon: '🔊', description: 'JBL Line array sound setup, wireless microphones, podium audio, and background music.', status: 'LIVE' },
            { name: 'DJ Service', category_name: 'Music & DJ', pricing_type: 'STARTING_FROM', price_display: 'From ₹12,000', price_amount: 12000, icon: '🎧', description: 'Professional DJ with dance floor intelligent lighting, smoke effects, and party playlists.', status: 'LIVE' },
        ];
        const slcServiceIds = [];
        for (const item of slcServicesData) {
            const catId = categoryMap.get(item.category_name) || null;
            const [id] = await db.table('services').insert({
                provider_id: slcId,
                category_id: catId,
                ...item,
                created_at: now,
                updated_at: now,
            }).returning('id');
            slcServiceIds.push(typeof id === 'object' ? id.id : id);
        }
        await db.table('services').insert({
            provider_id: bloomId,
            category_id: categoryMap.get('Decoration'),
            category_name: 'Decoration',
            name: 'Luxury Wedding Floral Decor',
            pricing_type: 'STARTING_FROM',
            price_display: 'From ₹45,000',
            price_amount: 45000,
            icon: '🌸',
            description: 'Imported flower arrangements, luxury stage backdrops, and fairy-tale walkway.',
            status: 'LIVE',
            created_at: now,
            updated_at: now,
        });
        await db.table('services').insert({
            provider_id: momentsId,
            category_id: categoryMap.get('Photography'),
            category_name: 'Photography',
            name: 'Complete Wedding Photography',
            pricing_type: 'STARTING_FROM',
            price_display: 'From ₹65,000',
            price_amount: 65000,
            icon: '📸',
            description: 'Traditional and candid photo coverage with luxury wedding album.',
            status: 'LIVE',
            created_at: now,
            updated_at: now,
        });
        await db.table('services').insert({
            provider_id: mehendiId,
            category_id: categoryMap.get('Mehendi'),
            category_name: 'Mehendi',
            name: 'Bridal Mehendi Package',
            pricing_type: 'STARTING_FROM',
            price_display: 'From ₹2,500',
            price_amount: 2500,
            icon: '🌿',
            description: 'Intricate bridal mehendi up to elbows and feet with 100% natural chemical-free henna.',
            status: 'LIVE',
            created_at: now,
            updated_at: now,
        });
        const [p1Raw] = await db.table('packages').insert({
            provider_id: slcId,
            name: 'Complete Wedding Package',
            event_type: 'Wedding',
            pricing_type: 'STARTING_FROM',
            price_display: '₹1,50,000+',
            price_amount: 150000,
            guest_capacity: 'Up to 500 guests',
            icon: '💍',
            description: 'All-in-one wedding celebration package including complete catering, wedding decoration, flower decor, and professional sound system.',
            status: 'LIVE',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const p1Id = typeof p1Raw === 'object' ? p1Raw.id : p1Raw;
        const p1Services = [slcServiceIds[0], slcServiceIds[5], slcServiceIds[6], slcServiceIds[10]];
        for (const sId of p1Services) {
            await db.table('package_services').insert({ package_id: p1Id, service_id: sId, created_at: now, updated_at: now });
        }
        const [p2Raw] = await db.table('packages').insert({
            provider_id: slcId,
            name: 'Premium Birthday Package',
            event_type: 'Birthday',
            pricing_type: 'STARTING_FROM',
            price_display: '₹35,000+',
            price_amount: 35000,
            guest_capacity: 'Up to 100 guests',
            icon: '🎂',
            description: 'Fun birthday dinner catering with live food counters, background sound, and refreshments.',
            status: 'LIVE',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const p2Id = typeof p2Raw === 'object' ? p2Raw.id : p2Raw;
        for (const sId of [slcServiceIds[2], slcServiceIds[3], slcServiceIds[10]]) {
            await db.table('package_services').insert({ package_id: p2Id, service_id: sId, created_at: now, updated_at: now });
        }
        const [p3Raw] = await db.table('packages').insert({
            provider_id: slcId,
            name: 'Reception Premium Package',
            event_type: 'Reception',
            pricing_type: 'STARTING_FROM',
            price_display: '₹1,00,000+',
            price_amount: 100000,
            guest_capacity: 'Up to 400 guests',
            icon: '💐',
            description: 'Grand reception buffet catering, glamorous stage decoration, and DJ entertainment.',
            status: 'LIVE',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const p3Id = typeof p3Raw === 'object' ? p3Raw.id : p3Raw;
        for (const sId of [slcServiceIds[1], slcServiceIds[7], slcServiceIds[11]]) {
            await db.table('package_services').insert({ package_id: p3Id, service_id: sId, created_at: now, updated_at: now });
        }
        const [p4Raw] = await db.table('packages').insert({
            provider_id: slcId,
            name: 'Engagement Celebration Package',
            event_type: 'Engagement',
            pricing_type: 'STARTING_FROM',
            price_display: '₹60,000+',
            price_amount: 60000,
            guest_capacity: 'Up to 250 guests',
            icon: '💎',
            description: 'Elegant engagement package with multi-course meal, flower decor, and sound setup.',
            status: 'LIVE',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const p4Id = typeof p4Raw === 'object' ? p4Raw.id : p4Raw;
        for (const sId of [slcServiceIds[0], slcServiceIds[6], slcServiceIds[10]]) {
            await db.table('package_services').insert({ package_id: p4Id, service_id: sId, created_at: now, updated_at: now });
        }
        const [p5Raw] = await db.table('packages').insert({
            provider_id: slcId,
            name: 'Complete Housewarming Package',
            event_type: 'Housewarming',
            pricing_type: 'STARTING_FROM',
            price_display: '₹30,000+',
            price_amount: 30000,
            guest_capacity: 'Up to 150 guests',
            icon: '🏠',
            description: 'Traditional morning breakfast & lunch catering with welcome coffee and entrance floral toran.',
            status: 'LIVE',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const p5Id = typeof p5Raw === 'object' ? p5Raw.id : p5Raw;
        for (const sId of [slcServiceIds[0], slcServiceIds[4], slcServiceIds[6]]) {
            await db.table('package_services').insert({ package_id: p5Id, service_id: sId, created_at: now, updated_at: now });
        }
        const labourList = [
            { name: 'Professional Food Servers', type: 'Food Servers', provider_name: 'HelpingHands Event Staffing', price_display: 'From ₹500 / staff', price_amount: 500, rating: 4.6, verified: true, details: 'Trained buffet and traditional panthi serving staff in clean uniforms.' },
            { name: 'Event Cleaning Crew', type: 'Cleaning Staff', provider_name: 'HelpingHands Event Staffing', price_display: 'From ₹400 / staff', price_amount: 400, rating: 4.5, verified: true, details: 'Pre-event and post-event hall cleaning, waste management, and dishwashing team.' },
            { name: 'Furniture Setup Crew', type: 'Setup Crew', provider_name: 'EventRent Furniture & Chairs', price_display: 'From ₹600 / staff', price_amount: 600, rating: 4.4, verified: true, details: 'Trained staff for chair arrangement, table cover dressing, and stage furniture setup.' },
            { name: 'General Event Helpers', type: 'Event Helpers', provider_name: 'HelpingHands Event Staffing', price_display: 'From ₹450 / staff', price_amount: 450, rating: 4.5, verified: false, details: 'General helpers for guest support, loading, packing, and overall venue coordination.' },
            { name: 'Panthal Setup Team', type: 'Panthal Staff', provider_name: 'Sri Murugan Panthal Works', price_display: 'From ₹700 / staff', price_amount: 700, rating: 4.7, verified: true, details: 'Experienced bamboo, pipe pandal, shamiana, and tarpaulin construction crew.' },
            { name: 'Guest Hospitality Staff', type: 'Hospitality Staff', provider_name: 'HelpingHands Event Staffing', price_display: 'From ₹650 / staff', price_amount: 650, rating: 4.6, verified: true, details: 'Courteous welcome reception, guest registration, gift coordination, and hospitality hosts.' },
        ];
        for (const l of labourList) {
            await db.table('labour_listings').insert({ provider_id: staffId, ...l, created_at: now, updated_at: now });
        }
        const cId = typeof customerUserId === 'object' ? customerUserId.id : customerUserId;
        const [enq1Raw] = await db.table('enquiries').insert({
            customer_id: cId,
            provider_id: slcId,
            service_id: slcServiceIds[0],
            event_type: 'Wedding',
            event_date: '2026-10-18',
            guest_count: '450 guests',
            requirements: 'Need vegetarian South Indian meals with two live counters and welcome drinks for 450 guests.',
            contact_preference: 'Morning',
            status: 'ACCEPTED',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const enq1Id = typeof enq1Raw === 'object' ? enq1Raw.id : enq1Raw;
        const [b1Raw] = await db.table('bookings').insert({
            enquiry_id: enq1Id,
            customer_id: cId,
            provider_id: slcId,
            service_id: slcServiceIds[0],
            event_type: 'Wedding',
            event_date: '2026-10-18',
            guest_count: '450 guests',
            amount_display: '₹1,57,500',
            status: 'ACCEPTED',
            notes: 'Confirmed for 18 Oct at T. Nagar Kalyana Mandapam.',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const b1Id = typeof b1Raw === 'object' ? b1Raw.id : b1Raw;
        await db.table('enquiries').insert({
            customer_id: cId,
            provider_id: slcId,
            service_id: slcServiceIds[1],
            event_type: 'Reception',
            event_date: '2026-10-26',
            guest_count: '300 guests',
            requirements: 'Please share buffet menu options and mocktail counter cost.',
            contact_preference: 'Evening',
            status: 'PENDING',
            created_at: now,
            updated_at: now,
        });
        const [enq3Raw] = await db.table('enquiries').insert({
            customer_id: cId,
            provider_id: bloomId,
            event_type: 'Wedding',
            event_date: '2026-10-18',
            guest_count: '500 guests',
            requirements: 'Fresh orchid and rose floral backdrop for muhurtham stage.',
            contact_preference: 'Anytime',
            status: 'ACCEPTED',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const enq3Id = typeof enq3Raw === 'object' ? enq3Raw.id : enq3Raw;
        await db.table('bookings').insert({
            enquiry_id: enq3Id,
            customer_id: cId,
            provider_id: bloomId,
            event_type: 'Wedding',
            event_date: '2026-10-18',
            guest_count: '500 guests',
            amount_display: '₹45,000',
            status: 'ACCEPTED',
            notes: 'Floral decor booked for 18 Oct.',
            created_at: now,
            updated_at: now,
        });
        await db.table('availability').insert([
            { provider_id: slcId, date: '2026-10-03', status: 'BOOKED', title: 'Birthday Catering', customer_name: 'Vignesh K', guests: '80 guests', created_at: now, updated_at: now },
            { provider_id: slcId, date: '2026-10-10', status: 'BOOKED', title: 'Wedding Catering', customer_name: 'Nandhini M', guests: '500 guests', created_at: now, updated_at: now },
            { provider_id: slcId, date: '2026-10-18', status: 'BOOKED', title: 'Wedding Catering', customer_name: 'Arun Kumar', guests: '450 guests', booking_id: typeof b1Id === 'object' ? b1Id.id : b1Id, created_at: now, updated_at: now },
            { provider_id: slcId, date: '2026-10-24', status: 'BUSY', title: 'Private booking', customer_name: '—', guests: '—', created_at: now, updated_at: now },
            { provider_id: slcId, date: '2026-10-25', status: 'BUSY', title: 'Private booking', customer_name: '—', guests: '—', created_at: now, updated_at: now },
            { provider_id: slcId, date: '2026-10-26', status: 'BOOKED', title: 'Reception Catering', customer_name: 'Priya S', guests: '300 guests', created_at: now, updated_at: now },
        ]);
        const [rev1Raw] = await db.table('reviews').insert({
            customer_id: cId,
            provider_id: slcId,
            customer_name: 'Arun Kumar',
            rating: 5,
            comment: 'Excellent food and very professional team. The sweet poli and hot sambar were talked about by all our guests. Timely service and spotless cleanup afterwards!',
            event_type: 'Wedding',
            event_date_text: '2 months ago',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const rev1Id = typeof rev1Raw === 'object' ? rev1Raw.id : rev1Raw;
        await db.table('review_replies').insert({
            review_id: typeof rev1Id === 'object' ? rev1Id.id : rev1Id,
            provider_id: slcId,
            reply_text: 'Thank you Arun! It was a great pleasure serving at your wedding celebration.',
            created_at: now,
            updated_at: now,
        });
        await db.table('reviews').insert({
            customer_id: cId,
            provider_id: slcId,
            customer_name: 'Priya S',
            rating: 5,
            comment: 'We booked catering and stage decoration together through Evently. Everything was coordinated seamlessly without any stress on the family.',
            event_type: 'Reception',
            event_date_text: '4 months ago',
            created_at: now,
            updated_at: now,
        });
        await db.table('favorites').insert({
            customer_id: cId,
            provider_id: slcId,
            created_at: now,
            updated_at: now,
        });
        await db.table('favorites').insert({
            customer_id: cId,
            provider_id: bloomId,
            created_at: now,
            updated_at: now,
        });
    }
}
//# sourceMappingURL=main_seeder.js.map