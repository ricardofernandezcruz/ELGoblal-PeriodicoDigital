import { getSitemapArticles } from '@/lib/queries'
import { siteUrl } from '@/lib/site-url'

/* Mapa de Google Noticias: solo las notas de las últimas 48 horas, con el formato que pide Google. */
export const revalidate = 300

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export async function GET() {
  const base = siteUrl()
  const list = await getSitemapArticles(48).catch(() => [])
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${list
  .map(
    (a) => `  <url>
    <loc>${esc(`${base}/${a.sec}/${a.slug}`)}</loc>
    <news:news>
      <news:publication><news:name>El Global</news:name><news:language>es</news:language></news:publication>
      <news:publication_date>${new Date(a.date).toISOString()}</news:publication_date>
      <news:title>${esc(a.title)}</news:title>
    </news:news>
  </url>`,
  )
  .join('\n')}
</urlset>`
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=300' } })
}
