import 'server-only'
import { and, asc, desc, eq, ne, sql } from 'drizzle-orm'
import { db } from '@/db'
import { authors, media, sections, videoChannels, videos } from '@/db/schema'

/* Área de video: videos propios de la redacción (base de datos) y canales de
   YouTube de redactores (feeds públicos, sin claves de API). */

/** Un video de cualquier origen, listo para mostrarse. */
export type Clip = {
  key: string
  kind: 'newsroom' | 'channel'
  title: string
  description: string
  published: string
  /** Página propia (solo videos de la redacción). */
  href: string | null
  youtubeId: string | null
  fileUrl: string | null
  poster: string | null
  vertical: boolean
  views: number
  /** Etiqueta de origen: sección o canal. */
  label: string
  by: string | null
}

export type ChannelFeed = {
  slug: string
  label: string
  name: string
  url: string
  spotifyShowId: string | null
  by: string | null
  byImage: string | null
  latest: Clip[]
  lives: Clip[]
  shorts: Clip[]
}

/* ---------- Videos de la redacción ---------- */

const poster = sql<string | null>`(select ${media.key} from ${media} where ${media.id} = ${videos.posterId})`
const avatar = sql<string | null>`(select ${media.key} from ${media} where ${media.id} = ${authors.avatarId})`

const newsroomCols = {
  id: videos.id,
  slug: videos.slug,
  title: videos.title,
  description: videos.description,
  publishedAt: videos.publishedAt,
  youtubeId: videos.youtubeId,
  fileUrl: videos.fileUrl,
  vertical: videos.vertical,
  views: videos.views,
  featured: videos.featured,
  poster,
  sec: sections.name,
  secSlug: sections.slug,
  au: authors.name,
}

type NewsroomRow = {
  id: string
  slug: string
  title: string
  description: string
  publishedAt: Date | null
  youtubeId: string | null
  fileUrl: string | null
  vertical: boolean
  views: number
  featured: boolean
  poster: string | null
  sec: string | null
  secSlug: string | null
  au: string | null
}

const toClip = (r: NewsroomRow): Clip & { featured: boolean; secSlug: string | null } => ({
  key: r.id,
  kind: 'newsroom',
  title: r.title,
  description: r.description,
  published: (r.publishedAt ?? new Date()).toISOString(),
  href: `/video/${r.slug}`,
  youtubeId: r.youtubeId,
  fileUrl: r.fileUrl,
  poster: r.poster ?? (r.youtubeId ? ytThumb(r.youtubeId) : null),
  vertical: r.vertical,
  views: r.views,
  label: r.sec ?? 'Video',
  by: r.au,
  featured: r.featured,
  secSlug: r.secSlug,
})

const newsroomQuery = () =>
  db
    .select(newsroomCols)
    .from(videos)
    .leftJoin(sections, eq(videos.sectionId, sections.id))
    .leftJoin(authors, eq(videos.authorId, authors.id))

export async function getNewsroomVideos(limit = 40) {
  const rows = await newsroomQuery().where(eq(videos.status, 'published')).orderBy(desc(videos.publishedAt)).limit(limit)
  return rows.map(toClip)
}

export async function getNewsroomVideo(slug: string) {
  const [row] = await newsroomQuery().where(and(eq(videos.slug, slug), eq(videos.status, 'published')))
  if (!row) return null
  const more = await newsroomQuery()
    .where(and(eq(videos.status, 'published'), ne(videos.id, row.id)))
    .orderBy(desc(videos.publishedAt))
    .limit(8)
  return { video: toClip(row), more: more.map(toClip) }
}

/* ---------- Canales de redactores (YouTube) ---------- */

/** Cada cuánto se vuelven a leer los canales (segundos). */
const REFRESH = 15 * 60

export const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

/** Quita las etiquetas (#podcast…) del final de los títulos de YouTube. */
const cleanTitle = (t: string) => t.replace(/\s*#\S+/g, '').trim() || t

async function feed(playlistId: string, label: string, by: string | null, vertical = false): Promise<Clip[]> {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`, { next: { revalidate: REFRESH, tags: ['videos'] } })
    if (!res.ok) return []
    const xml = await res.text()
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].flatMap(([, e]) => {
      const id = e.match(/<yt:videoId>([\w-]{6,20})<\/yt:videoId>/)?.[1]
      if (!id) return []
      return [
        {
          key: 'yt:' + id,
          kind: 'channel' as const,
          title: cleanTitle(decode(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '')),
          description: decode(e.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] ?? '').slice(0, 280),
          published: e.match(/<published>(.*?)<\/published>/)?.[1] ?? new Date().toISOString(),
          href: null,
          youtubeId: id,
          fileUrl: null,
          poster: ytThumb(id),
          vertical,
          views: Number(e.match(/<media:statistics views="(\d+)"/)?.[1] ?? 0),
          label,
          by,
        },
      ]
    })
  } catch {
    // Si YouTube no responde, ese canal simplemente no se muestra.
    return []
  }
}

export async function getChannelFeeds(only?: string): Promise<ChannelFeed[]> {
  const rows = await db
    .select({ c: videoChannels, by: authors.name, byImage: avatar })
    .from(videoChannels)
    .leftJoin(authors, eq(videoChannels.authorId, authors.id))
    .where(only ? and(eq(videoChannels.active, true), eq(videoChannels.slug, only)) : eq(videoChannels.active, true))
    .orderBy(asc(videoChannels.position))
  return Promise.all(
    rows.map(async ({ c, by, byImage }) => {
      const base = c.youtubeChannelId.slice(2)
      const [latest, lives, shorts] = await Promise.all([
        feed('UULF' + base, c.label, by),
        feed('UULV' + base, c.label, by),
        feed('UUSH' + base, c.label, by, true),
      ])
      return { slug: c.slug, label: c.label, name: c.name, url: c.url, spotifyShowId: c.spotifyShowId, by, byImage, latest, lives, shorts }
    }),
  )
}

/* ---------- Composición de la portada de video ---------- */

/** Mezcla los videos de la redacción con lo último de cada canal (por fecha). */
export async function getVideoHub() {
  const [own, channels] = await Promise.all([getNewsroomVideos(), getChannelFeeds()])
  const channelLatest = channels.flatMap((c) => c.latest.slice(0, 3))
  const featured = own.find((v) => v.featured) ?? own[0] ?? channelLatest.sort((a, b) => +new Date(b.published) - +new Date(a.published))[0] ?? null
  const latest = [...own, ...channelLatest]
    .filter((v) => v.key !== featured?.key)
    .sort((a, b) => +new Date(b.published) - +new Date(a.published))
  // Filas por categoría, solo con videos de la redacción.
  const bySection = new Map<string, { label: string; slug: string | null; items: Clip[] }>()
  for (const v of own) {
    const k = v.secSlug ?? 'video'
    if (!bySection.has(k)) bySection.set(k, { label: v.label, slug: v.secSlug, items: [] })
    bySection.get(k)!.items.push(v)
  }
  return { featured, latest, own, sections: [...bySection.values()], channels }
}
