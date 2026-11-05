'use server'

/* Acciones del área de video: videos de la redacción y canales de redactores. */
import { and, eq, like, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { auditLog, media, videoChannels, videos } from '@/db/schema'
import { getAdminChannels, getAdminVideos, slugify } from '@/lib/newsroom'
import type { ActionResult, AdminChannel, AdminVideo } from '@/lib/newsroom-types'
import { can } from '@/lib/permissions'
import { ForbiddenError, requirePermission, type CurrentUser } from '@/lib/session'

class UserError extends Error {}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof UserError) return { ok: false, error: e.message }
    if (e instanceof z.ZodError) return { ok: false, error: 'Hay datos con un formato no válido. Revisa los campos y vuelve a intentarlo.' }
    console.error('[video]', e)
    return { ok: false, error: 'No se pudo completar la acción. Inténtalo de nuevo en un momento.' }
  }
}

const audit = (u: CurrentUser, action: string, entityId: string | null, data?: unknown) =>
  db.insert(auditLog).values({ userId: u.id, action, entity: 'video', entityId, data: data ?? null })

const refresh = () => revalidatePath('/', 'layout')

/** ID de un video a partir de cualquier enlace de YouTube (watch, youtu.be, shorts, live, embed). */
function youtubeId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  try {
    const u = new URL(s)
    const h = u.hostname.replace(/^(www|m|music)\./, '')
    if (h === 'youtu.be') return u.pathname.slice(1, 12) || null
    if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
      const id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})/)?.[1]
      return id && /^[\w-]{11}$/.test(id) ? id : null
    }
  } catch {}
  return null
}

/* ---------- Videos de la redacción ---------- */

const videoSchema = z.object({
  id: z.uuid().nullable(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).default(''),
  sectionId: z.uuid().nullable(),
  authorId: z.uuid().nullable(),
  source: z.enum(['file', 'youtube']),
  fileUrl: z.string().max(500).nullable().optional(),
  youtubeUrl: z.string().max(300).nullable().optional(),
  vertical: z.boolean(),
  posterId: z.uuid().nullable(),
  featured: z.boolean(),
})

