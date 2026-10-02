import db from '@adonisjs/lucid/services/db';
import jwt from 'jsonwebtoken';
import env from '#start/env';
export default class AuthController {
    async sendOtp({ request, response }) {
        const { phone } = request.only(['phone']);
        if (!phone || String(phone).trim().length !== 10) {
            return response.status(422).json({
                success: false,
                message: 'A valid 10-digit mobile number is required',
            });
        }
        return response.json({
            success: true,
            message: 'OTP sent successfully to +91 ' + phone,
            data: {
                phone: String(phone).trim(),
                mockOtp: '123456',
            },
        });
    }
    async verifyOtp({ request, response }) {
        const { phone, otp, role = 'CUSTOMER', name, location, event_preference } = request.all();
        const cleanPhone = String(phone || '').trim();
        if (!cleanPhone || cleanPhone.length !== 10) {
            return response.status(422).json({
                success: false,
                message: 'Invalid phone number',
            });
        }
        if (String(otp).trim() !== '123456') {
            return response.status(400).json({
                success: false,
                message: 'Invalid OTP. For demo use 123456.',
            });
        }
        const now = new Date();
        let user = await db.from('users').where('phone', cleanPhone).first();
        if (!user) {
            const [id] = await db.table('users').insert({
                phone: cleanPhone,
                name: name || (role === 'PROVIDER' ? 'New Provider' : 'Valued Customer'),
                role: role.toUpperCase(),
                location: location || 'Chennai',
                event_preference: event_preference || 'Wedding',
                created_at: now,
                updated_at: now,
            }).returning('id');
            const userId = typeof id === 'object' ? id.id : id;
            user = await db.from('users').where('id', userId).first();
        }
        let provider = null;
        if (user.role === 'PROVIDER') {
            provider = await db.from('providers').where('user_id', user.id).first();
        }
        const secret = env.get('JWT_SECRET', 'evently_jwt_secret_key_super_secure_2026');
        const token = jwt.sign({ userId: user.id, phone: user.phone, role: user.role }, secret, { expiresIn: '30d' });
        return response.json({
            success: true,
            message: 'Authentication successful',
            data: {
                token,
                user: {
                    id: user.id,
                    phone: user.phone,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    location: user.location,
                    event_preference: user.event_preference,
                },
                provider: provider
                    ? {
                        id: provider.id,
                        businessName: provider.business_name,
                        ownerName: provider.owner_name,
                        primaryCategory: provider.primary_category,
                        rating: provider.rating,
                        reviewCount: provider.review_count,
                        verified: Boolean(provider.verified),
                    }
                    : null,
            },
        });
    }
    async registerProvider({ request, response }) {
        const { phone, businessName, ownerName, primaryCategory, otp } = request.all();
        const cleanPhone = String(phone || '').trim();
        if (!cleanPhone || cleanPhone.length !== 10 || !businessName) {
            return response.status(422).json({
                success: false,
                message: 'Business name and 10-digit mobile number are required',
            });
        }
        if (String(otp).trim() !== '123456') {
            return response.status(400).json({
                success: false,
                message: 'Invalid OTP. For demo use 123456.',
            });
        }
        const now = new Date();
        let user = await db.from('users').where('phone', cleanPhone).first();
        if (!user) {
            const [uId] = await db.table('users').insert({
                phone: cleanPhone,
                name: ownerName || businessName,
                role: 'PROVIDER',
                location: 'Chennai',
                created_at: now,
                updated_at: now,
            }).returning('id');
            const userId = typeof uId === 'object' ? uId.id : uId;
            user = await db.from('users').where('id', userId).first();
        }
        else {
            await db.from('users').where('id', user.id).update({
                role: 'PROVIDER',
                updated_at: now,
            });
        }
        let provider = await db.from('providers').where('user_id', user.id).first();
        if (!provider) {
            const [pId] = await db.table('providers').insert({
                user_id: user.id,
                business_name: businessName,
                owner_name: ownerName || '',
                primary_category: primaryCategory || 'Catering',
                phone: '+91 ' + cleanPhone,
                whatsapp: '+91 ' + cleanPhone,
                verified: false,
                verification_status: 'PENDING',
                created_at: now,
                updated_at: now,
            }).returning('id');
            const providerId = typeof pId === 'object' ? pId.id : pId;
            provider = await db.from('providers').where('id', providerId).first();
        }
        const secret = env.get('JWT_SECRET', 'evently_jwt_secret_key_super_secure_2026');
        const token = jwt.sign({ userId: user.id, phone: user.phone, role: 'PROVIDER' }, secret, { expiresIn: '30d' });
        return response.json({
            success: true,
            message: 'Provider registration completed',
            data: {
                token,
                user,
                provider,
            },
        });
    }
    async me({ response }, ctx) {
        const user = ctx.authUser;
        const provider = ctx.authProvider;
        return response.json({
            success: true,
            data: {
                user,
                provider,
            },
        });
    }
}
//# sourceMappingURL=auth_controller.js.map