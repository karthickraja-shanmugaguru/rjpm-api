import db from '@adonisjs/lucid/services/db';
export default class ProviderPortalController {
    getProviderId(ctx) {
        return ctx?.authProvider?.id || ctx?.authUser?.provider_id || 1;
    }
    async dashboard(ctx) {
        const { response } = ctx;
        const providerId = this.getProviderId(ctx);
        const provider = await db.from('providers').where('id', providerId).first();
        const activeListingsCount = await db
            .from('services')
            .where('provider_id', providerId)
            .where('status', 'LIVE')
            .count('* as total');
        const newEnquiriesCount = await db
            .from('enquiries')
            .where('provider_id', providerId)
            .where('status', 'PENDING')
            .count('* as total');
        const recentEnquiries = await db
            .from('enquiries')
            .join('users', 'enquiries.customer_id', 'users.id')
            .leftJoin('services', 'enquiries.service_id', 'services.id')
            .leftJoin('packages', 'enquiries.package_id', 'packages.id')
            .where('enquiries.provider_id', providerId)
            .select('enquiries.id', 'users.name as customer_name', 'enquiries.event_type', 'enquiries.event_date', 'enquiries.guest_count', 'enquiries.status', 'services.name as service_name', 'packages.name as package_name')
            .orderBy('enquiries.id', 'desc')
            .limit(6);
        return response.json({
            success: true,
            data: {
                providerName: provider?.owner_name || provider?.business_name || 'Partner',
                businessName: provider?.business_name || 'My Business',
                stats: {
                    profileViews: 0,
                    profileViewsDelta: 'Fresh listing',
                    newEnquiries: Number(newEnquiriesCount[0]?.total || 0),
                    newEnquiriesAction: `${Number(newEnquiriesCount[0]?.total || 0)} need your response`,
                    activeListings: Number(activeListingsCount[0]?.total || 0),
                    activeListingsNote: 'Active on marketplace',
                    averageRating: provider?.rating || 0,
                    reviewCount: provider?.review_count || 0,
                },
                profileCompletion: {
                    percentage: Boolean(provider?.about) && Boolean(provider?.phone) ? 100 : 50,
                    items: [
                        { label: 'Business details', done: Boolean(provider?.business_name) },
                        { label: 'Phone & WhatsApp', done: Boolean(provider?.phone) },
                        { label: 'Active listings', done: Number(activeListingsCount[0]?.total || 0) > 0 },
                        { label: 'Add description', done: Boolean(provider?.about) },
                    ],
                },
                recentEnquiries: recentEnquiries.map((e) => ({
                    id: e.id,
                    name: e.customer_name,
                    initial: (e.customer_name || 'CU').substring(0, 2).toUpperCase(),
                    service: e.package_name || e.service_name || `${e.event_type} Celebration`,
                    meta: `${e.event_date}${e.guest_count ? ` · ${e.guest_count}` : ''}`,
                    status: e.status === 'PENDING' ? 'New' : e.status === 'ACCEPTED' ? 'Accepted' : e.status,
                })),
            },
        });
    }
    async getProfile(ctx) {
        const { response } = ctx;
        const providerId = this.getProviderId(ctx);
        const provider = await db.from('providers').where('id', providerId).first();
        const areas = await db.from('provider_service_areas').where('provider_id', providerId);
        const socialLinks = await db.from('provider_social_links').where('provider_id', providerId);
        return response.json({
            success: true,
            data: {
                id: provider.id,
                businessName: provider.business_name,
                ownerName: provider.owner_name,
                primaryCategory: provider.primary_category,
                about: provider.about,
                phone: provider.phone,
                whatsapp: provider.whatsapp,
                coverImage: provider.cover_image,
                logoImage: provider.logo_image,
                profileImage: provider.logo_image,
                rating: provider.rating,
                reviewCount: provider.review_count,
                experienceYears: Math.round(Number(provider.experience_years)) || 0,
                completedEvents: Math.round(Number(provider.completed_events)) || 0,
                responseTime: provider.response_time || 'Usually responds within 2 hours',
                city: provider.city || 'Chennai',
                verified: Boolean(provider.verified),
                verificationStatus: provider.verification_status || 'VERIFIED',
                serviceAreas: areas.map((a) => a.locality),
                socialLinks: socialLinks.reduce((acc, curr) => {
                    acc[curr.platform] = curr.url;
                    return acc;
                }, {}),
            },
        });
    }
    async updateProfile(ctx) {
        const { request, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const { businessName, ownerName, primaryCategory, about, phone, whatsapp, city, experienceYears, completedEvents, responseTime, verified, serviceAreas, socialLinks, coverImage, logoImage, profileImage, } = request.all();
        const now = new Date();
        const updatePayload = {
            business_name: businessName,
            owner_name: ownerName,
            about,
            phone,
            whatsapp,
            updated_at: now,
        };
        if (city !== undefined) {
            updatePayload.city = String(city).trim();
        }
        if (primaryCategory) {
            updatePayload.primary_category = primaryCategory;
        }
        if (experienceYears !== undefined) {
            updatePayload.experience_years = Number(experienceYears) || 0;
        }
        if (completedEvents !== undefined) {
            updatePayload.completed_events = Number(completedEvents) || 0;
        }
        if (responseTime !== undefined) {
            updatePayload.response_time = String(responseTime).trim();
        }
        if (verified !== undefined) {
            updatePayload.verified = Boolean(verified);
        }
        if (coverImage !== undefined) {
            updatePayload.cover_image = coverImage;
        }
        if (logoImage !== undefined || profileImage !== undefined) {
            updatePayload.logo_image = logoImage !== undefined ? logoImage : profileImage;
        }
        await db.from('providers').where('id', providerId).update(updatePayload);
        if (Array.isArray(serviceAreas)) {
            await db.from('provider_service_areas').where('provider_id', providerId).delete();
            for (const loc of serviceAreas) {
                if (loc && String(loc).trim()) {
                    await db.table('provider_service_areas').insert({
                        provider_id: providerId,
                        locality: String(loc).trim(),
                        created_at: now,
                        updated_at: now,
                    });
                }
            }
        }
        if (socialLinks && typeof socialLinks === 'object') {
            await db.from('provider_social_links').where('provider_id', providerId).delete();
            for (const [platform, url] of Object.entries(socialLinks)) {
                if (url && String(url).trim()) {
                    await db.table('provider_social_links').insert({
                        provider_id: providerId,
                        platform,
                        url: String(url).trim(),
                        created_at: now,
                        updated_at: now,
                    });
                }
            }
        }
        return response.json({
            success: true,
            message: 'Business profile updated successfully',
        });
    }
    async getServices(ctx) {
        const { response } = ctx;
        const providerId = this.getProviderId(ctx);
        const services = await db.from('services').where('provider_id', providerId).orderBy('id', 'desc');
        const serviceIds = services.map((s) => s.id);
        const allImages = serviceIds.length > 0
            ? await db.from('service_images').whereIn('service_id', serviceIds).orderBy('sort_order', 'asc')
            : [];
        return response.json({
            success: true,
            data: services.map((s) => {
                const numPrice = typeof s.price_amount === 'number' ? s.price_amount : (parseFloat(String(s.price_amount || s.price_display || '').replace(/[^0-9.]/g, '')) || 0);
                const sImages = allImages.filter((img) => img.service_id === s.id).map((img) => img.image_url);
                return {
                    id: s.id,
                    name: s.name,
                    title: s.name,
                    category: s.category_name,
                    price: numPrice,
                    priceDisplay: s.price_display || (numPrice > 0 ? `₹${numPrice.toLocaleString('en-IN')}` : 'Price on request'),
                    priceAmount: numPrice,
                    pricingType: s.pricing_type,
                    icon: s.icon || '✨',
                    status: s.status,
                    coverImage: s.cover_image,
                    images: sImages,
                    description: s.description,
                    desc: s.description,
                    serviceAreaOverride: s.service_area_override || '',
                    inclusions: s.inclusions || '',
                    terms: s.terms || '',
                    duration: s.duration || '',
                    setupTime: s.setup_time || '',
                    highlights: s.highlights || '',
                    videoUrl: s.video_url || '',
                };
            }),
        });
    }
    resolveLabourType(category, name) {
        const text = `${category} ${name}`.toLowerCase();
        if (text.includes('kitchen') || text.includes('cutter'))
            return 'Kitchen Helpers & Cutters';
        if (text.includes('dish') || text.includes('vessel') || text.includes('washer'))
            return 'Dishwashers & Vessel Cleaners';
        if (text.includes('clean') || text.includes('sweep') || text.includes('housekeep'))
            return 'Cleaning Staff';
        if (text.includes('panthal') || text.includes('shamiana') || text.includes('pandal') || text.includes('tent'))
            return 'Panthal & Shamiana Riggers';
        if (text.includes('setup') || text.includes('furniture') || text.includes('chair') || text.includes('table'))
            return 'Setup & Furniture Crew';
        if (text.includes('valet') || text.includes('parking') || text.includes('marshal') || text.includes('driver'))
            return 'Valet Parking & Marshals';
        if (text.includes('security') || text.includes('bouncer') || text.includes('guard'))
            return 'Security & Bouncers';
        if (text.includes('hospitality') || text.includes('thamboolam') || text.includes('welcome') || text.includes('host'))
            return 'Hospitality & Thamboolam Staff';
        if (text.includes('luggage') || text.includes('room attendant') || text.includes('porter'))
            return 'Luggage & Room Attendants';
        if (text.includes('generator') || text.includes('electric') || text.includes('lighting') || text.includes('sound'))
            return 'Sound, Light & Generator Crew';
        if (text.includes('garland') || text.includes('floral stringer') || text.includes('flower helper'))
            return 'Flower & Garland Helpers';
        if (text.includes('pooja') || text.includes('homam') || text.includes('vedic helper'))
            return 'Pooja & Homam Assistants';
        if (text.includes('server') ||
            text.includes('panthi') ||
            text.includes('catering staff') ||
            text.includes('catring worker') ||
            text.includes('catering worker') ||
            text.includes('event staff') ||
            text.includes('labour') ||
            text.includes('helper') ||
            text.includes('worker')) {
            return 'Food & Panthi Servers';
        }
        return null;
    }
    async createService(ctx) {
        const { request, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const { name, title, category, pricingType = 'STARTING_FROM', price, priceDisplay, description, status = 'LIVE', coverImage, images, serviceAreaOverride, inclusions, terms, duration, setupTime, highlights, videoUrl, } = request.all();
        const serviceName = (name || title || '').trim();
        if (!serviceName || !category) {
            return response.status(422).json({
                success: false,
                message: 'Service name and category are required',
            });
        }
        const priceNum = typeof price === 'number' ? price : (parseFloat(String(price || '').replace(/[^0-9.]/g, '')) || 0);
        const formattedDisplay = priceDisplay || (priceNum > 0 ? `₹${priceNum.toLocaleString('en-IN')}` : (price || 'Price on request'));
        const now = new Date();
        const [idRaw] = await db.table('services').insert({
            provider_id: providerId,
            category_name: category,
            name: serviceName,
            description: description || 'Professional service by provider',
            pricing_type: pricingType,
            price_display: formattedDisplay,
            price_amount: priceNum,
            cover_image: coverImage || null,
            icon: '✨',
            status: (status || 'LIVE').toUpperCase(),
            service_area_override: serviceAreaOverride || null,
            inclusions: inclusions || null,
            terms: terms || null,
            duration: duration || null,
            setup_time: setupTime || null,
            highlights: highlights || null,
            video_url: videoUrl || null,
            created_at: now,
            updated_at: now,
        }).returning('id');
        const newId = typeof idRaw === 'object' ? idRaw.id : idRaw;
        if (Array.isArray(images) && images.length > 0) {
            for (let i = 0; i < Math.min(images.length, 10); i++) {
                const imgUrl = typeof images[i] === 'string' ? images[i] : images[i]?.image_url;
                if (imgUrl && String(imgUrl).trim()) {
                    await db.table('service_images').insert({
                        service_id: newId,
                        image_url: String(imgUrl).trim(),
                        sort_order: i,
                        created_at: now,
                        updated_at: now,
                    });
                }
            }
        }
        const labourType = this.resolveLabourType(category, serviceName);
        if (labourType) {
            const provider = await db.from('providers').where('id', providerId).first();
            const staffDisplay = formattedDisplay.toLowerCase().includes('staff') || formattedDisplay.toLowerCase().includes('person') || formattedDisplay.toLowerCase().includes('worker')
                ? formattedDisplay
                : `${formattedDisplay} / staff`;
            await db.table('labour_listings').insert({
                provider_id: providerId,
                name: serviceName,
                type: labourType,
                provider_name: provider?.business_name || 'Verified Provider',
                price_display: staffDisplay,
                price_amount: priceNum,
                rating: provider?.rating || 0,
                verified: Boolean(provider?.verified),
                details: description || inclusions || 'Professional event staff & labour support in Rajapalayam.',
                created_at: now,
                updated_at: now,
            });
        }
        return response.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: { id: newId },
        });
    }
    async updateService(ctx) {
        const { params, request, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const { name, title, category, price, priceDisplay, description, pricingType, coverImage, status, images, serviceAreaOverride, inclusions, terms, duration, setupTime, highlights, videoUrl, } = request.all();
        const now = new Date();
        const service = await db.from('services').where('id', params.id).where('provider_id', providerId).first();
        if (!service) {
            return response.status(404).json({ success: false, message: 'Service not found or unauthorized' });
        }
        const serviceName = (name || title || '').trim();
        const priceNum = typeof price === 'number' ? price : (price ? parseFloat(String(price).replace(/[^0-9.]/g, '')) : undefined);
        const formattedDisplay = priceDisplay || (priceNum !== undefined && priceNum > 0 ? `₹${priceNum.toLocaleString('en-IN')}` : price);
        const updatePayload = { updated_at: now };
        if (serviceName)
            updatePayload.name = serviceName;
        if (category)
            updatePayload.category_name = category;
        if (formattedDisplay !== undefined)
            updatePayload.price_display = formattedDisplay;
        if (priceNum !== undefined)
            updatePayload.price_amount = priceNum;
        if (description !== undefined)
            updatePayload.description = description;
        if (pricingType)
            updatePayload.pricing_type = pricingType;
        if (coverImage !== undefined)
            updatePayload.cover_image = coverImage;
        if (status)
            updatePayload.status = status.toUpperCase();
        if (serviceAreaOverride !== undefined)
            updatePayload.service_area_override = serviceAreaOverride || null;
        if (inclusions !== undefined)
            updatePayload.inclusions = inclusions || null;
        if (terms !== undefined)
            updatePayload.terms = terms || null;
        if (duration !== undefined)
            updatePayload.duration = duration || null;
        if (setupTime !== undefined)
            updatePayload.setup_time = setupTime || null;
        if (highlights !== undefined)
            updatePayload.highlights = highlights || null;
        if (videoUrl !== undefined)
            updatePayload.video_url = videoUrl || null;
        await db.from('services').where('id', params.id).update(updatePayload);
        if (Array.isArray(images)) {
            await db.from('service_images').where('service_id', params.id).delete();
            for (let i = 0; i < Math.min(images.length, 10); i++) {
                const imgUrl = typeof images[i] === 'string' ? images[i] : images[i]?.image_url;
                if (imgUrl && String(imgUrl).trim()) {
                    await db.table('service_images').insert({
                        service_id: params.id,
                        image_url: String(imgUrl).trim(),
                        sort_order: i,
                        created_at: now,
                        updated_at: now,
                    });
                }
            }
        }
        return response.json({
            success: true,
            message: 'Service updated successfully',
        });
    }
    async toggleServiceStatus(ctx) {
        const { params, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const service = await db.from('services').where('id', params.id).where('provider_id', providerId).first();
        if (!service) {
            return response.status(404).json({ success: false, message: 'Service not found' });
        }
        const nextStatus = service.status === 'LIVE' ? 'PAUSED' : 'LIVE';
        await db.from('services').where('id', params.id).update({
            status: nextStatus,
            updated_at: new Date(),
        });
        return response.json({
            success: true,
            message: `${service.name} is now ${nextStatus === 'LIVE' ? 'Live' : 'Paused'}`,
            status: nextStatus === 'LIVE' ? 'Live' : 'Paused',
        });
    }
    async deleteService(ctx) {
        const { params, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const service = await db.from('services').where('id', params.id).where('provider_id', providerId).first();
        if (service) {
            await db.from('labour_listings').where('provider_id', providerId).where('name', service.name).delete();
        }
        await db.from('services').where('id', params.id).where('provider_id', providerId).delete();
        return response.json({
            success: true,
            message: 'Service deleted successfully',
        });
    }
    async getPackages(ctx) {
        const { response } = ctx;
        const providerId = this.getProviderId(ctx);
        const packages = await db.from('packages').where('provider_id', providerId).orderBy('id', 'desc');
        const pkgIds = packages.map((p) => p.id);
        const relations = await db
            .from('package_services')
            .join('services', 'package_services.service_id', 'services.id')
            .whereIn('package_services.package_id', pkgIds)
            .select('package_services.package_id', 'services.id', 'services.name as title', 'services.category_name as category', 'services.price_amount as price', 'services.price_display as priceDisplay');
        const pkgImages = await db
            .from('package_images')
            .whereIn('package_id', pkgIds)
            .orderBy('sort_order', 'asc');
        return response.json({
            success: true,
            data: packages.map((p) => {
                const pServices = relations.filter((r) => r.package_id === p.id);
                const pImages = pkgImages.filter((img) => img.package_id === p.id).map((img) => img.image_url);
                return {
                    id: p.id,
                    name: p.name,
                    type: p.event_type,
                    eventType: p.event_type,
                    pricingType: p.pricing_type || 'STARTING_FROM',
                    price: p.price_amount || parseFloat(String(p.price_display || '').replace(/[^0-9.]/g, '')) || 0,
                    priceDisplay: p.price_display,
                    guests: p.guest_capacity || 'Up to 500 guests',
                    guestCapacity: p.guest_capacity,
                    status: p.status === 'LIVE' ? 'Live' : p.status === 'PAUSED' ? 'Paused' : 'Draft',
                    description: p.description,
                    coverImage: p.cover_image,
                    icon: p.icon || '📦',
                    inclusions: p.inclusions,
                    exclusions: p.exclusions,
                    highlights: p.highlights,
                    duration: p.duration,
                    setupTime: p.setup_time,
                    advanceNotice: p.advance_notice,
                    terms: p.terms,
                    customizable: Boolean(p.customizable ?? true),
                    services: pServices,
                    serviceIds: pServices.map((s) => s.id),
                    images: pImages,
                };
            }),
        });
    }
    async createPackage(ctx) {
        const { request, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const { name, type, eventType, price, pricingType = 'STARTING_FROM', guests, guestCapacity, description, inclusions, exclusions, highlights, duration, setupTime, setup_time, advanceNotice, advance_notice, terms, customizable, services, serviceIds, status = 'LIVE', coverImage, images, } = request.all();
        const chosenType = (eventType || type || '').trim();
        const chosenServiceIds = Array.isArray(serviceIds) ? serviceIds : Array.isArray(services) ? services : [];
        if (!name || !chosenType) {
            return response.status(422).json({
                success: false,
                message: 'Package name and event type are required',
            });
        }
        const priceNum = typeof price === 'number' ? price : (parseFloat(String(price || '').replace(/[^0-9.]/g, '')) || 0);
        const formattedPrice = priceNum > 0 ? `₹${priceNum.toLocaleString('en-IN')}` : (price || 'Price on request');
        const finalGuests = guestCapacity ? `${guestCapacity} guests` : (guests || 'Capacity on request');
        const now = new Date();
        const iconMap = {
            Wedding: '💍',
            Birthday: '🎂',
            Reception: '💐',
            Engagement: '💎',
            Housewarming: '🏠',
            'Baby Shower': '👶',
            Anniversary: '❤️',
            Corporate: '🏢',
        };
        const [idRaw] = await db.table('packages').insert({
            provider_id: providerId,
            name: name.trim(),
            event_type: chosenType,
            pricing_type: pricingType,
            price_display: formattedPrice,
            price_amount: priceNum,
            guest_capacity: finalGuests,
            description: description || 'Event celebration bundle',
            inclusions: inclusions ? (typeof inclusions === 'string' ? inclusions : JSON.stringify(inclusions)) : null,
            exclusions: exclusions ? (typeof exclusions === 'string' ? exclusions : JSON.stringify(exclusions)) : null,
            highlights: highlights ? (typeof highlights === 'string' ? highlights : JSON.stringify(highlights)) : null,
            duration: duration || null,
            setup_time: setupTime || setup_time || null,
            advance_notice: advanceNotice || advance_notice || null,
            terms: terms || null,
            customizable: customizable !== undefined ? (customizable ? 1 : 0) : 1,
            cover_image: coverImage || null,
            status: status.toUpperCase(),
            icon: iconMap[chosenType] || '📦',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const pkgId = typeof idRaw === 'object' ? idRaw.id : idRaw;
        for (const sId of chosenServiceIds) {
            const cleanServiceId = typeof sId === 'object' ? sId.id : sId;
            if (cleanServiceId) {
                await db.table('package_services').insert({
                    package_id: pkgId,
                    service_id: cleanServiceId,
                    created_at: now,
                    updated_at: now,
                });
            }
        }
        if (Array.isArray(images) && images.length > 0) {
            for (let i = 0; i < Math.min(images.length, 10); i++) {
                const imgUrl = typeof images[i] === 'string' ? images[i] : images[i]?.image_url;
                if (imgUrl && String(imgUrl).trim()) {
                    await db.table('package_images').insert({
                        package_id: pkgId,
                        image_url: String(imgUrl).trim(),
                        sort_order: i,
                        created_at: now,
                        updated_at: now,
                    });
                }
            }
        }
        return response.status(201).json({
            success: true,
            message: 'Package created successfully',
            data: { id: pkgId },
        });
    }
    async updatePackage(ctx) {
        const { params, request, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const { name, type, eventType, price, pricingType, guests, guestCapacity, description, inclusions, exclusions, highlights, duration, setupTime, setup_time, advanceNotice, advance_notice, terms, customizable, services, serviceIds, status, coverImage, images, } = request.all();
        const now = new Date();
        const pkg = await db.from('packages').where('id', params.id).where('provider_id', providerId).first();
        if (!pkg) {
            return response.status(404).json({ success: false, message: 'Package not found' });
        }
        const chosenType = (eventType || type || '').trim();
        const chosenServiceIds = Array.isArray(serviceIds) ? serviceIds : Array.isArray(services) ? services : null;
        const priceNum = price !== undefined ? (typeof price === 'number' ? price : (parseFloat(String(price || '').replace(/[^0-9.]/g, '')) || 0)) : undefined;
        const formattedPrice = priceNum !== undefined ? (priceNum > 0 ? `₹${priceNum.toLocaleString('en-IN')}` : 'Price on request') : undefined;
        const finalGuests = guestCapacity !== undefined ? (guestCapacity ? `${guestCapacity} guests` : '') : guests;
        const updatePayload = { updated_at: now };
        if (name)
            updatePayload.name = name.trim();
        if (chosenType)
            updatePayload.event_type = chosenType;
        if (pricingType)
            updatePayload.pricing_type = pricingType;
        if (formattedPrice !== undefined)
            updatePayload.price_display = formattedPrice;
        if (priceNum !== undefined)
            updatePayload.price_amount = priceNum;
        if (finalGuests !== undefined)
            updatePayload.guest_capacity = finalGuests;
        if (description !== undefined)
            updatePayload.description = description;
        if (inclusions !== undefined)
            updatePayload.inclusions = inclusions ? (typeof inclusions === 'string' ? inclusions : JSON.stringify(inclusions)) : null;
        if (exclusions !== undefined)
            updatePayload.exclusions = exclusions ? (typeof exclusions === 'string' ? exclusions : JSON.stringify(exclusions)) : null;
        if (highlights !== undefined)
            updatePayload.highlights = highlights ? (typeof highlights === 'string' ? highlights : JSON.stringify(highlights)) : null;
        if (duration !== undefined)
            updatePayload.duration = duration || null;
        if (setupTime !== undefined || setup_time !== undefined)
            updatePayload.setup_time = setupTime || setup_time || null;
        if (advanceNotice !== undefined || advance_notice !== undefined)
            updatePayload.advance_notice = advanceNotice || advance_notice || null;
        if (terms !== undefined)
            updatePayload.terms = terms || null;
        if (customizable !== undefined)
            updatePayload.customizable = customizable ? 1 : 0;
        if (coverImage !== undefined)
            updatePayload.cover_image = coverImage;
        if (status)
            updatePayload.status = status.toUpperCase();
        await db.from('packages').where('id', params.id).update(updatePayload);
        if (chosenServiceIds !== null) {
            await db.from('package_services').where('package_id', params.id).delete();
            for (const sId of chosenServiceIds) {
                const cleanServiceId = typeof sId === 'object' ? sId.id : sId;
                if (cleanServiceId) {
                    await db.table('package_services').insert({
                        package_id: params.id,
                        service_id: cleanServiceId,
                        created_at: now,
                        updated_at: now,
                    });
                }
            }
        }
        if (Array.isArray(images)) {
            await db.from('package_images').where('package_id', params.id).delete();
            for (let i = 0; i < Math.min(images.length, 10); i++) {
                const imgUrl = typeof images[i] === 'string' ? images[i] : images[i]?.image_url;
                if (imgUrl && String(imgUrl).trim()) {
                    await db.table('package_images').insert({
                        package_id: params.id,
                        image_url: String(imgUrl).trim(),
                        sort_order: i,
                        created_at: now,
                        updated_at: now,
                    });
                }
            }
        }
        return response.json({
            success: true,
            message: 'Package updated successfully',
        });
    }
    async togglePackageStatus(ctx) {
        const { params, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const pkg = await db.from('packages').where('id', params.id).where('provider_id', providerId).first();
        if (!pkg) {
            return response.status(404).json({ success: false, message: 'Package not found' });
        }
        const nextStatus = pkg.status === 'LIVE' ? 'PAUSED' : 'LIVE';
        await db.from('packages').where('id', params.id).update({
            status: nextStatus,
            updated_at: new Date(),
        });
        return response.json({
            success: true,
            message: `${pkg.name} is now ${nextStatus === 'LIVE' ? 'Live' : 'Paused'}`,
            status: nextStatus === 'LIVE' ? 'Live' : 'Paused',
        });
    }
    async deletePackage(ctx) {
        const { params, response } = ctx;
        const providerId = this.getProviderId(ctx);
        await db.from('packages').where('id', params.id).where('provider_id', providerId).delete();
        return response.json({
            success: true,
            message: 'Package deleted successfully',
        });
    }
    async getEnquiries(ctx) {
        const { response } = ctx;
        const providerId = this.getProviderId(ctx);
        const list = await db
            .from('enquiries')
            .join('users', 'enquiries.customer_id', 'users.id')
            .leftJoin('services', 'enquiries.service_id', 'services.id')
            .leftJoin('packages', 'enquiries.package_id', 'packages.id')
            .where('enquiries.provider_id', providerId)
            .select('enquiries.*', 'users.name as customer_name', 'users.phone as customer_phone', 'services.name as service_name', 'packages.name as package_name')
            .orderBy('enquiries.id', 'desc');
        return response.json({
            success: true,
            data: list.map((e) => ({
                id: e.id,
                name: e.customer_name,
                initial: (e.customer_name || 'CU').substring(0, 2).toUpperCase(),
                phone: e.customer_phone ? '+91 ' + e.customer_phone : '+91 98765 00000',
                service: e.package_name || e.service_name || `${e.event_type} Celebration`,
                date: e.event_date,
                guests: e.guest_count ? `${e.guest_count}` : 'Flexible',
                note: e.requirements || 'No special requirements noted.',
                status: e.status === 'PENDING' ? 'New' : e.status === 'ACCEPTED' ? 'Accepted' : e.status === 'DECLINED' ? 'Declined' : e.status,
            })),
        });
    }
    async acceptEnquiry(ctx) {
        const { params, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const enquiry = await db
            .from('enquiries')
            .join('users', 'enquiries.customer_id', 'users.id')
            .where('enquiries.id', params.id)
            .where('enquiries.provider_id', providerId)
            .select('enquiries.*', 'users.name as customer_name')
            .first();
        if (!enquiry) {
            return response.status(404).json({ success: false, message: 'Enquiry not found' });
        }
        const now = new Date();
        await db.from('enquiries').where('id', enquiry.id).update({
            status: 'ACCEPTED',
            updated_at: now,
        });
        const [bookingIdRaw] = await db.table('bookings').insert({
            enquiry_id: enquiry.id,
            customer_id: enquiry.customer_id,
            provider_id: providerId,
            service_id: enquiry.service_id,
            package_id: enquiry.package_id,
            event_type: enquiry.event_type,
            event_date: enquiry.event_date,
            guest_count: enquiry.guest_count,
            status: 'ACCEPTED',
            notes: `Accepted enquiry from ${enquiry.customer_name}`,
            created_at: now,
            updated_at: now,
        }).returning('id');
        const bookingId = typeof bookingIdRaw === 'object' ? bookingIdRaw.id : bookingIdRaw;
        const existingDate = await db
            .from('availability')
            .where('provider_id', providerId)
            .where('date', enquiry.event_date)
            .first();
        if (existingDate) {
            await db.from('availability').where('id', existingDate.id).update({
                status: 'BOOKED',
                title: enquiry.event_type + ' Booking',
                customer_name: enquiry.customer_name,
                guests: enquiry.guest_count || '',
                booking_id: bookingId,
                updated_at: now,
            });
        }
        else {
            await db.table('availability').insert({
                provider_id: providerId,
                date: enquiry.event_date,
                status: 'BOOKED',
                title: enquiry.event_type + ' Booking',
                customer_name: enquiry.customer_name,
                guests: enquiry.guest_count || '',
                booking_id: bookingId,
                created_at: now,
                updated_at: now,
            });
        }
        return response.json({
            success: true,
            message: 'Enquiry accepted, booking confirmed, and calendar availability updated!',
            data: { bookingId },
        });
    }
    async declineEnquiry(ctx) {
        const { params, response } = ctx;
        const providerId = this.getProviderId(ctx);
        await db
            .from('enquiries')
            .where('id', params.id)
            .where('provider_id', providerId)
            .update({
            status: 'DECLINED',
            updated_at: new Date(),
        });
        return response.json({
            success: true,
            message: 'Enquiry declined',
        });
    }
    async getAvailability(ctx) {
        const { response } = ctx;
        const providerId = this.getProviderId(ctx);
        const entries = await db.from('availability').where('provider_id', providerId);
        const map = {};
        for (const e of entries) {
            map[e.date] = {
                title: e.title || (e.status === 'BOOKED' ? 'Booked Event' : 'Private booking'),
                customer: e.customer_name || '—',
                guests: e.guests || '—',
                type: e.status === 'BOOKED' ? 'event' : e.status === 'BUSY' ? 'busy' : 'available',
            };
        }
        return response.json({
            success: true,
            data: map,
        });
    }
    async setAvailability(ctx) {
        const { request, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const { date, status } = request.all();
        if (!date) {
            return response.status(422).json({ success: false, message: 'Date is required' });
        }
        const now = new Date();
        const existing = await db
            .from('availability')
            .where('provider_id', providerId)
            .where('date', date)
            .first();
        if (status === 'available') {
            if (existing) {
                await db.from('availability').where('id', existing.id).delete();
            }
        }
        else {
            if (existing) {
                await db.from('availability').where('id', existing.id).update({
                    status: 'BUSY',
                    title: 'Private booking',
                    customer_name: '—',
                    guests: '—',
                    updated_at: now,
                });
            }
            else {
                await db.table('availability').insert({
                    provider_id: providerId,
                    date,
                    status: 'BUSY',
                    title: 'Private booking',
                    customer_name: '—',
                    guests: '—',
                    created_at: now,
                    updated_at: now,
                });
            }
        }
        return response.json({
            success: true,
            message: `Date ${date} marked as ${status}`,
        });
    }
    async getReviews(ctx) {
        const { response } = ctx;
        const providerId = this.getProviderId(ctx);
        const provider = await db.from('providers').where('id', providerId).first();
        const reviews = await db.from('reviews').where('provider_id', providerId).orderBy('id', 'desc');
        const replies = await db.from('review_replies').whereIn('review_id', reviews.map((r) => r.id));
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        for (const r of reviews) {
            if (breakdown[r.rating] !== undefined) {
                breakdown[r.rating]++;
            }
        }
        const avgRating = reviews.length > 0
            ? Number((reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / reviews.length).toFixed(1))
            : Number(provider?.rating || 0);
        return response.json({
            success: true,
            data: {
                overallRating: avgRating,
                reviewCount: reviews.length,
                breakdown,
                reviews: reviews.map((r) => ({
                    id: r.id,
                    customer: r.customer_name,
                    date: `${r.event_type || 'Event'} · ${r.event_date_text || 'Recent'}`,
                    comment: r.comment,
                    rating: r.rating,
                    reply: replies.find((rep) => rep.review_id === r.id)?.reply_text || null,
                })),
            },
        });
    }
    async replyReview(ctx) {
        const { params, request, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const { replyText } = request.all();
        if (!replyText || !String(replyText).trim()) {
            return response.status(422).json({ success: false, message: 'Reply text is required' });
        }
        const now = new Date();
        const existing = await db.from('review_replies').where('review_id', params.id).first();
        if (existing) {
            await db.from('review_replies').where('id', existing.id).update({
                reply_text: String(replyText).trim(),
                updated_at: now,
            });
        }
        else {
            await db.table('review_replies').insert({
                review_id: params.id,
                provider_id: providerId,
                reply_text: String(replyText).trim(),
                created_at: now,
                updated_at: now,
            });
        }
        return response.json({
            success: true,
            message: 'Reply posted successfully',
        });
    }
    async getPerformance(ctx) {
        const { response } = ctx;
        const providerId = this.getProviderId(ctx);
        const enquiriesCount = await db
            .from('enquiries')
            .where('provider_id', providerId)
            .count('* as total');
        const bookingsCount = await db
            .from('bookings')
            .where('provider_id', providerId)
            .count('* as total');
        const totalEnq = Number(enquiriesCount[0]?.total || 0);
        const totalBkg = Number(bookingsCount[0]?.total || 0);
        const convRate = totalEnq > 0 ? ((totalBkg / totalEnq) * 100).toFixed(1) : '0';
        return response.json({
            success: true,
            data: {
                totalEnquiries: totalEnq,
                bookings: totalBkg,
                conversion: `${convRate}%`,
                profileViews: 0,
                monthlyEnquiries: [],
                topServices: [],
            },
        });
    }
    async getLabourListings(ctx) {
        const { response } = ctx;
        const providerId = this.getProviderId(ctx);
        const listings = await db
            .from('labour_listings')
            .where('provider_id', providerId)
            .orderBy('id', 'desc');
        const formatted = listings.map((l) => {
            let parsedImages = [];
            if (l.images) {
                try {
                    const arr = JSON.parse(l.images);
                    if (Array.isArray(arr))
                        parsedImages = arr;
                }
                catch {
                    if (typeof l.images === 'string')
                        parsedImages = [l.images];
                }
            }
            return {
                ...l,
                coverImage: l.cover_image,
                images: parsedImages,
                status: (l.status || 'LIVE').toUpperCase(),
            };
        });
        return response.json({
            success: true,
            data: formatted,
        });
    }
    async createLabourListing(ctx) {
        const { request, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const { name, type, priceDisplay, priceAmount, details, coverImage, images, status } = request.all();
        if (!name || !type) {
            return response.status(422).json({
                success: false,
                message: 'Staff role name and category type are required',
            });
        }
        const provider = await db.from('providers').where('id', providerId).first();
        const now = new Date();
        const priceNum = typeof priceAmount === 'number' ? priceAmount : (parseFloat(String(priceAmount || priceDisplay || '').replace(/[^0-9.]/g, '')) || 500);
        const formattedDisplay = priceDisplay || `From ₹${priceNum} / staff`;
        const cleanImages = Array.isArray(images)
            ? JSON.stringify(images.filter(Boolean).slice(0, 10))
            : null;
        const [idRaw] = await db.table('labour_listings').insert({
            provider_id: providerId,
            name: name.trim(),
            type: type.trim(),
            provider_name: provider?.business_name || 'Verified Provider',
            price_display: formattedDisplay,
            price_amount: priceNum,
            rating: provider?.rating || 0,
            verified: Boolean(provider?.verified),
            details: details ? details.trim() : 'Professional event staff & labour support in Rajapalayam.',
            cover_image: coverImage || null,
            images: cleanImages,
            status: (status || 'LIVE').toUpperCase(),
            created_at: now,
            updated_at: now,
        }).returning('id');
        const newId = typeof idRaw === 'object' ? idRaw.id : idRaw;
        return response.status(201).json({
            success: true,
            message: 'Labour service listed successfully',
            data: { id: newId },
        });
    }
    async updateLabourListing(ctx) {
        const { params, request, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const { name, type, priceDisplay, priceAmount, details, coverImage, images, status } = request.all();
        const listing = await db
            .from('labour_listings')
            .where('id', params.id)
            .where('provider_id', providerId)
            .first();
        if (!listing) {
            return response.status(404).json({ success: false, message: 'Labour listing not found' });
        }
        const now = new Date();
        const updatePayload = { updated_at: now };
        if (name)
            updatePayload.name = name.trim();
        if (type)
            updatePayload.type = type.trim();
        if (priceDisplay)
            updatePayload.price_display = priceDisplay;
        if (priceAmount !== undefined)
            updatePayload.price_amount = Number(priceAmount) || 0;
        if (details !== undefined)
            updatePayload.details = details.trim();
        if (coverImage !== undefined)
            updatePayload.cover_image = coverImage || null;
        if (status)
            updatePayload.status = status.toUpperCase();
        if (Array.isArray(images)) {
            updatePayload.images = JSON.stringify(images.filter(Boolean).slice(0, 10));
        }
        await db.from('labour_listings').where('id', params.id).update(updatePayload);
        return response.json({
            success: true,
            message: 'Labour listing updated successfully',
        });
    }
    async toggleLabourListingStatus(ctx) {
        const { params, response } = ctx;
        const providerId = this.getProviderId(ctx);
        const listing = await db
            .from('labour_listings')
            .where('id', params.id)
            .where('provider_id', providerId)
            .first();
        if (!listing) {
            return response.status(404).json({ success: false, message: 'Labour listing not found' });
        }
        const nextStatus = (listing.status || 'LIVE') === 'LIVE' ? 'PAUSED' : 'LIVE';
        await db.from('labour_listings').where('id', params.id).update({
            status: nextStatus,
            updated_at: new Date(),
        });
        return response.json({
            success: true,
            message: `${listing.name} is now ${nextStatus === 'LIVE' ? 'Live' : 'Paused'}`,
            status: nextStatus,
        });
    }
    async deleteLabourListing(ctx) {
        const { params, response } = ctx;
        const providerId = this.getProviderId(ctx);
        await db
            .from('labour_listings')
            .where('id', params.id)
            .where('provider_id', providerId)
            .delete();
        return response.json({
            success: true,
            message: 'Labour listing removed successfully',
        });
    }
}
//# sourceMappingURL=provider_portal_controller.js.map