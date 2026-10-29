import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

/* Comprobación rápida (solo mira si hay cookie de sesión).
   La verificación real se hace en el servidor con requireUser(). */
export default function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/redaccion/login')) return NextResponse.next()
  if (!getSessionCookie(req)) return NextResponse.redirect(new URL('/redaccion/login', req.url))
  return NextResponse.next()
}

export const config = { matcher: ['/redaccion/:path*'] }
