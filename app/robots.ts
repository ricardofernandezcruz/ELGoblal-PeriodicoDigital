import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

/** Antes del lanzamiento (sin ALLOW_INDEXING=1) se pide a los buscadores que no recorran el sitio. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.ALLOW_INDEXING !== '1') return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/redaccion', '/api/', '/guardadas', '/boletin/'] },
    sitemap: [`${siteUrl()}/sitemap.xml`, `${siteUrl()}/news-sitemap.xml`],
  }
}
