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
   * Automatically find, claim, and merge all provider records matching the user's phone number.
   * Ensures:
   * 1. Zero duplicate provider listings on the platform.
   * 2. All services, packages, labour, reviews, and enquiries are merged under one primary profile.
   * 3. The provider is linked to userId, claimed=true, provider_status='CLAIMED_ACTIVE'.
   */
  async autoMergeAndClaimProvider(
    userId: number,
    rawPhone: string,
    fallbackData: { businessName?: string; ownerName?: string; primaryCategory?: string } = {}
  ) {
    const cleanPhone = String(rawPhone || '').replace(/\D/g, '').slice(-10)
    if (!cleanPhone || cleanPhone.length !== 10) {
      return { claimed: false, provider: null, stats: null, message: null }
    }

    const now = new Date()

    // 1. Find all providers matching this 10-digit phone OR linked to userId
    const matchingProviders = await db
      .from('providers')
      .where((qb: any) => {
        qb.where('phone', 'like', `%${cleanPhone}%`)
          .orWhere('whatsapp', 'like', `%${cleanPhone}%`)
          .orWhere('user_id', userId)
      })
      .orderBy('id', 'asc')

    if (matchingProviders.length === 0) {
      // No existing provider found, create a new one
      const [newId] = await db.table('providers').insert({
        user_id: userId,
        business_name: fallbackData.businessName || 'My Event Business',
        owner_name: fallbackData.ownerName || '',
        primary_category: fallbackData.primaryCategory || 'Event Planning',
        rating: 0,
        review_count: 0,
        experience_years: 1,
        completed_events: '0',
        verified: false,
        verification_status: 'APPROVED',
        provider_status: 'CLAIMED_ACTIVE',
        claimed: true,
        source: 'DIRECT_SIGNUP',
        about: '',
        phone: '+91 ' + cleanPhone,
        whatsapp: '+91 ' + cleanPhone,
        created_at: now,
        updated_at: now,
      }).returning('id')

      const createdId = typeof newId === 'object' ? (newId as any).id : newId
      const createdProvider = await db.from('providers').where('id', createdId).first()

      // Re-parent any standalone listings created with this phone number
      await db.from('services').whereNull('provider_id').where((qb: any) => {
        qb.where('phone', 'like', `%${cleanPhone}%`).orWhere('whatsapp', 'like', `%${cleanPhone}%`)
      }).update({ provider_id: createdId, updated_at: now })

      await db.from('packages').whereNull('provider_id').where((qb: any) => {
        qb.where('phone', 'like', `%${cleanPhone}%`).orWhere('whatsapp', 'like', `%${cleanPhone}%`)
      }).update({ provider_id: createdId, updated_at: now })

      await db.from('labour_listings').whereNull('provider_id').where((qb: any) => {
        qb.where('phone', 'like', `%${cleanPhone}%`).orWhere('whatsapp', 'like', `%${cleanPhone}%`)
      }).update({ provider_id: createdId, updated_at: now })

      return {
        claimed: false,
        provider: createdProvider,
        stats: null,
        message: 'Provider profile initialized successfully',
      }
    }

    // 2. Select primary provider:
    // Prefer the one that already has user_id === userId, or the one with services attached, or the first one
    let primary = matchingProviders.find((p: any) => p.user_id === userId)
    if (!primary) {
      primary = matchingProviders[0]
    }

    const duplicates = matchingProviders.filter((p: any) => p.id !== primary.id)

    // 3. For all duplicate provider rows, re-parent their child records to primary provider
    for (const dup of duplicates) {
      await db.from('services').where('provider_id', dup.id).update({ provider_id: primary.id })
      await db.from('packages').where('provider_id', dup.id).update({ provider_id: primary.id })
      await db.from('labour_listings').where('provider_id', dup.id).update({ provider_id: primary.id })
      await db.from('enquiries').where('provider_id', dup.id).update({ provider_id: primary.id })
      await db.from('reviews').where('provider_id', dup.id).update({ provider_id: primary.id })
      await db.from('provider_service_areas').where('provider_id', dup.id).update({ provider_id: primary.id })

      // Delete the duplicate provider row so it NEVER displays as duplicate on customer site
      await db.from('providers').where('id', dup.id).delete()
    }

    // Also re-parent any standalone listings created with this phone number
    await db.from('services').whereNull('provider_id').where((qb: any) => {
      qb.where('phone', 'like', `%${cleanPhone}%`).orWhere('whatsapp', 'like', `%${cleanPhone}%`)
    }).update({ provider_id: primary.id, updated_at: now })

    await db.from('packages').whereNull('provider_id').where((qb: any) => {
      qb.where('phone', 'like', `%${cleanPhone}%`).orWhere('whatsapp', 'like', `%${cleanPhone}%`)
    }).update({ provider_id: primary.id, updated_at: now })

    await db.from('labour_listings').whereNull('provider_id').where((qb: any) => {
      qb.where('phone', 'like', `%${cleanPhone}%`).orWhere('whatsapp', 'like', `%${cleanPhone}%`)
    }).update({ provider_id: primary.id, updated_at: now })

    // 4. Update primary provider to be fully claimed & linked to userId
    const updatePayload: any = {
      user_id: userId,
      claimed: true,
      provider_status: 'CLAIMED_ACTIVE',
      verified: true,
      verification_status: 'APPROVED',
      phone: '+91 ' + cleanPhone,
      whatsapp: primary.whatsapp || ('+91 ' + cleanPhone),
      updated_at: now,
    }

    if (fallbackData.businessName && fallbackData.businessName.trim()) {
      updatePayload.business_name = fallbackData.businessName.trim()
    }
    if (fallbackData.ownerName && fallbackData.ownerName.trim()) {
      updatePayload.owner_name = fallbackData.ownerName.trim()
    }
    if (fallbackData.primaryCategory && fallbackData.primaryCategory.trim()) {
      updatePayload.primary_category = fallbackData.primaryCategory.trim()
    }

    await db.from('providers').where('id', primary.id).update(updatePayload)
    const updatedProvider = await db.from('providers').where('id', primary.id).first()

    // 5. Count attached services, packages, and labours
    const [svcRow] = await db.from('services').where('provider_id', primary.id).count('* as total')
    const [pkgRow] = await db.from('packages').where('provider_id', primary.id).count('* as total')
    const [labourRow] = await db.from('labour_listings').where('provider_id', primary.id).count('* as total')

    const servicesCount = Number(svcRow?.total || 0)
    const packagesCount = Number(pkgRow?.total || 0)
    const laboursCount = Number(labourRow?.total || 0)
    const totalListings = servicesCount + packagesCount + laboursCount

    return {
      claimed: true,
      provider: updatedProvider,
      stats: {
        servicesCount,
        packagesCount,
        laboursCount,
        totalListings,
        businessName: updatedProvider.business_name,
      },
      message: `Account claimed & verified! Found ${totalListings} listings automatically attached to your profile.`,
    }
  }

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
    const { phone, otp, role = 'CUSTOMER', name, businessName, primaryCategory, location, event_preference, action } = request.all()
    const cleanPhone = String(phone || '').trim().replace(/\D/g, '').slice(-10)

    if (!cleanPhone || cleanPhone.length !== 10) {
      return response.status(422).json({
        success: false,
        message: 'A valid 10-digit mobile number is required',
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

    // Check action: If signup and user already exists, prevent duplicate signup
    if (action === 'signup' && isExistingUser) {
      return response.status(409).json({
        success: false,
        code: 'ACCOUNT_EXISTS',
        message: `An account with mobile number ${cleanPhone} already exists. Please sign in instead.`,
      })
    }

    // Check action: If signin and user does not exist, require signup
    if (action === 'signin' && !isExistingUser) {
      return response.status(404).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: `No account found with mobile number ${cleanPhone}. Please create an account to sign up.`,
      })
    }

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
      if (role === 'PROVIDER' && user.role !== 'PROVIDER' && user.role !== 'ADMIN') {
        // Ensure user has provider privileges when logging in via provider portal
        await db.from('users').where('id', user.id).update({
          role: 'PROVIDER',
          updated_at: now,
        })
        user.role = 'PROVIDER'
      }
    }

    // If provider, check auto-claim & merge shadow profiles
    let provider = null
    let autoClaimResult: any = null

    if (user.role === 'PROVIDER' || role === 'PROVIDER') {
      const claimResult = await this.autoMergeAndClaimProvider(user.id, cleanPhone, {
        businessName,
        primaryCategory,
      })
      provider = claimResult.provider
      autoClaimResult = claimResult
    }

    const secret = env.get('JWT_SECRET', 'evently_jwt_secret_key_super_secure_2026')
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      secret,
      { expiresIn: '30d' }
    )

    const returnMessage = autoClaimResult?.claimed
      ? autoClaimResult.message
      : isExistingUser
      ? 'Welcome back! Logged in successfully.'
      : 'Account created successfully.'

    return response.json({
      success: true,
      message: returnMessage,
      data: {
        isExistingUser,
        token,
        autoClaimed: Boolean(autoClaimResult?.claimed),
        claimedStats: autoClaimResult?.stats || null,
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
              providerStatus: provider.provider_status,
              claimed: Boolean(provider.claimed),
              source: provider.source,
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

    const autoClaimResult = await this.autoMergeAndClaimProvider(user.id, cleanPhone, {
      businessName,
      ownerName,
      primaryCategory,
    })
    const provider = autoClaimResult.provider

    const secret = env.get('JWT_SECRET', 'evently_jwt_secret_key_super_secure_2026')
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: 'PROVIDER' },
      secret,
      { expiresIn: '30d' }
    )

    return response.json({
      success: true,
      message: autoClaimResult?.claimed ? autoClaimResult.message : 'Provider registration completed',
      data: {
        token,
        autoClaimed: Boolean(autoClaimResult?.claimed),
        claimedStats: autoClaimResult?.stats || null,
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

    const autoClaimResult = await this.autoMergeAndClaimProvider(user.id, cleanPhone, {
      businessName: String(businessName).trim(),
      ownerName: cleanOwnerName,
      primaryCategory,
    })
    const provider = autoClaimResult.provider

    const secret = env.get('JWT_SECRET', 'evently_jwt_secret_key_super_secure_2026')
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      secret,
      { expiresIn: '30d' }
    )

    return response.json({
      success: true,
      message: autoClaimResult?.claimed ? autoClaimResult.message : 'Provider account created successfully!',
      data: {
        token,
        autoClaimed: Boolean(autoClaimResult?.claimed),
        claimedStats: autoClaimResult?.stats || null,
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
          providerStatus: provider.provider_status,
          claimed: Boolean(provider.claimed),
          source: provider.source,
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

    // Auto-merge & claim any matching providers
    const claimResult = await this.autoMergeAndClaimProvider(user.id, cleanPhone)
    const provider = claimResult.provider

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
    let provider = (ctx as any).authProvider
    if (!provider && user?.role === 'PROVIDER' && user?.phone) {
      const claimResult = await this.autoMergeAndClaimProvider(user.id, user.phone)
      provider = claimResult.provider
    }
    return ctx.response.json({
      success: true,
      data: {
        user,
        provider,
      },
    })
  }
}
