import db from '@adonisjs/lucid/services/db';
import jwt from 'jsonwebtoken';
import env from '#start/env';
import crypto from 'node:crypto';
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}
function verifyPassword(password, combinedHash) {
    try {
        if (!combinedHash || !combinedHash.includes(':'))
            return false;
        const [salt, key] = combinedHash.split(':');
        const keyBuffer = Buffer.from(key, 'hex');
        const derivedKey = crypto.scryptSync(password, salt, 64);
        return crypto.timingSafeEqual(keyBuffer, derivedKey);
    }
    catch {
        return false;
    }
}
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
        const { phone, otp, role = 'CUSTOMER', name, businessName, primaryCategory, location, event_preference, action } = request.all();
        const cleanPhone = String(phone || '').trim().replace(/\D/g, '').slice(-10);
        if (!cleanPhone || cleanPhone.length !== 10) {
            return response.status(422).json({
                success: false,
                message: 'A valid 10-digit mobile number is required',
            });
        }
        const isCustomer = String(role || 'CUSTOMER').toUpperCase() === 'CUSTOMER';
        if (!isCustomer && otp && String(otp).trim() !== '123456') {
            return response.status(400).json({
                success: false,
                message: 'Invalid OTP. For demo use 123456.',
            });
        }
        const now = new Date();
        let user = await db.from('users').where('phone', cleanPhone).first();
        const isExistingUser = Boolean(user);
        if (action === 'signup' && isExistingUser) {
            return response.status(409).json({
                success: false,
                code: 'ACCOUNT_EXISTS',
                message: `An account with mobile number ${cleanPhone} already exists. Please sign in instead.`,
            });
        }
        if (action === 'signin' && !isExistingUser) {
            return response.status(404).json({
                success: false,
                code: 'ACCOUNT_NOT_FOUND',
                message: `No account found with mobile number ${cleanPhone}. Please create an account to sign up.`,
            });
        }
        if (!user) {
            const [id] = await db.table('users').insert({
                phone: cleanPhone,
                name: name || (role === 'PROVIDER' ? (businessName || 'Business Owner') : 'Customer'),
                role: role.toUpperCase(),
                location: location || 'Rajapalayam',
                event_preference: event_preference || 'Wedding',
                created_at: now,
                updated_at: now,
            }).returning('id');
            const userId = typeof id === 'object' ? id.id : id;
            user = await db.from('users').where('id', userId).first();
        }
        else {
            if (role === 'PROVIDER' && user.role !== 'PROVIDER' && user.role !== 'ADMIN') {
                await db.from('users').where('id', user.id).update({
                    role: 'PROVIDER',
                    updated_at: now,
                });
                user.role = 'PROVIDER';
            }
        }
        let provider = null;
        if (user.role === 'PROVIDER' || role === 'PROVIDER') {
            provider = await db.from('providers').where('user_id', user.id).first();
            if (!provider) {
                const [pId] = await db.table('providers').insert({
                    user_id: user.id,
                    business_name: businessName || (user.name ? `${user.name} Events` : 'My Event Business'),
                    owner_name: user.name || '',
                    primary_category: primaryCategory || 'Event Planning',
                    rating: 0,
                    review_count: 0,
                    experience_years: 0,
                    completed_events: '0',
                    verified: false,
                    verification_status: 'APPROVED',
                    about: '',
                    phone: '+91 ' + cleanPhone,
                    whatsapp: '+91 ' + cleanPhone,
                    created_at: now,
                    updated_at: now,
                }).returning('id');
                const createdId = typeof pId === 'object' ? pId.id : pId;
                provider = await db.from('providers').where('id', createdId).first();
            }
        }
        const secret = env.get('JWT_SECRET', 'evently_jwt_secret_key_super_secure_2026');
        const token = jwt.sign({ userId: user.id, phone: user.phone, role: user.role }, secret, { expiresIn: '30d' });
        return response.json({
            success: true,
            message: isExistingUser ? 'Welcome back! Logged in successfully.' : 'Account created successfully.',
            data: {
                isExistingUser,
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
                primary_category: primaryCategory || 'Event Planning',
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
    async providerSignup({ request, response }) {
        const { phone, password, businessName, ownerName, primaryCategory } = request.all();
        const cleanPhone = String(phone || '').trim().replace(/\D/g, '').slice(-10);
        if (!cleanPhone || cleanPhone.length !== 10) {
            return response.status(422).json({
                success: false,
                message: 'A valid 10-digit mobile number is required',
            });
        }
        if (!businessName || !String(businessName).trim()) {
            return response.status(422).json({
                success: false,
                message: 'Business / Shop name is required',
            });
        }
        if (!password || String(password).length < 4) {
            return response.status(422).json({
                success: false,
                message: 'Password must be at least 4 characters long',
            });
        }
        const existingUser = await db.from('users').where('phone', cleanPhone).first();
        if (existingUser) {
            const existingProvider = await db.from('providers').where('user_id', existingUser.id).first();
            if (existingUser.password || existingProvider || existingUser.role === 'PROVIDER') {
                return response.status(409).json({
                    success: false,
                    code: 'ACCOUNT_EXISTS',
                    message: `An account with mobile number ${cleanPhone} already exists. Please sign in instead.`,
                });
            }
        }
        const now = new Date();
        const hashedPassword = hashPassword(String(password));
        const cleanOwnerName = String(ownerName || '').trim() || String(businessName).trim();
        let user = existingUser;
        if (!user) {
            const [uId] = await db.table('users').insert({
                phone: cleanPhone,
                name: cleanOwnerName,
                role: 'PROVIDER',
                password: hashedPassword,
                location: 'Rajapalayam',
                created_at: now,
                updated_at: now,
            }).returning('id');
            const userId = typeof uId === 'object' ? uId.id : uId;
            user = await db.from('users').where('id', userId).first();
        }
        else {
            await db.from('users').where('id', user.id).update({
                role: 'PROVIDER',
                name: cleanOwnerName || user.name,
                password: hashedPassword,
                updated_at: now,
            });
            user = await db.from('users').where('id', user.id).first();
        }
        let provider = await db.from('providers').where('user_id', user.id).first();
        if (!provider) {
            const [pId] = await db.table('providers').insert({
                user_id: user.id,
                business_name: String(businessName).trim(),
                owner_name: cleanOwnerName,
                primary_category: primaryCategory || 'Event Planning',
                rating: 4.8,
                review_count: 0,
                experience_years: 1,
                completed_events: '10+',
                verified: false,
                verification_status: 'APPROVED',
                about: '',
                phone: '+91 ' + cleanPhone,
                whatsapp: '+91 ' + cleanPhone,
                created_at: now,
                updated_at: now,
            }).returning('id');
            const providerId = typeof pId === 'object' ? pId.id : pId;
            provider = await db.from('providers').where('id', providerId).first();
        }
        else {
            await db.from('providers').where('id', provider.id).update({
                business_name: String(businessName).trim(),
                owner_name: cleanOwnerName,
                primary_category: primaryCategory || provider.primary_category,
                updated_at: now,
            });
            provider = await db.from('providers').where('id', provider.id).first();
        }
        const secret = env.get('JWT_SECRET', 'evently_jwt_secret_key_super_secure_2026');
        const token = jwt.sign({ userId: user.id, phone: user.phone, role: user.role }, secret, { expiresIn: '30d' });
        return response.json({
            success: true,
            message: 'Provider account created successfully!',
            data: {
                token,
                user: {
                    id: user.id,
                    phone: user.phone,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    location: user.location,
                },
                provider: {
                    id: provider.id,
                    businessName: provider.business_name,
                    ownerName: provider.owner_name,
                    primaryCategory: provider.primary_category,
                    rating: provider.rating,
                    reviewCount: provider.review_count,
                    verified: Boolean(provider.verified),
                },
            },
        });
    }
    async providerLogin({ request, response }) {
        const { phone, password } = request.all();
        const cleanPhone = String(phone || '').trim().replace(/\D/g, '').slice(-10);
        if (!cleanPhone || cleanPhone.length !== 10) {
            return response.status(422).json({
                success: false,
                message: 'Please enter a valid 10-digit mobile number',
            });
        }
        if (!password || !String(password).trim()) {
            return response.status(422).json({
                success: false,
                message: 'Password is required',
            });
        }
        const user = await db.from('users').where('phone', cleanPhone).first();
        if (!user) {
            return response.status(404).json({
                success: false,
                message: 'No account found with this mobile number. Please sign up first.',
            });
        }
        if (!user.password) {
            const hashedPassword = hashPassword(String(password));
            await db.from('users').where('id', user.id).update({
                password: hashedPassword,
                updated_at: new Date(),
            });
        }
        else {
            const isMatch = verifyPassword(String(password), user.password);
            if (!isMatch) {
                return response.status(401).json({
                    success: false,
                    message: 'Incorrect password. Please try again.',
                });
            }
        }
        if (user.role !== 'PROVIDER' && user.role !== 'ADMIN') {
            await db.from('users').where('id', user.id).update({
                role: 'PROVIDER',
                updated_at: new Date(),
            });
            user.role = 'PROVIDER';
        }
        let provider = await db.from('providers').where('user_id', user.id).first();
        if (!provider) {
            const now = new Date();
            const [pId] = await db.table('providers').insert({
                user_id: user.id,
                business_name: user.name ? `${user.name} Events` : 'My Event Business',
                owner_name: user.name || '',
                primary_category: 'Event Planning',
                rating: 4.8,
                review_count: 0,
                experience_years: 1,
                completed_events: '10+',
                verified: false,
                verification_status: 'APPROVED',
                about: '',
                phone: '+91 ' + cleanPhone,
                whatsapp: '+91 ' + cleanPhone,
                created_at: now,
                updated_at: now,
            }).returning('id');
            const providerId = typeof pId === 'object' ? pId.id : pId;
            provider = await db.from('providers').where('id', providerId).first();
        }
        const secret = env.get('JWT_SECRET', 'evently_jwt_secret_key_super_secure_2026');
        const token = jwt.sign({ userId: user.id, phone: user.phone, role: user.role }, secret, { expiresIn: '30d' });
        return response.json({
            success: true,
            message: 'Logged in successfully!',
            data: {
                token,
                user: {
                    id: user.id,
                    phone: user.phone,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    location: user.location,
                },
                provider: {
                    id: provider.id,
                    businessName: provider.business_name,
                    ownerName: provider.owner_name,
                    primaryCategory: provider.primary_category,
                    rating: provider.rating,
                    reviewCount: provider.review_count,
                    verified: Boolean(provider.verified),
                },
            },
        });
    }
    async providerResetPassword({ request, response }) {
        const { phone, otp, newPassword } = request.all();
        const cleanPhone = String(phone || '').trim().replace(/\D/g, '').slice(-10);
        if (!cleanPhone || cleanPhone.length !== 10) {
            return response.status(422).json({
                success: false,
                message: 'A valid 10-digit mobile number is required',
            });
        }
        if (!otp || String(otp).trim() !== '123456') {
            return response.status(400).json({
                success: false,
                message: 'Invalid OTP. For demo use 123456.',
            });
        }
        if (!newPassword || String(newPassword).length < 4) {
            return response.status(422).json({
                success: false,
                message: 'New password must be at least 4 characters long',
            });
        }
        const user = await db.from('users').where('phone', cleanPhone).first();
        if (!user) {
            return response.status(404).json({
                success: false,
                message: 'No account found with this mobile number.',
            });
        }
        const hashedPassword = hashPassword(String(newPassword));
        await db.from('users').where('id', user.id).update({
            password: hashedPassword,
            updated_at: new Date(),
        });
        return response.json({
            success: true,
            message: 'Password reset successfully! You can now log in with your new password.',
        });
    }
    async me(ctx) {
        const user = ctx.authUser;
        const provider = ctx.authProvider;
        return ctx.response.json({
            success: true,
            data: {
                user,
                provider,
            },
        });
    }
}
//# sourceMappingURL=auth_controller.js.map