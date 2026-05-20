import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/api/xero/connect(.*)',
  '/api/xero/callback(.*)',
  '/api/sage/connect(.*)',
  '/api/sage/callback(.*)',
])

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth.protect()
  }
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
