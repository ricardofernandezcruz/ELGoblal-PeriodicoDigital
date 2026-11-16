import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

/* Comprobación rápida (solo mira si hay cookie de sesión).
   La verificación real del panel se hace en el servidor con requireUser().
   Las páginas del prototipo (diseño original) solo las ve la redacción. */
export default function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/redaccion/login')) return NextResponse.next()
  if (!getSessionCookie(req)) return NextResponse.redirect(new URL('/redaccion/login', req.url))
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/redaccion/:path*',
    '/guia/:path*',
    '/componentes/:path*',
    '/hoja-de-ruta/:path*',
    '/articulo/:path*',
    '/contenido/:path*',
    '/detalles/:path*',
    '/indice/:path*',
    '/movil/:path*',
  ],
}
