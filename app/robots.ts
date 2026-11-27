import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

const PRIVATE = ['/redaccion', '/api/', '/guardadas', '/boletin/']

/* Robots que solo leen una nota para armar su vista previa (imagen, título y resumen) al
   compartirla en redes o mensajería. No indexan nada, así que pasan también antes del lanzamiento. */
const PREVIEW_BOTS = ['Twitterbot', 'facebookexternalhit', 'Facebot', 'WhatsApp', 'TelegramBot', 'LinkedInBot', 'Slackbot', 'Discordbot']

/** Antes del lanzamiento (sin ALLOW_INDEXING=1) se pide a los buscadores que no recorran el sitio. */
export default function robots(): MetadataRoute.Robots {
  const previews = { userAgent: PREVIEW_BOTS, allow: '/', disallow: PRIVATE }
  if (process.env.ALLOW_INDEXING !== '1') return { rules: [previews, { userAgent: '*', disallow: '/' }] }
  return {
    rules: { userAgent: '*', allow: '/', disallow: PRIVATE },
    sitemap: [`${siteUrl()}/sitemap.xml`, `${siteUrl()}/news-sitemap.xml`],
  }
}
