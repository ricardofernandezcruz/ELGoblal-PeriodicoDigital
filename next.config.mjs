/** Mientras el sitio no tenga su dominio definitivo, se pide a los buscadores que no lo indexen.
    Para el lanzamiento: ALLOW_INDEXING=1 en Vercel (y volver a desplegar). */
const indexable = process.env.ALLOW_INDEXING === '1'

/* Cabeceras de seguridad para todas las páginas.
   - frame-ancestors / X-Frame-Options: nadie puede meter el sitio (ni el panel) dentro de un marco ajeno.
   - form-action, base-uri, object-src: cierran trucos habituales de inyección sin limitar los videos ni las imágenes. */
const security = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()' },
  ...(indexable ? [] : [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      { source: '/:path*', headers: security },
      // El panel nunca se guarda en cachés intermedias.
      { source: '/redaccion/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      // El service worker se revisa en cada visita para que los cambios lleguen enseguida.
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Content-Type', value: 'application/javascript; charset=utf-8' }] },
    ]
  },
}

export default nextConfig
