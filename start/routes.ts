import router from '@adonisjs/core/services/router'
import AuthController from '#controllers/auth_controller'
import CategoryController from '#controllers/category_controller'
import ServiceController from '#controllers/service_controller'
import PackageController from '#controllers/package_controller'
import ProviderController from '#controllers/provider_controller'
import LabourController from '#controllers/labour_controller'
import CustomerController from '#controllers/customer_controller'
import ProviderPortalController from '#controllers/provider_portal_controller'
import AuthMiddleware from '#middleware/auth_middleware'
import RoleMiddleware from '#middleware/role_middleware'

const authMiddleware = new AuthMiddleware()
const roleMiddleware = new RoleMiddleware()

// Helper for auth check
const auth = () => async (ctx: any, next: any) => {
  return authMiddleware.handle(ctx, next)
}

// Helper for role check
const role = (roles: string[]) => async (ctx: any, next: any) => {
  return roleMiddleware.handle(ctx, next, roles)
}

router.group(() => {

  /* =========================================================================
     PUBLIC ROUTES
     ========================================================================= */
  // Auth
  router.post('/auth/send-otp', [AuthController, 'sendOtp'])
  router.post('/auth/verify-otp', [AuthController, 'verifyOtp'])
  router.post('/auth/register-provider', [AuthController, 'registerProvider'])
  router.post('/auth/provider/login', [AuthController, 'providerLogin'])
  router.post('/auth/provider/signup', [AuthController, 'providerSignup'])
  router.post('/auth/provider/reset-password', [AuthController, 'providerResetPassword'])

  // Categories & Discovery
  router.get('/categories', [CategoryController, 'index'])
  router.get('/services', [ServiceController, 'index'])
  router.get('/services/:id', [ServiceController, 'show'])

  // Packages
  router.get('/packages', [PackageController, 'index'])
  router.get('/packages/:id', [PackageController, 'show'])

  // Providers
  router.get('/providers', [ProviderController, 'index'])
  router.get('/providers/:id', [ProviderController, 'show'])
  router.get('/providers/:id/services', [ProviderController, 'getServices'])
  router.get('/providers/:id/packages', [ProviderController, 'getPackages'])
  router.get('/providers/:id/reviews', [ProviderController, 'getReviews'])

  // Labour
  router.get('/labour', [LabourController, 'index'])
  router.get('/labour/:id', [LabourController, 'show'])

  /* =========================================================================
     AUTHENTICATED COMMON ROUTES
     ========================================================================= */
  router.get('/auth/me', [AuthController, 'me']).use(auth())

  /* =========================================================================
     CUSTOMER ROUTES (Role: CUSTOMER, ADMIN)
     ========================================================================= */
  router.group(() => {
    router.post('/enquiries', [CustomerController, 'createEnquiry'])
    router.get('/customer/bookings', [CustomerController, 'getBookings'])
    router.get('/customer/enquiries', [CustomerController, 'getBookings'])
    router.get('/customer/favorites', [CustomerController, 'getFavorites'])
    router.post('/customer/favorites/toggle', [CustomerController, 'toggleFavorite'])
    router.post('/reviews', [CustomerController, 'createReview'])
  }).use(auth()).use(role(['CUSTOMER', 'ADMIN', 'PROVIDER']))

  /* =========================================================================
     PROVIDER ROUTES (Role: PROVIDER, ADMIN)
     ========================================================================= */
  router.group(() => {
    // Dashboard & Profile
    router.get('/provider/dashboard', [ProviderPortalController, 'dashboard'])
    router.get('/provider/profile', [ProviderPortalController, 'getProfile'])
    router.put('/provider/profile', [ProviderPortalController, 'updateProfile'])

    // Services
    router.get('/provider/services', [ProviderPortalController, 'getServices'])
    router.post('/provider/services', [ProviderPortalController, 'createService'])
    router.put('/provider/services/:id', [ProviderPortalController, 'updateService'])
    router.patch('/provider/services/:id/status', [ProviderPortalController, 'toggleServiceStatus'])
    router.delete('/provider/services/:id', [ProviderPortalController, 'deleteService'])

    // Packages
    router.get('/provider/packages', [ProviderPortalController, 'getPackages'])
    router.post('/provider/packages', [ProviderPortalController, 'createPackage'])
    router.put('/provider/packages/:id', [ProviderPortalController, 'updatePackage'])
    router.patch('/provider/packages/:id/status', [ProviderPortalController, 'togglePackageStatus'])
    router.delete('/provider/packages/:id', [ProviderPortalController, 'deletePackage'])

    // Labour / Event Staff
    router.get('/provider/labour', [ProviderPortalController, 'getLabourListings'])
    router.post('/provider/labour', [ProviderPortalController, 'createLabourListing'])
    router.put('/provider/labour/:id', [ProviderPortalController, 'updateLabourListing'])
    router.patch('/provider/labour/:id/status', [ProviderPortalController, 'toggleLabourListingStatus'])
    router.delete('/provider/labour/:id', [ProviderPortalController, 'deleteLabourListing'])

    // Enquiries & Bookings
    router.get('/provider/enquiries', [ProviderPortalController, 'getEnquiries'])
    router.patch('/provider/enquiries/:id/accept', [ProviderPortalController, 'acceptEnquiry'])
    router.patch('/provider/enquiries/:id/decline', [ProviderPortalController, 'declineEnquiry'])

    // Calendar Availability
    router.get('/provider/availability', [ProviderPortalController, 'getAvailability'])
    router.post('/provider/availability', [ProviderPortalController, 'setAvailability'])

    // Reviews & Performance
    router.get('/provider/reviews', [ProviderPortalController, 'getReviews'])
    router.post('/reviews/:id/reply', [ProviderPortalController, 'replyReview'])
    router.get('/provider/performance', [ProviderPortalController, 'getPerformance'])
  }).use(auth()).use(role(['PROVIDER', 'ADMIN']))

}).prefix('/api')
