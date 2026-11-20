import type { MetadataRoute } from 'next'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { videos } from '@/db/schema'
import { getMenu, getSitemapArticles } from '@/lib/queries'
import { siteUrl } from '@/lib/site-url'

/** Mapa del sitio para los buscadores: portada, secciones, notas, videos y páginas fijas. */
export const revalidate = 900

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const [menu, list, vids] = await Promise.all([
    getMenu(),
    getSitemapArticles(),
    db.select({ slug: videos.slug, at: videos.updatedAt }).from(videos).where(and(eq(videos.status, 'published'), isNull(videos.deletedAt))).orderBy(desc(videos.publishedAt)).limit(2000),
  ])
  const now = new Date()
  return [
    { url: base + '/', lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: base + '/video', lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
    ...menu.map((m) => ({ url: `${base}/${m.slug}`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.8 })),
    ...list.map((a) => ({ url: `${base}/${a.sec}/${a.slug}`, lastModified: a.updated, priority: 0.6 })),
    ...vids.map((v) => ({ url: `${base}/video/${v.slug}`, lastModified: v.at, priority: 0.5 })),
    ...['quienes-somos', 'contacto', 'privacidad', 'terminos', 'normas-de-comentarios', 'correcciones'].map((p) => ({ url: `${base}/${p}`, priority: 0.2 })),
  ]
}
