import 'server-only'
import { and, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { authors, media, user, videos } from '@/db/schema'
import type { MediaUse } from './newsroom-types'

/** Dónde se usa cada imagen de la biblioteca: notas (portada y bloques), portadas de video y fotos de firma.
    Con `only`, solo esas imágenes. */
export async function mediaUsage(only?: string[]): Promise<Map<string, MediaUse[]>> {
  const out = new Map<string, MediaUse[]>()
  if (only && !only.length) return out
  const lib = await db
    .select({ id: media.id, key: media.key })
    .from(media)
    .where(only ? inArray(media.id, only) : undefined)
  const ids = new Set(lib.map((m) => m.id))
  const byKey = new Map(lib.map((m) => [m.key, m.id]))
  const add = (mid: string | null | undefined, use: MediaUse) => {
    if (!mid || !ids.has(mid)) return
    const list = out.get(mid) ?? []
    if (!list.some((x) => x.k === use.k && x.id === use.id)) list.push(use)
    out.set(mid, list)
  }

  // Notas: la imagen de portada y cada bloque de imagen (por id o, en bloques antiguos, por URL).
  const { rows } = await db.execute<{ id: string; title: string; status: string; mid: string | null; src: string | null }>(sql`
    select a.id, a.title, a.status, x.mid, x.src
    from articles a
    cross join lateral (
      select a.hero_id::text as mid, null::text as src
      union all
      select b->>'mediaId', b->>'src' from jsonb_array_elements(a.blocks) b where b->>'t' = 'img'
    ) x
    where x.mid is not null or x.src is not null`)
  for (const r of rows) {
    const use: MediaUse = { k: 'art', id: r.id, t: r.title || 'Nota sin titular', live: r.status === 'published' || r.status === 'scheduled' }
    add(r.mid && ids.has(r.mid) ? r.mid : byKey.get(r.src ?? ''), use)
  }

  const [vids, aus, users] = await Promise.all([
    db
      .select({ id: videos.id, t: videos.title, status: videos.status, mid: videos.posterId })
      .from(videos)
      .where(and(isNotNull(videos.posterId), isNull(videos.deletedAt))),
    db.select({ id: authors.id, t: authors.name, mid: authors.avatarId }).from(authors).where(isNotNull(authors.avatarId)),
    db.select({ id: user.id, t: user.name, key: user.image }).from(user).where(isNotNull(user.image)),
  ])
  for (const v of vids) add(v.mid, { k: 'vid', id: v.id, t: v.t, live: v.status === 'published' })
  for (const a of aus) add(a.mid, { k: 'au', id: a.id, t: a.t, live: true })
  for (const p of users) add(byKey.get(p.key ?? ''), { k: 'au', id: p.id, t: p.t, live: true })
  return out
}

/** Ids de imágenes que no se pueden publicar: en la papelera o ya borradas. */
export async function unavailableMedia(mediaIds: (string | null | undefined)[]): Promise<Set<string>> {
  const want = [...new Set(mediaIds.filter((x): x is string => !!x))]
  if (!want.length) return new Set()
  const ok = await db
    .select({ id: media.id })
    .from(media)
    .where(and(inArray(media.id, want), isNull(media.deletedAt)))
  const okIds = new Set(ok.map((m) => m.id))
  return new Set(want.filter((id) => !okIds.has(id)))
}

