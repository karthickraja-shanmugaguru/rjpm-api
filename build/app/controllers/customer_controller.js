import db from '@adonisjs/lucid/services/db';
export default class CustomerController {
    async createEnquiry({ request, response }, ctx) {
        const user = ctx.authUser;
        const { providerId, serviceId, packageId, eventType, eventDate, guestCount, requirements, contactPreference, } = request.all();
        if (!providerId || !eventDate || !eventType) {
            return response.status(422).json({
                success: false,
                message: 'Provider, event type and event date are required',
            });
        }
        const now = new Date();
        const [enqIdRaw] = await db.table('enquiries').insert({
            customer_id: user.id,
            provider_id: providerId,
            service_id: serviceId || null,
            package_id: packageId || null,
            event_type: eventType,
            event_date: eventDate,
            guest_count: guestCount ? String(guestCount) : null,
            requirements: requirements || null,
            contact_preference: contactPreference || 'Anytime',
            status: 'PENDING',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const enquiryId = typeof enqIdRaw === 'object' ? enqIdRaw.id : enqIdRaw;
        return response.status(201).json({
            success: true,
            message: 'Enquiry sent successfully. The provider will contact you shortly.',
            data: { id: enquiryId },
        });
    }
    async getBookings({ response }, ctx) {
        const user = ctx.authUser;
        const bookings = await db
            .from('bookings')
            .join('providers', 'bookings.provider_id', 'providers.id')
            .leftJoin('services', 'bookings.service_id', 'services.id')
            .leftJoin('packages', 'bookings.package_id', 'packages.id')
            .where('bookings.customer_id', user.id)
            .select('bookings.*', 'providers.business_name as provider_name', 'providers.primary_category as category', 'services.name as service_name', 'packages.name as package_name')
            .orderBy('bookings.id', 'desc');
        const enquiries = await db
            .from('enquiries')
            .join('providers', 'enquiries.provider_id', 'providers.id')
            .leftJoin('services', 'enquiries.service_id', 'services.id')
            .leftJoin('packages', 'enquiries.package_id', 'packages.id')
            .where('enquiries.customer_id', user.id)
            .where('enquiries.status', '!=', 'ACCEPTED')
            .select('enquiries.id', 'enquiries.event_type', 'enquiries.event_date', 'enquiries.guest_count', 'enquiries.requirements', 'enquiries.status', 'enquiries.created_at', 'providers.business_name as provider_name', 'providers.primary_category as category', 'services.name as service_name', 'packages.name as package_name')
            .orderBy('enquiries.id', 'desc');
        const combined = [
            ...bookings.map((b) => ({
                id: b.id,
                name: b.provider_name,
                service: b.package_name || b.service_name || `${b.event_type} Booking`,
                category: b.category,
                date: `${b.event_date}${b.guest_count ? ` · ${b.guest_count}` : ''}`,
                status: b.status.toLowerCase(),
                isBooking: true,
            })),
            ...enquiries.map((e) => ({
                id: e.id,
                name: e.provider_name,
                service: e.package_name || e.service_name || `${e.event_type} Enquiry`,
                category: e.category,
                date: `${e.event_date}${e.guest_count ? ` · ${e.guest_count}` : ''}`,
                status: e.status.toLowerCase(),
                isBooking: false,
            })),
        ];
        return response.json({
            success: true,
            data: combined,
        });
    }
    async getFavorites({ response }, ctx) {
        const user = ctx.authUser;
        const favorites = await db
            .from('favorites')
            .where('customer_id', user.id)
            .select('provider_id', 'service_id', 'package_id');
        const providerIds = favorites.map((f) => f.provider_id).filter(Boolean);
        const providers = await db.from('providers').whereIn('id', providerIds);
        return response.json({
            success: true,
            data: {
                providerIds,
                providers,
            },
        });
    }
    async toggleFavorite({ request, response }, ctx) {
        const user = ctx.authUser;
        const { providerId, serviceId, packageId } = request.all();
        let query = db.from('favorites').where('customer_id', user.id);
        if (providerId)
            query = query.where('provider_id', providerId);
        if (serviceId)
            query = query.where('service_id', serviceId);
        if (packageId)
            query = query.where('package_id', packageId);
        const existing = await query.first();
        if (existing) {
            await db.from('favorites').where('id', existing.id).delete();
            return response.json({
                success: true,
                message: 'Removed from favorites',
                favorited: false,
            });
        }
        else {
            await db.table('favorites').insert({
                customer_id: user.id,
                provider_id: providerId || null,
                service_id: serviceId || null,
                package_id: packageId || null,
                created_at: new Date(),
                updated_at: new Date(),
            });
            return response.json({
                success: true,
                message: 'Saved to favorites',
                favorited: true,
            });
        }
    }
    async createReview({ request, response }, ctx) {
        const user = ctx.authUser;
        const { providerId, rating, comment, eventType } = request.all();
        if (!providerId || !rating || !comment) {
            return response.status(422).json({
                success: false,
                message: 'Provider, rating and review comment are required',
            });
        }
        const now = new Date();
        const [revIdRaw] = await db.table('reviews').insert({
            customer_id: user.id,
            provider_id: providerId,
            customer_name: user.name || 'Event Customer',
            rating: Number(rating),
            comment,
            event_type: eventType || 'Celebration',
            event_date_text: 'Recent event',
            created_at: now,
            updated_at: now,
        }).returning('id');
        const reviewId = typeof revIdRaw === 'object' ? revIdRaw.id : revIdRaw;
        const reviews = await db.from('reviews').where('provider_id', providerId);
        const avg = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
        await db.from('providers').where('id', providerId).update({
            rating: Number(avg.toFixed(1)),
            review_count: reviews.length,
            updated_at: now,
        });
        return response.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: { id: reviewId },
        });
    }
}
//# sourceMappingURL=customer_controller.js.map