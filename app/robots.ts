import type { MetadataRoute } from 'next'

/** Antes del lanzamiento (sin ALLOW_INDEXING=1) se pide a los buscadores que no recorran el sitio. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.ALLOW_INDEXING !== '1') return { rules: { userAgent: '*', disallow: '/' } }
  return { rules: { userAgent: '*', allow: '/', disallow: ['/redaccion', '/api/', '/guardadas', '/boletin/'] } }
}