async function uniqueVideoSlug(title: string, selfId: string | null) {
  // 'canal' está reservado para las páginas de canales (/video/canal/…)
  const root = slugify(title).replace(/^canal$/, 'canal-video') || 'video'
  const taken = new Set(
    (await db.select({ slug: videos.slug }).from(videos).where(selfId ? and(like(videos.slug, root + '%'), ne(videos.id, selfId)) : like(videos.slug, root + '%'))).map((r) => r.slug),
  )
  if (!taken.has(root)) return root
  for (let i = 2; ; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`
}

/** Solo se aceptan archivos subidos a nuestro almacenamiento (R2 o, en local, /uploads). */
function allowedFileUrl(url: string) {
  const r2 = process.env.R2_PUBLIC_URL?.replace(/\/$/, '')
  return (r2 && url.startsWith(r2 + '/videos/')) || (process.env.NODE_ENV !== 'production' && url.startsWith('/uploads/videos/'))
}

export async function saveVideo(input: z.input<typeof videoSchema>): Promise<ActionResult<AdminVideo>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    const d = videoSchema.parse(input)
    let fileUrl: string | null = null
    let yt: string | null = null
    if (d.source === 'youtube') {
      yt = youtubeId(d.youtubeUrl ?? '')
      if (!yt) throw new UserError('Ese enlace de YouTube no es válido. Copia la dirección del video desde el navegador o el botón Compartir.')
    } else {
      if (!d.fileUrl || !allowedFileUrl(d.fileUrl)) throw new UserError('Sube primero el archivo de video.')
      fileUrl = d.fileUrl
    }
    if (d.posterId) {
      const [m] = await db.select({ id: media.id }).from(media).where(eq(media.id, d.posterId))
      if (!m) throw new UserError('La imagen de portada ya no está en la biblioteca.')
    }
    const existing = d.id ? (await db.select().from(videos).where(eq(videos.id, d.id)))[0] : null
    if (d.id && !existing) throw new UserError('Ese video ya no existe.')
    if (existing?.status === 'published' && !can(u.role, 'article.publish')) throw new UserError('Este video ya está publicado. Solo un editor puede cambiarlo.')
    if (d.featured && !can(u.role, 'article.publish')) throw new UserError('Solo un editor puede destacar un video.')

    const values = {
      title: d.title,
      description: d.description,
      sectionId: d.sectionId,
      authorId: d.authorId,
      fileUrl,
      youtubeId: yt,
      vertical: d.vertical,
      posterId: d.posterId,
      featured: d.featured,
      slug: await uniqueVideoSlug(d.title, d.id),
    }
    // Solo puede haber un video destacado.
    if (d.featured) await db.update(videos).set({ featured: false }).where(eq(videos.featured, true))
    const [row] = existing
      ? await db.update(videos).set(values).where(eq(videos.id, existing.id)).returning()
      : await db.insert(videos).values({ ...values, createdBy: u.id }).returning()
    await audit(u, existing ? 'video.update' : 'video.create', row.id, { title: d.title })
    if (row.status === 'published') refresh()
    return (await getAdminVideos([row.id]))[0]
  })
}

export async function setVideoStatus(id: string, publish: boolean): Promise<ActionResult<AdminVideo>> {
  return run(async () => {
    const u = await requirePermission('article.publish')
    const vid = z.uuid().parse(id)
    const [v] = await db.select().from(videos).where(eq(videos.id, vid))
    if (!v) throw new UserError('Ese video ya no existe.')
    await db
      .update(videos)
      .set({ status: publish ? 'published' : 'draft', publishedAt: publish ? (v.publishedAt ?? new Date()) : v.publishedAt })
      .where(eq(videos.id, vid))
    await audit(u, publish ? 'video.publish' : 'video.unpublish', vid)
    refresh()
    return (await getAdminVideos([vid]))[0]
  })
}

/** Manda el video a la papelera: sale del sitio al momento y el cron borra su archivo a los 30 días. */
export async function deleteVideo(id: string): Promise<ActionResult<AdminVideo>> {
  return run(async () => {
    const u = await requirePermission('article.publish')
    const vid = z.uuid().parse(id)
    const [v] = await db
      .update(videos)
      .set({ deletedAt: new Date(), status: 'draft', featured: false })
      .where(eq(videos.id, vid))
      .returning({ title: videos.title })
    if (!v) throw new UserError('Ese video ya no existe.')
    await audit(u, 'video.trash', vid, { title: v.title })
    refresh()
    return (await getAdminVideos([vid]))[0]
  })
}

/** Saca el video de la papelera; vuelve como borrador. */
export async function restoreVideo(id: string): Promise<ActionResult<AdminVideo>> {
  return run(async () => {
    const u = await requirePermission('article.publish')
    const vid = z.uuid().parse(id)
    await db.update(videos).set({ deletedAt: null }).where(eq(videos.id, vid))
    await audit(u, 'video.restore', vid)
    return (await getAdminVideos([vid]))[0]
  })
}

/* ---------- Canales de redactores ---------- */

/** Obtiene el id de canal (UC…) desde un enlace del canal, un @usuario o el propio id. */
async function resolveChannel(input: string): Promise<string> {
  const s = input.trim()
  const direct = s.match(/(UC[\w-]{22})/)?.[1]
  if (direct) return direct
  const handle = s.match(/@([\w.-]{3,100})/)?.[1]
  if (!handle) throw new UserError('Pega el enlace del canal de YouTube, por ejemplo https://www.youtube.com/@nombre')
  const res = await fetch(`https://www.youtube.com/@${encodeURIComponent(handle)}`, { headers: { 'Accept-Language': 'es' }, cache: 'no-store' })
  const id = res.ok ? (await res.text()).match(/"externalId":"(UC[\w-]{22})"/)?.[1] : null
  if (!id) throw new UserError('No encontramos ese canal en YouTube. Revisa el enlace.')
  return id
}

const spotifyShow = (input: string | null | undefined) => {
  if (!input?.trim()) return null
  const id = input.match(/show\/([A-Za-z0-9]{22})/)?.[1] ?? (/^[A-Za-z0-9]{22}$/.test(input.trim()) ? input.trim() : null)
  if (!id) throw new UserError('Ese enlace de Spotify no es de un pódcast. Copia el enlace del programa (open.spotify.com/show/…).')
  return id
}

const channelSchema = z.object({
  id: z.uuid().nullable(),
  label: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(80),
  youtube: z.string().trim().min(3).max(300),
  spotify: z.string().trim().max(300).nullable().optional(),
  authorId: z.uuid().nullable(),
})

export async function saveChannel(input: z.input<typeof channelSchema>): Promise<ActionResult<AdminChannel[]>> {
  return run(async () => {
    const u = await requirePermission('home.manage')
    const d = channelSchema.parse(input)
    const channelId = await resolveChannel(d.youtube)
    const url = d.youtube.startsWith('http') ? d.youtube : `https://www.youtube.com/channel/${channelId}`
    const values = { label: d.label, name: d.name, youtubeChannelId: channelId, url, spotifyShowId: spotifyShow(d.spotify), authorId: d.authorId }
    if (d.id) await db.update(videoChannels).set(values).where(eq(videoChannels.id, d.id))
    else {
      const all = await db.select({ slug: videoChannels.slug }).from(videoChannels)
      const root = slugify(d.label) || 'canal'
      let slug = root
      for (let i = 2; all.some((c) => c.slug === slug); i++) slug = `${root}-${i}`
      await db.insert(videoChannels).values({ ...values, slug, position: all.length })
    }
    await audit(u, 'channel.save', d.id, { label: d.label, channelId })
    refresh()
    return getAdminChannels()
  })
}

export async function updateChannels(items: { id: string; active: boolean }[]): Promise<ActionResult<AdminChannel[]>> {
  return run(async () => {
    const u = await requirePermission('home.manage')
    const list = z.array(z.object({ id: z.uuid(), active: z.boolean() })).max(50).parse(items)
    for (const [i, c] of list.entries()) await db.update(videoChannels).set({ position: i, active: c.active }).where(eq(videoChannels.id, c.id))
    await audit(u, 'channel.order', null, list)
    refresh()
    return getAdminChannels()
  })
}

export async function deleteChannel(id: string): Promise<ActionResult<AdminChannel[]>> {
  return run(async () => {
    const u = await requirePermission('home.manage')
    await db.delete(videoChannels).where(eq(videoChannels.id, z.uuid().parse(id)))
    await audit(u, 'channel.delete', id)
    refresh()
    return getAdminChannels()
  })
}
