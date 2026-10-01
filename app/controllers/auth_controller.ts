import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import jwt from 'jsonwebtoken'
import env from '#start/env'
import crypto from 'node:crypto'

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    if (!combinedHash || !combinedHash.includes(':')) return false
    const [salt, key] = combinedHash.split(':')
    const keyBuffer = Buffer.from(key, 'hex')
    const derivedKey = crypto.scryptSync(password, salt, 64)
    return crypto.timingSafeEqual(keyBuffer, derivedKey)
  } catch {
    return false
  }
}

export default class AuthController {
  /**
   * POST /api/auth/send-otp
   * Request OTP for a mobile number
   */
  async sendOtp({ request, response }: HttpContext) {
    const { phone } = request.only(['phone'])
    if (!phone || String(phone).trim().length !== 10) {
      return response.status(422).json({
        success: false,
        message: 'A valid 10-digit mobile number is required',
      })
    }

    // In development mode, mock OTP 123456 is supported
    return response.json({
      success: true,
      message: 'OTP sent successfully to +91 ' + phone,
      data: {
        phone: String(phone).trim(),
        mockOtp: '123456',
      },
    })
  }

  /**
   * POST /api/auth/verify-otp
   * Validate OTP and sign in / sign up customer or provider
   */
  async verifyOtp({ request, response }: HttpContext) {
    const { phone, otp, role = 'CUSTOMER', name, businessName, primaryCategory, location, event_preference } = request.all()
    const cleanPhone = String(phone || '').trim()

    if (!cleanPhone || cleanPhone.length !== 10) {
      return response.status(422).json({
        success: false,
        message: 'Invalid phone number',
      })
    }

    // Customer login does not require OTP verification (direct name & mobile login)
    const isCustomer = String(role || 'CUSTOMER').toUpperCase() === 'CUSTOMER'
    if (!isCustomer && otp && String(otp).trim() !== '123456') {
      return response.status(400).json({
        success: false,
        message: 'Invalid OTP. For demo use 123456.',
      })
    }

    const now = new Date()
    let user = await db.from('users').where('phone', cleanPhone).first()
    const isExistingUser = Boolean(user)

    if (!user) {
      // Auto-register customer or provider
      const [id] = await db.table('users').insert({
        phone: cleanPhone,
        name: name || (role === 'PROVIDER' ? (businessName || 'Business Owner') : 'Customer'),
        role: role.toUpperCase(),
        location: location || 'Rajapalayam',
        event_preference: event_preference || 'Wedding',
        created_at: now,
        updated_at: now,
      }).returning('id')

      const userId = typeof id === 'object' ? (id as any).id : id
      user = await db.from('users').where('id', userId).first()
    } else {
      // Update name if customer provides an updated name
      if (name && String(name).trim() && user.name !== String(name).trim()) {
        await db.from('users').where('id', user.id).update({
          name: String(name).trim(),
          updated_at: now,
        })
        user.name = String(name).trim()
      }

      if (role === 'PROVIDER' && user.role !== 'PROVIDER' && user.role !== 'ADMIN') {
        // Ensure user has provider privileges when logging in via provider portal
        await db.from('users').where('id', user.id).update({
          role: 'PROVIDER',
          updated_at: now,
        })
        user.role = 'PROVIDER'
      }
    }

    // If provider, ensure provider profile exists
    let provider = null
    if (user.role === 'PROVIDER' || role === 'PROVIDER') {
      provider = await db.from('providers').where('user_id', user.id).first()
      if (!provider) {
        // Automatically create a linked provider profile if not present
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
        }).returning('id')
        const createdId = typeof pId === 'object' ? (pId as any).id : pId
        provider = await db.from('providers').where('id', createdId).first()
      }
    }

    const secret = env.get('JWT_SECRET', 'evently_jwt_secret_key_super_secure_2026')
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      secret,
      { expiresIn: '30d' }
    )

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
    })
  }

  /**
   * POST /api/auth/register-provider
   * Provider onboarding registration
   */
  async registerProvider({ request, response }: HttpContext) {
    const { phone, businessName, ownerName, primaryCategory, otp } = request.all()
    const cleanPhone = String(phone || '').trim()

    if (!cleanPhone || cleanPhone.length !== 10 || !businessName) {
      return response.status(422).json({
        success: false,
        message: 'Business name and 10-digit mobile number are required',
      })
    }

    if (String(otp).trim() !== '123456') {
      return response.status(400).json({
        success: false,
        message: 'Invalid OTP. For demo use 123456.',
      })
    }

    const now = new Date()
    let user = await db.from('users').where('phone', cleanPhone).first()
    if (!user) {
      const [uId] = await db.table('users').insert({
        phone: cleanPhone,
        name: ownerName || businessName,
        role: 'PROVIDER',
        location: 'Chennai',
        created_at: now,
        updated_at: now,
      }).returning('id')
      const userId = typeof uId === 'object' ? (uId as any).id : uId
      user = await db.from('users').where('id', userId).first()
    } else {
      await db.from('users').where('id', user.id).update({
        role: 'PROVIDER',
        updated_at: now,
      })
    }

    let provider = await db.from('providers').where('user_id', user.id).first()
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
      }).returning('id')
      const providerId = typeof pId === 'object' ? (pId as any).id : pId
      provider = await db.from('providers').where('id', providerId).first()
    }

    const secret = env.get('JWT_SECRET', 'evently_jwt_secret_key_super_secure_2026')
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: 'PROVIDER' },
      secret,
      { expiresIn: '30d' }
    )

    return response.json({
      success: true,
      message: 'Provider registration completed',
      data: {
        token,
        user,
        provider,
      },
    })
  }

  /**
   * POST /api/auth/provider/signup
   * Direct provider registration with password (no OTP)
   */
  async providerSignup({ request, response }: HttpContext) {
    const { phone, password, businessName, ownerName, primaryCategory } = request.all()
    const cleanPhone = String(phone || '').trim().replace(/\D/g, '').slice(-10)

    if (!cleanPhone || cleanPhone.length !== 10) {
      return response.status(422).json({
        success: false,
        message: 'A valid 10-digit mobile number is required',
      })
    }

    if (!businessName || !String(businessName).trim()) {
      return response.status(422).json({
        success: false,
        message: 'Business / Shop name is required',
      })
    }

    if (!password || String(password).length < 4) {
      return response.status(422).json({
        success: false,
        message: 'Password must be at least 4 characters long',
      })
    }

    // Check if account already exists
    const existingUser = await db.from('users').where('phone', cleanPhone).first()
    if (existingUser) {
      const existingProvider = await db.from('providers').where('user_id', existingUser.id).first()
      // If user already has a password or already has a provider profile or is a PROVIDER
      if (existingUser.password || existingProvider || existingUser.role === 'PROVIDER') {
        return response.status(409).json({
          success: false,
          code: 'ACCOUNT_EXISTS',
          message: `An account with mobile number ${cleanPhone} already exists. Please sign in instead.`,
        })
      }
    }

    const now = new Date()
    const hashedPassword = hashPassword(String(password))
    const cleanOwnerName = String(ownerName || '').trim() || String(businessName).trim()

    let user = existingUser
    if (!user) {
      const [uId] = await db.table('users').insert({
        phone: cleanPhone,
        name: cleanOwnerName,
        role: 'PROVIDER',
        password: hashedPassword,
        location: 'Rajapalayam',
        created_at: now,
        updated_at: now,
      }).returning('id')
      const userId = typeof uId === 'object' ? (uId as any).id : uId
      user = await db.from('users').where('id', userId).first()
    } else {
      // First time onboarding as provider from customer role
      await db.from('users').where('id', user.id).update({
        role: 'PROVIDER',
        name: cleanOwnerName || user.name,
        password: hashedPassword,
        updated_at: now,
      })
      user = await db.from('users').where('id', user.id).first()
    }

    let provider = await db.from('providers').where('user_id', user.id).first()
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
      }).returning('id')
      const providerId = typeof pId === 'object' ? (pId as any).id : pId
      provider = await db.from('providers').where('id', providerId).first()
    } else {
      await db.from('providers').where('id', provider.id).update({
        business_name: String(businessName).trim(),
        owner_name: cleanOwnerName,
        primary_category: primaryCategory || provider.primary_category,
        updated_at: now,
      })
      provider = await db.from('providers').where('id', provider.id).first()
    }

    const secret = env.get('JWT_SECRET', 'evently_jwt_secret_key_super_secure_2026')
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      secret,
      { expiresIn: '30d' }
    )

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
    })
  }

  /**
   * POST /api/auth/provider/login
   * Provider login using mobile and password (no OTP)
   */
  async providerLogin({ request, response }: HttpContext) {
    const { phone, password } = request.all()
    const cleanPhone = String(phone || '').trim().replace(/\D/g, '').slice(-10)

    if (!cleanPhone || cleanPhone.length !== 10) {
      return response.status(422).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number',
      })
    }

    if (!password || !String(password).trim()) {
      return response.status(422).json({
        success: false,
        message: 'Password is required',
      })
    }

    const user = await db.from('users').where('phone', cleanPhone).first()
    if (!user) {
      return response.status(404).json({
        success: false,
        message: 'No account found with this mobile number. Please sign up first.',
      })
    }

    // If existing user has no password yet (e.g. legacy test accounts), save this password for them!
    if (!user.password) {
      const hashedPassword = hashPassword(String(password))
      await db.from('users').where('id', user.id).update({
        password: hashedPassword,
        updated_at: new Date(),
      })
    } else {
      const isMatch = verifyPassword(String(password), user.password)
      if (!isMatch) {
        return response.status(401).json({
          success: false,
          message: 'Incorrect password. Please try again.',
        })
      }
    }

    // Ensure role is PROVIDER
    if (user.role !== 'PROVIDER' && user.role !== 'ADMIN') {
      await db.from('users').where('id', user.id).update({
        role: 'PROVIDER',
        updated_at: new Date(),
      })
      user.role = 'PROVIDER'
    }

    let provider = await db.from('providers').where('user_id', user.id).first()
    if (!provider) {
      const now = new Date()
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
      }).returning('id')
      const providerId = typeof pId === 'object' ? (pId as any).id : pId
      provider = await db.from('providers').where('id', providerId).first()
    }

    const secret = env.get('JWT_SECRET', 'evently_jwt_secret_key_super_secure_2026')
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      secret,
      { expiresIn: '30d' }
    )

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
    })
  }

  /**
   * POST /api/auth/provider/reset-password
   * Reset provider password using OTP
   */
  async providerResetPassword({ request, response }: HttpContext) {
    const { phone, otp, newPassword } = request.all()
    const cleanPhone = String(phone || '').trim().replace(/\D/g, '').slice(-10)

    if (!cleanPhone || cleanPhone.length !== 10) {
      return response.status(422).json({
        success: false,
        message: 'A valid 10-digit mobile number is required',
      })
    }

    if (!otp || String(otp).trim() !== '123456') {
      return response.status(400).json({
        success: false,
        message: 'Invalid OTP. For demo use 123456.',
      })
    }

    if (!newPassword || String(newPassword).length < 4) {
      return response.status(422).json({
        success: false,
        message: 'New password must be at least 4 characters long',
      })
    }

    const user = await db.from('users').where('phone', cleanPhone).first()
    if (!user) {
      return response.status(404).json({
        success: false,
        message: 'No account found with this mobile number.',
      })
    }

    const hashedPassword = hashPassword(String(newPassword))
    await db.from('users').where('id', user.id).update({
      password: hashedPassword,
      updated_at: new Date(),
    })

    return response.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    })
  }

  /**
   * GET /api/auth/me
   */
  async me(ctx: HttpContext) {
    const user = (ctx as any).authUser
    const provider = (ctx as any).authProvider
    return ctx.response.json({
      success: true,
      data: {
        user,
        provider,
      },
    })
  }
}
