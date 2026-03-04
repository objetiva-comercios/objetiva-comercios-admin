import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const baseUrl = getBaseUrl(request)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error.message)
      return NextResponse.redirect(new URL('/login?error=auth_callback_error', baseUrl))
    }
  }

  return NextResponse.redirect(new URL(next, baseUrl))
}
