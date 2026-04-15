import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/lobby', '/roulette', '/blackjack', '/dashboard']

const COUNTRY_LOCALE: Record<string, string> = {
  BR: 'pt', PT: 'pt',
  RU: 'ru', UA: 'ru', BY: 'ru', KZ: 'ru',
  CN: 'zh', TW: 'zh', HK: 'zh', SG: 'zh', MO: 'zh',
  AR: 'es', UY: 'es', MX: 'es', CL: 'es', CO: 'es', PE: 'es', VE: 'es', ES: 'es',
}

const COUNTRY_MODE: Record<string, string> = {
  // real money allowed
  UY: 'real', AR: 'real', BR: 'real', MX: 'real', CL: 'real',
  RU: 'real', UA: 'real', BY: 'real', KZ: 'real',
  CN: 'real', HK: 'real', SG: 'real',
  GB: 'real', DE: 'real', FR: 'real', IT: 'real', ES: 'real',
  // demo only
  US: 'demo', AU: 'demo', CA: 'demo',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next({ request })

  // --- GEO DETECTION ---
  const country = request.headers.get('x-vercel-ip-country') ?? 'US'

  // Only set if not already set by user preference
  if (!request.cookies.get('hwa_locale')) {
    const locale = COUNTRY_LOCALE[country] ?? 'en'
    response.cookies.set('hwa_locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 30 })
  }

  if (!request.cookies.get('hwa_mode')) {
    const mode = COUNTRY_MODE[country] ?? 'real'
    response.cookies.set('hwa_mode', mode, { path: '/', maxAge: 60 * 60 * 24 * 30 })
  }

  response.cookies.set('hwa_country', country, { path: '/', maxAge: 60 * 60 * 24 })

  // --- AUTH PROTECTION ---
  const isProtected = PROTECTED.some(route => pathname.startsWith(route))
    // Admin subdomain redirect
  const host = request.headers.get('host') ?? ''
  if (host.startsWith('admin.')) {
    if (pathname === '/' || pathname === '') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  if (!isProtected) return response

  let authResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          authResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => authResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/', request.url))

  // Copy geo cookies to auth response
  authResponse.cookies.set('hwa_locale', request.cookies.get('hwa_locale')?.value ?? COUNTRY_LOCALE[country] ?? 'en', { path: '/' })
  authResponse.cookies.set('hwa_mode', request.cookies.get('hwa_mode')?.value ?? COUNTRY_MODE[country] ?? 'real', { path: '/' })
  authResponse.cookies.set('hwa_country', country, { path: '/' })

  return authResponse
}

export const config = {
  matcher: [
    '/lobby/:path*',
    '/roulette/:path*',
    '/blackjack/:path*',
    '/dashboard/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|logo|icons|manifest|service-worker).*)',
  ],
}




