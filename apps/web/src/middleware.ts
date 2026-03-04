import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http'
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }
  const host = request.headers.get('host')
  if (host) {
    return `${request.nextUrl.protocol}//${host}`
  }
  return request.nextUrl.origin
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const baseUrl = getBaseUrl(request)

  // Public routes that don't require authentication
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/auth/callback')

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (user && isPublicRoute && !pathname.startsWith('/auth/callback')) {
    return NextResponse.redirect(new URL('/dashboard', baseUrl))
  }

  // Unauthenticated user on ANY non-public route -> redirect to login with returnTo
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', baseUrl)
    loginUrl.searchParams.set('returnTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, svg, png, jpg, jpeg, gif, webp (image files)
     */
    // eslint-disable-next-line no-useless-escape
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
