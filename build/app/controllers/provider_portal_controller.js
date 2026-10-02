import db from '@adonisjs/lucid/services/db';
export default class ProviderPortalController {
    getProviderId(ctx) {
        return ctx.authProvider?.id || 1;
    }
    async dashboard({ response }, ctx) {
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
                businessName: provider?.business_name,
                stats: {
                    profileViews: 428,
                    profileViewsDelta: '+18% vs last week',
                    newEnquiries: Number(newEnquiriesCount[0]?.total || 0),
                    newEnquiriesAction: `${newEnquiriesCount[0]?.total || 0} need your response`,
                    activeListings: Number(activeListingsCount[0]?.total || 0),
                    activeListingsNote: 'Active on marketplace',
                    averageRating: provider?.rating || 4.8,
                    reviewCount: provider?.review_count || 0,
                },
                profileCompletion: {
                    percentage: 78,
                    items: [
                        { label: 'Business details', done: true },
                        { label: 'Service areas', done: true },
                        { label: '3+ photos', done: true },
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
    async getProfile({ response }, ctx) {
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
                rating: provider.rating,
                reviewCount: provider.review_count,
                experienceYears: provider.experience_years,
                verified: Boolean(provider.verified),
                serviceAreas: areas.map((a) => a.locality),
                socialLinks: socialLinks.reduce((acc, curr) => {
                    acc[curr.platform] = curr.url;
                    return acc;
                }, {}),
            },
        });
    }
    async updateProfile({ request, response }, ctx) {
        const providerId = this.getProviderId(ctx);
        const { businessName, ownerName, about, phone, whatsapp, serviceAreas, socialLinks } = request.all();
        const now = new Date();
        await db.from('providers').where('id', providerId).update({
            business_name: businessName,
            owner_name: ownerName,
            about,
            phone,
            whatsapp,
            updated_at: now,
        });
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
    async getServices({ response }, ctx) {
        const providerId = this.getProviderId(ctx);
        const services = await db.from('services').where('provider_id', providerId).orderBy('id', 'desc');
        return response.json({
            success: true,
            data: services.map((s) => ({
                id: s.id,
                name: s.name,
                category: s.category_name,
                price: s.price_display,
                priceAmount: s.price_amount,
                pricingType: s.pricing_type,
                icon: s.icon || '✨',
                status: s.status === 'LIVE' ? 'Live' : s.status === 'PAUSED' ? 'Paused' : 'Draft',
                desc: s.description,
            })),
        });
    }
    async createService({ request, response }, ctx) {
        const providerId = this.getProviderId(ctx);
        const { name, category, pricingType = 'STARTING_FROM', price, description, status = 'LIVE' } = request.all();
        if (!name || !category) {
            return response.status(422).json({
                success: false,
                message: 'Service name and category are required',
            });
        }
        const now = new Date();
        const [idRaw] = await db.table('services').insert({
            provider_id: providerId,
            category_name: category,
            name,
            description: description || 'Professional service by provider',
            pricing_type: pricingType,
            price_display: price || 'Price on request',
            price_amount: parseFloat(String(price || '').replace(/[^0-9.]/g, '')) || 0,
            icon: '✨',
            status: status.toUpperCase(),
            created_at: now,
            updated_at: now,
        }).returning('id');
        const newId = typeof idRaw === 'object' ? idRaw.id : idRaw;
        return response.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: { id: newId },
        });
    }
    async updateService({ params, request, response }, ctx) {
        const providerId = this.getProviderId(ctx);
        const { name, category, price, description, pricingType } = request.all();
        const now = new Date();
        const service = await db.from('services').where('id', params.id).where('provider_id', providerId).first();
        if (!service) {
            return response.status(404).json({ success: false, message: 'Service not found or unauthorized' });
        }
        await db.from('services').where('id', params.id).update({
            name: name || service.name,
            category_name: category || service.category_name,
            price_display: price || service.price_display,
            description: description !== undefined ? description : service.description,
            pricing_type: pricingType || service.pricing_type,
            updated_at: now,
        });
        return response.json({
            success: true,
            message: 'Service updated successfully',
        });
    }
    async toggleServiceStatus({ params, response }, ctx) {
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
    async deleteService({ params, response }, ctx) {
        const providerId = this.getProviderId(ctx);
        await db.from('services').where('id', params.id).where('provider_id', providerId).delete();
        return response.json({
            success: true,
            message: 'Service deleted successfully',
        });
    }
    async getPackages({ response }, ctx) {
        const providerId = this.getProviderId(ctx);
        const packages = await db.from('packages').where('provider_id', providerId).orderBy('id', 'desc');
        const pkgIds = packages.map((p) => p.id);
        const relations = await db
            .from('package_services')
            .whereIn('package_id', pkgIds)
            .select('package_id', 'service_id');
        return response.json({
            success: true,
            data: packages.map((p) => ({
                id: p.id,
                name: p.name,
                type: p.event_type,
                price: p.price_display,
                guests: p.guest_capacity || 'Up to 500 guests',
                status: p.status === 'LIVE' ? 'Live' : p.status === 'PAUSED' ? 'Paused' : 'Draft',
                description: p.description,
                icon: p.icon || '📦',
                services: relations.filter((r) => r.package_id === p.id).map((r) => r.service_id),
            })),
        });
    }
    async createPackage({ request, response }, ctx) {
        const providerId = this.getProviderId(ctx);
        const { name, type, price, guests, description, services: selectedServiceIds, status = 'LIVE' } = request.all();
        if (!name || !type || !Array.isArray(selectedServiceIds) || selectedServiceIds.length === 0) {
            return response.status(422).json({
                success: false,
                message: 'Package name, event type and at least one included service are required',
            });
        }
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
            name,
            event_type: type,
            price_display: price || 'Price on request',
            price_amount: parseFloat(String(price || '').replace(/[^0-9.]/g, '')) || 0,
            guest_capacity: guests || 'Capacity on request',
            description: description || 'Event celebration bundle',
            status: status.toUpperCase(),
            icon: iconMap[type] || '📦',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const pkgId = typeof idRaw === 'object' ? idRaw.id : idRaw;
        for (const sId of selectedServiceIds) {
            await db.table('package_services').insert({
                package_id: pkgId,
                service_id: sId,
                created_at: now,
                updated_at: now,
            });
        }
        return response.status(201).json({
            success: true,
            message: 'Package created successfully',
            data: { id: pkgId },
        });
    }
    async updatePackage({ params, request, response }, ctx) {
        const providerId = this.getProviderId(ctx);
        const { name, type, price, guests, description, services: selectedServiceIds } = request.all();
        const now = new Date();
        const pkg = await db.from('packages').where('id', params.id).where('provider_id', providerId).first();
        if (!pkg) {
            return response.status(404).json({ success: false, message: 'Package not found' });
        }
        await db.from('packages').where('id', params.id).update({
            name: name || pkg.name,
            event_type: type || pkg.event_type,
            price_display: price || pkg.price_display,
            guest_capacity: guests || pkg.guest_capacity,
            description: description !== undefined ? description : pkg.description,
            updated_at: now,
        });
        if (Array.isArray(selectedServiceIds)) {
            await db.from('package_services').where('package_id', params.id).delete();
            for (const sId of selectedServiceIds) {
                await db.table('package_services').insert({
                    package_id: params.id,
                    service_id: sId,
                    created_at: now,
                    updated_at: now,
                });
            }
        }
        return response.json({
            success: true,
            message: 'Package updated successfully',
        });
    }
    async togglePackageStatus({ params, response }, ctx) {
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
    async deletePackage({ params, response }, ctx) {
        const providerId = this.getProviderId(ctx);
        await db.from('packages').where('id', params.id).where('provider_id', providerId).delete();
        return response.json({
            success: true,
            message: 'Package deleted successfully',
        });
    }
    async getEnquiries({ response }, ctx) {
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
    async acceptEnquiry({ params, response }, ctx) {
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
    async declineEnquiry({ params, response }, ctx) {
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
    async getAvailability({ response }, ctx) {
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
    async setAvailability({ request, response }, ctx) {
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
    async getReviews({ response }, ctx) {
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
        return response.json({
            success: true,
            data: {
                overallRating: provider?.rating || 4.8,
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
    async replyReview({ params, request, response }, ctx) {
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
    async getPerformance({ response }, ctx) {
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
        const convRate = totalEnq > 0 ? ((totalBkg / totalEnq) * 100).toFixed(1) : '39.7';
        return response.json({
            success: true,
            data: {
                totalEnquiries: totalEnq || 146,
                bookings: totalBkg || 58,
                conversion: `${convRate}%`,
                profileViews: 2840,
                monthlyEnquiries: [
                    { month: 'May', count: 80 },
                    { month: 'Jun', count: 105 },
                    { month: 'Jul', count: 130 },
                    { month: 'Aug', count: 155 },
                    { month: 'Sep', count: 185 },
                ],
                topServices: [
                    { service: 'Wedding Catering', views: 820, enquiries: 48, bookings: 21 },
                    { service: 'Wedding Decoration', views: 590, enquiries: 32, bookings: 14 },
                    { service: 'Reception Catering', views: 430, enquiries: 25, bookings: 11 },
                ],
            },
        });
    }
}
//# sourceMappingURL=provider_portal_controller.js.map