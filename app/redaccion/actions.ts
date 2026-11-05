'use server'

/* Acciones del panel de redacción. Cada una valida la entrada y comprueba el permiso
   antes de tocar la base de datos. */
import { hashPassword } from 'better-auth/crypto'
import { and, desc, eq, inArray, isNotNull, isNull, like, ne, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { ROLES } from '@/db/auth-schema'
import { account, articles, articleVersions, auditLog, authors, comments, media, sections, liveUpdates, session, settings, subscribers, twoFactor, user, videos, type ArticleBlock } from '@/db/schema'
import { EmailError, emailReady, sendEmail } from '@/lib/email'
import { imageKey, MAX_IMAGE, sniffImage } from '@/lib/image'
import { buildDigest, digestEmail } from '@/lib/newsletter'
import { mediaUsage, unavailableMedia } from '@/lib/media-usage'
import { getEditorPayload, getNews, slugify, toMedia } from '@/lib/newsroom'
import { pushCount, PushError, pushReady, sendPush } from '@/lib/push'
import { fetchRemoteImage, RemoteImageError } from '@/lib/remote-image'
import { deleteObject, putObject, StorageError } from '@/lib/storage'
import { DB_STATUS, type ActionResult, type AdminMedia, type AdminNews, type AdminUser, type AdminVersion, type Block, type EditorPayload, type MediaUse, type Status } from '@/lib/newsroom-types'
import { can, canEditArticle } from '@/lib/permissions'
import { ForbiddenError, getUser, requirePermission, type CurrentUser } from '@/lib/session'

class UserError extends Error {}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof UserError) return { ok: false, error: e.message }
    if (e instanceof z.ZodError) return { ok: false, error: 'Hay datos con un formato no válido. Revisa los campos y vuelve a intentarlo.' }
    console.error('[redaccion]', e)
    return { ok: false, error: 'No se pudo completar la acción. Inténtalo de nuevo en un momento.' }
  }
}

const audit = (u: CurrentUser, action: string, entity: string, entityId: string | null, data?: unknown) =>
  db.insert(auditLog).values({ userId: u.id, action, entity, entityId, data: data ?? null })

/** El sitio público se regenera al cambiar contenido publicado. */
const refreshSite = () => revalidatePath('/', 'layout')

/* ---------- Notas ---------- */

const str = (max: number) => z.string().max(max).default('')
const blockSchema = z.object({
  id: z.string().max(40),
  t: z.enum(['p', 'sub', 'img', 'quote', 'video', 'data', 'sum', 'poll']),
  v: str(20000).optional(),
  who: str(200).optional(),
  mediaId: z.uuid().nullable().optional(),
  alt: str(400).optional(),
  cap: str(400).optional(),
  u: str(500).optional(),
  vert: z.boolean().optional(),
  n: str(40).optional(),
  l: str(300).optional(),
  q: str(200).optional(),
  opts: z.array(z.string().max(80)).max(6).optional(),
})

const saveSchema = z.object({
  id: z.uuid().nullable(),
  title: str(200),
  lead: str(600),
  sectionId: z.uuid(),
  authorId: z.uuid().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  slug: str(80),
  seo: str(300),
  blocks: z.array(blockSchema).max(300),
  com: z.boolean(),
  news: z.boolean(),
  flash: z.boolean(),
  live: z.boolean().default(false),
  manual: z.boolean().default(false),
})

/** Convierte los bloques del editor al formato guardado; las imágenes se resuelven contra la biblioteca. */
async function toStoredBlocks(blocks: z.infer<typeof blockSchema>[]): Promise<ArticleBlock[]> {
  const ids = blocks.filter((b) => b.t === 'img' && b.mediaId).map((b) => b.mediaId!)
  const found = ids.length ? await db.select({ id: media.id, key: media.key }).from(media).where(inArray(media.id, ids)) : []
  const src = new Map(found.map((m) => [m.id, m.key]))
  const out: ArticleBlock[] = []
  for (const b of blocks) {
    switch (b.t) {
      case 'p':
      case 'sub':
      case 'sum':
        out.push({ id: b.id, t: b.t, v: b.v ?? '' })
        break
      case 'img':
        out.push({ id: b.id, t: 'img', mediaId: b.mediaId && src.has(b.mediaId) ? b.mediaId : null, src: (b.mediaId && src.get(b.mediaId)) || '', alt: b.alt ?? '', cap: b.cap ?? '' })
        break
      case 'quote':
        out.push({ id: b.id, t: 'quote', v: b.v ?? '', who: b.who ?? '' })
        break
      case 'video':
        out.push({ id: b.id, t: 'video', u: b.u ?? '', vert: !!b.vert, cap: b.cap ?? '' })
        break
      case 'data':
        out.push({ id: b.id, t: 'data', n: b.n ?? '', l: b.l ?? '' })
        break
      case 'poll':
        out.push({ id: b.id, t: 'poll', q: b.q ?? '', opts: (b.opts ?? []).map((o) => o.trim()) })
        break
    }
  }
  return out
}

async function uniqueSlug(base: string, sectionId: string, selfId: string | null) {
  const root = slugify(base) || 'nota'
  const taken = new Set(
    (
      await db
        .select({ slug: articles.slug })
        .from(articles)
        .where(and(eq(articles.sectionId, sectionId), like(articles.slug, root + '%'), selfId ? ne(articles.id, selfId) : sql`true`))
    ).map((r) => r.slug),
  )
  if (!taken.has(root)) return root
  for (let i = 2; ; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`
}

async function loadForEdit(u: CurrentUser, id: string) {
  const [a] = await db.select().from(articles).where(eq(articles.id, id))
  if (!a) throw new UserError('Esta nota ya no existe. Puede que otra persona la haya eliminado.')
  if (!canEditArticle(u, a)) throw new ForbiddenError()
  return a
}

export async function loadArticle(id: string): Promise<ActionResult<EditorPayload>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    await loadForEdit(u, z.uuid().parse(id))
    return (await getEditorPayload(id))!
  })
}

/** Una nota no se publica con imágenes que están en la papelera o ya se borraron. */
async function hasMissingImages(a: { heroId: string | null; blocks: ArticleBlock[] }) {
  return (await unavailableMedia([a.heroId, ...a.blocks.map((b) => (b.t === 'img' ? b.mediaId : null))])).size > 0
}
const MISSING_IMAGE = 'La nota usa una imagen que se borró de la biblioteca. Elige otra (aparece marcada en el editor) antes de publicar.'

export async function saveArticle(
  input: z.input<typeof saveSchema>,
): Promise<ActionResult<{ id: string; slug: string; savedAt: string; version: AdminVersion | null; news: AdminNews }>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    const d = saveSchema.parse(input)
    const existing = d.id ? await loadForEdit(u, d.id) : null
    if (existing && existing.status !== 'draft' && existing.status !== 'review' && !can(u.role, 'article.publish'))
      throw new UserError('Esta nota ya está publicada o programada. Solo un editor puede cambiarla.')

    const blocks = await toStoredBlocks(d.blocks)
    const hero = blocks.find((b): b is Extract<ArticleBlock, { t: 'img' }> => b.t === 'img' && !!b.mediaId)
    if ((existing?.status === 'published' || existing?.status === 'scheduled') && (await hasMissingImages({ heroId: hero?.mediaId ?? null, blocks })))
      throw new UserError(MISSING_IMAGE)
    const slug = await uniqueSlug(d.slug || d.title, d.sectionId, d.id)
    const values = {
      title: d.title,
      lead: d.lead,
      sectionId: d.sectionId,
      authorId: d.authorId,
      heroId: hero?.mediaId ?? null,
      blocks,
      tags: [...new Set(d.tags.map((t) => t.toLowerCase()))],
      slug,
      seoDescription: d.seo,
      allowComments: d.com,
      inNewsletter: d.news,
      breaking: d.flash,
      live: d.live,
      updatedBy: u.id,
    }
    const [row] = existing
      ? await db.update(articles).set(values).where(eq(articles.id, existing.id)).returning()
      : await db.insert(articles).values({ ...values, createdBy: u.id }).returning()

    // Versión: solo si el contenido cambió desde la última, o si se guardó a mano.
    const snapshot = { title: d.title, lead: d.lead, blocks, tags: values.tags }
    const [last] = await db
      .select({ snapshot: articleVersions.snapshot })
      .from(articleVersions)
      .where(eq(articleVersions.articleId, row.id))
      .orderBy(desc(articleVersions.createdAt))
      .limit(1)
    let version: AdminVersion | null = null
    if (d.manual || !last || JSON.stringify(last.snapshot) !== JSON.stringify(snapshot)) {
      const [v] = await db.insert(articleVersions).values({ articleId: row.id, snapshot, manual: d.manual, createdBy: u.id }).returning()
      version = { id: v.id, at: v.createdAt.toISOString(), manual: v.manual, title: d.title, blocks: blocks.length }
    }
    if (row.status === 'published') refreshSite()
    const [news] = await getNews([row.id])
    return { id: row.id, slug: row.slug, savedAt: row.updatedAt.toISOString(), version, news }
  })
}

const statusSchema = z.object({
  id: z.uuid(),
  mode: z.enum(['pub', 'sch', 'rev', 'draft']),
  when: z.iso.datetime({ offset: true }).nullable().optional(),
})

export async function setArticleStatus(input: z.input<typeof statusSchema>): Promise<ActionResult<AdminNews>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    const d = statusSchema.parse(input)
    const a = await loadForEdit(u, d.id)
    const publishing = d.mode === 'pub' || d.mode === 'sch'
    const live = a.status === 'published' || a.status === 'scheduled'
    if ((publishing || live) && !can(u.role, 'article.publish')) throw new ForbiddenError()
    if (publishing && !a.title.trim()) throw new UserError('Escribe un titular antes de publicar.')
    if (publishing && (await hasMissingImages(a))) throw new UserError(MISSING_IMAGE)
    let publishAt: Date | null = null
    if (d.mode === 'sch') {
      publishAt = d.when ? new Date(d.when) : null
      if (!publishAt || publishAt <= new Date()) throw new UserError('Elige una fecha futura para programar la nota.')
    }
    await db
      .update(articles)
      .set({
        status: DB_STATUS[d.mode as Status],
        publishAt,
        publishedAt: d.mode === 'pub' ? (a.status === 'published' && a.publishedAt ? a.publishedAt : new Date()) : d.mode === 'sch' ? null : a.publishedAt,
        updatedBy: u.id,
      })
      .where(eq(articles.id, a.id))
    await audit(u, 'article.status', 'article', a.id, { from: a.status, to: DB_STATUS[d.mode as Status], publishAt })
    if (publishing || live) refreshSite()
    return (await getNews([a.id]))[0]
  })
}

export async function bulkSetStatus(ids: string[], mode: 'pub' | 'draft'): Promise<ActionResult<AdminNews[]>> {
  return run(async () => {
    const u = await requirePermission('article.publish')
    const list = z.array(z.uuid()).max(200).parse(ids)
    for (const id of list) {
      const a = await loadForEdit(u, id)
      if (mode === 'pub' && (!a.title.trim() || (await hasMissingImages(a)))) continue
      await db
        .update(articles)
        .set({ status: DB_STATUS[mode], publishAt: null, publishedAt: mode === 'pub' ? (a.publishedAt ?? new Date()) : a.publishedAt, updatedBy: u.id })
        .where(eq(articles.id, id))
    }
    await audit(u, 'article.bulkStatus', 'article', null, { ids: list, to: DB_STATUS[mode] })
    refreshSite()
    return getNews(list)
  })
}

export async function deleteArticles(ids: string[]): Promise<ActionResult<string[]>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    const list = z.array(z.uuid()).max(200).parse(ids)
    for (const id of list) {
      const a = await loadForEdit(u, id)
      if (a.status === 'published' && !can(u.role, 'article.publish')) throw new ForbiddenError()
    }
    await db.delete(articles).where(inArray(articles.id, list))
    await audit(u, 'article.delete', 'article', null, { ids: list })
    refreshSite()
    return list
  })
}

export async function duplicateArticle(id: string): Promise<ActionResult<AdminNews>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    const a = await loadForEdit(u, z.uuid().parse(id))
    const title = a.title + ' (copia)'
    const slug = await uniqueSlug(title, a.sectionId, null)
    const [row] = await db
      .insert(articles)
      .values({
        title,
        slug,
        lead: a.lead,
        sectionId: a.sectionId,
        authorId: a.authorId,
        heroId: a.heroId,
        blocks: a.blocks,
        tags: a.tags,
        seoDescription: a.seoDescription,
        createdBy: u.id,
        updatedBy: u.id,
      })
      .returning()
    return (await getNews([row.id]))[0]
  })
}

export async function listVersions(articleId: string): Promise<ActionResult<AdminVersion[]>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    await loadForEdit(u, z.uuid().parse(articleId))
    const rows = await db
      .select()
      .from(articleVersions)
      .where(eq(articleVersions.articleId, articleId))
      .orderBy(desc(articleVersions.createdAt))
      .limit(20)
    return rows.map((v) => ({ id: v.id, at: v.createdAt.toISOString(), manual: v.manual, title: v.snapshot.title, blocks: v.snapshot.blocks.length }))
  })
}

export async function getVersion(versionId: string): Promise<ActionResult<{ title: string; lead: string; blocks: Block[]; tags: string[] }>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    const [v] = await db.select().from(articleVersions).where(eq(articleVersions.id, z.uuid().parse(versionId)))
    if (!v) throw new UserError('Esa versión ya no existe.')
    await loadForEdit(u, v.articleId)
    return v.snapshot
  })
}

/* ---------- Cobertura en vivo ---------- */

export type AdminLiveUpdate = { id: string; title: string; body: string; important: boolean; at: string; by: string | null }

const liveSchema = z.object({ title: z.string().trim().max(160), body: z.string().trim().min(2).max(4000), important: z.boolean() })

async function articlePath(id: string) {
  const [r] = await db.select({ slug: articles.slug, sec: sections.slug }).from(articles).innerJoin(sections, eq(articles.sectionId, sections.id)).where(eq(articles.id, id))
  return r ? `/${r.sec}/${r.slug}` : null
}

export async function listLiveUpdates(articleId: string): Promise<ActionResult<AdminLiveUpdate[]>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    await loadForEdit(u, z.uuid().parse(articleId))
    const rows = await db
      .select({ id: liveUpdates.id, title: liveUpdates.title, body: liveUpdates.body, important: liveUpdates.important, at: liveUpdates.createdAt, by: user.name })
      .from(liveUpdates)
      .leftJoin(user, eq(liveUpdates.createdBy, user.id))
      .where(eq(liveUpdates.articleId, articleId))
      .orderBy(desc(liveUpdates.createdAt))
      .limit(100)
    return rows.map((r) => ({ ...r, at: r.at.toISOString() }))
  })
}

/** Publica una entrada en la cobertura. Quien puede editar la nota puede escribir en su directo. */
export async function addLiveUpdate(articleId: string, input: z.input<typeof liveSchema>): Promise<ActionResult<AdminLiveUpdate>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    const a = await loadForEdit(u, z.uuid().parse(articleId))
    const parsed = liveSchema.safeParse(input)
    if (!parsed.success) throw new UserError('Escribe el texto de la actualización.')
    const [r] = await db.insert(liveUpdates).values({ articleId: a.id, ...parsed.data, createdBy: u.id }).returning()
    if (!a.live) await db.update(articles).set({ live: true }).where(eq(articles.id, a.id))
    const path = await articlePath(a.id)
    if (path) revalidatePath(path)
    if (a.status === 'published' && !a.live) refreshSite()
    return { id: r.id, title: r.title, body: r.body, important: r.important, at: r.createdAt.toISOString(), by: u.name }
  })
}

export async function deleteLiveUpdate(id: string): Promise<ActionResult<void>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    const [r] = await db.select({ articleId: liveUpdates.articleId }).from(liveUpdates).where(eq(liveUpdates.id, z.uuid().parse(id)))
    if (!r) return
    await loadForEdit(u, r.articleId)
    await db.delete(liveUpdates).where(eq(liveUpdates.id, id))
    const path = await articlePath(r.articleId)
    if (path) revalidatePath(path)
  })
}

/* ---------- Multimedia ---------- */

const mediaInfo = z.object({ alt: z.string().trim().max(400), credit: z.string().trim().max(200) })

export async function updateMediaInfo(id: string, input: z.input<typeof mediaInfo>): Promise<ActionResult<void>> {
  return run(async () => {
    await requirePermission('article.create')
    await db.update(media).set(mediaInfo.parse(input)).where(eq(media.id, z.uuid().parse(id)))
    refreshSite()
  })
}

/** Dónde se usa una imagen, consultado en el momento (la lista del panel puede estar desactualizada). */
export async function getMediaUses(id: string): Promise<ActionResult<MediaUse[]>> {
  return run(async () => {
    await requirePermission('article.create')
    const mid = z.uuid().parse(id)
    return (await mediaUsage([mid])).get(mid) ?? []
  })
}

async function loadMediaFor(u: CurrentUser, id: string) {
  const [m] = await db.select().from(media).where(eq(media.id, z.uuid().parse(id)))
  if (!m) throw new UserError('Esa imagen ya no existe.')
  if (m.createdBy !== u.id && !can(u.role, 'media.manage'))
    throw new UserError('Solo puedes borrar las imágenes que subiste tú. Pídeselo a un editor.')
  return m
}

/** Quita una imagen de las notas en borrador (bloques y portada) y de los videos sin publicar. */
async function detachFromDrafts(m: typeof media.$inferSelect) {
  const rows = await db
    .select({ id: articles.id, blocks: articles.blocks, heroId: articles.heroId })
    .from(articles)
    .where(and(inArray(articles.status, ['draft', 'review']), sql`(${articles.heroId} = ${m.id} or ${articles.blocks} @> ${JSON.stringify([{ mediaId: m.id }])}::jsonb or ${articles.blocks} @> ${JSON.stringify([{ src: m.key }])}::jsonb)`))
  for (const a of rows) {
    const blocks = a.blocks.filter((b) => !(b.t === 'img' && (b.mediaId === m.id || b.src === m.key)))
    const hero = blocks.find((b): b is Extract<ArticleBlock, { t: 'img' }> => b.t === 'img' && !!b.mediaId)
    await db.update(articles).set({ blocks, heroId: hero?.mediaId ?? null }).where(eq(articles.id, a.id))
  }
  await db.update(videos).set({ posterId: null }).where(and(eq(videos.posterId, m.id), ne(videos.status, 'published')))
}

/** Manda una imagen a la papelera (se borra del todo a los 30 días).
    - Sin usar: directo.
    - Solo en borradores: hay que confirmarlo (fromDrafts) y se quita de esos borradores.
    - En algo publicado: no se puede; primero hay que reemplazarla. */
export async function trashMedia(id: string, fromDrafts = false): Promise<ActionResult<void>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    const m = await loadMediaFor(u, id)
    if (m.deletedAt) return
    const uses = (await mediaUsage([m.id])).get(m.id) ?? []
    const live = uses.filter((x) => x.live)
    if (live.length)
      throw new UserError(`Esta imagen se ve en ${live.length === 1 ? '1 publicación' : live.length + ' publicaciones'}. Reemplázala por otra antes de borrarla.`)
    if (uses.length) {
      if (!can(u.role, 'media.manage')) throw new UserError('Esta imagen se usa en borradores. Quítala de ellos o pídele a un editor que la borre.')
      if (!fromDrafts) throw new UserError('Esta imagen se usa en borradores. Confirma que quieres quitarla de ellos.')
      await detachFromDrafts(m)
    }
    await db.update(media).set({ deletedAt: new Date() }).where(eq(media.id, m.id))
    await audit(u, 'media.trash', 'media', m.id, { name: m.name, drafts: uses.map((x) => x.id) })
  })
}

export async function restoreMedia(id: string): Promise<ActionResult<void>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    const m = await loadMediaFor(u, id)
    await db.update(media).set({ deletedAt: null }).where(eq(media.id, m.id))
    await audit(u, 'media.restore', 'media', m.id, { name: m.name })
  })
}

/** Borra ya, sin esperar los 30 días. Solo desde la papelera. */
export async function purgeMedia(id: string): Promise<ActionResult<void>> {
  return run(async () => {
    const u = await requirePermission('media.manage')
    const m = await loadMediaFor(u, id)
    if (!m.deletedAt) throw new UserError('Primero manda la imagen a la papelera.')
    if (!(await deleteObject(m.key))) throw new UserError('El almacenamiento no pudo borrar el archivo. Inténtalo de nuevo más tarde.')
    await db.delete(media).where(eq(media.id, m.id))
    await audit(u, 'media.purge', 'media', m.id, { name: m.name })
  })
}

/** Cambia una imagen por otra en todas partes (notas, portadas de video, fotos de firma) y manda la vieja a la papelera. */
export async function replaceMedia(oldId: string, newId: string): Promise<ActionResult<number>> {
  return run(async () => {
    const u = await requirePermission('media.manage')
    const [from] = await db.select().from(media).where(eq(media.id, z.uuid().parse(oldId)))
    const [to] = await db.select().from(media).where(and(eq(media.id, z.uuid().parse(newId)), isNull(media.deletedAt)))
    if (!from || !to) throw new UserError('Una de las dos imágenes ya no está en la biblioteca.')
    if (from.id === to.id) throw new UserError('Elige una imagen distinta.')

    const rows = await db
      .select({ id: articles.id, blocks: articles.blocks, heroId: articles.heroId })
      .from(articles)
      .where(sql`(${articles.heroId} = ${from.id} or ${articles.blocks} @> ${JSON.stringify([{ mediaId: from.id }])}::jsonb or ${articles.blocks} @> ${JSON.stringify([{ src: from.key }])}::jsonb)`)
    for (const a of rows) {
      const blocks = a.blocks.map((b) =>
        b.t === 'img' && (b.mediaId === from.id || b.src === from.key) ? { ...b, mediaId: to.id, src: to.key, alt: to.alt || b.alt } : b,
      )
      await db
        .update(articles)
        .set({ blocks, heroId: a.heroId === from.id ? to.id : a.heroId })
        .where(eq(articles.id, a.id))
    }
    await db.update(videos).set({ posterId: to.id }).where(eq(videos.posterId, from.id))
    await db.update(authors).set({ avatarId: to.id }).where(eq(authors.avatarId, from.id))
    await db.update(user).set({ image: to.key }).where(eq(user.image, from.key))
    await db.update(media).set({ deletedAt: new Date() }).where(eq(media.id, from.id))
    await audit(u, 'media.replace', 'media', from.id, { to: to.id, articles: rows.map((a) => a.id) })
    refreshSite()
    return rows.length
  })
}

const importSchema = z.object({
  url: z.string().trim().min(8).max(2000),
  credit: z.string().trim().min(2, 'Escribe el crédito o la fuente de la imagen.').max(200),
})

/** Descarga una imagen desde un enlace (o la principal de una página) y la guarda en la biblioteca con su crédito. */
export async function importMediaFromUrl(input: z.input<typeof importSchema>): Promise<ActionResult<AdminMedia>> {
  return run(async () => {
    const u = await requirePermission('article.create')
    const parsed = importSchema.safeParse(input)
    if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? 'Revisa el enlace y el crédito.')
    const d = parsed.data
    let file: Awaited<ReturnType<typeof fetchRemoteImage>>
    try {
      file = await fetchRemoteImage(d.url, MAX_IMAGE)
    } catch (e) {
      if (e instanceof RemoteImageError) throw new UserError(e.message)
      throw e
    }
    const kind = sniffImage(new Uint8Array(file.body.subarray(0, 12)))
    if (!kind) throw new UserError('Ese enlace no es una imagen JPG, PNG, WebP o GIF.')
    let url: string
    try {
      url = await putObject(imageKey(kind.ext), new Uint8Array(file.body).buffer, kind.mime)
    } catch (e) {
      if (e instanceof StorageError) throw new UserError(e.message)
      throw e
    }
    const [row] = await db
      .insert(media)
      .values({ key: url, name: file.name, credit: d.credit, mime: kind.mime, bytes: file.body.length, createdBy: u.id })
      .returning()
    await audit(u, 'media.import', 'media', row.id, { source: file.source })
    return toMedia(row)
  })
}

/* ---------- Boletín ---------- */

export type NewsletterStatus = { ready: boolean; confirmed: number; pending: number; stories: number; lastSent: string | null }

export async function getNewsletterStatus(): Promise<ActionResult<NewsletterStatus>> {
  return run(async () => {
    await requirePermission('home.manage')
    const [[c], [p], d, [st]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(subscribers).where(and(isNotNull(subscribers.confirmedAt), isNull(subscribers.unsubscribedAt))),
      db.select({ n: sql<number>`count(*)::int` }).from(subscribers).where(and(isNull(subscribers.confirmedAt), isNull(subscribers.unsubscribedAt))),
      buildDigest(),
      db.select().from(settings).where(eq(settings.key, 'newsletter')),
    ])
    return { ready: emailReady(), confirmed: c.n, pending: p.n, stories: d?.stories.length ?? 0, lastSent: (st?.value as { lastSent?: string } | undefined)?.lastSent ?? null }
  })
}

/** Manda el boletín de hoy solo a quien lo pide, para revisarlo en su bandeja. */
export async function sendNewsletterTest(): Promise<ActionResult<string>> {
  return run(async () => {
    const u = await requirePermission('home.manage')
    const d = await buildDigest()
    if (!d) throw new UserError('No hay notas publicadas en las últimas 24 horas: hoy no se enviaría boletín.')
    const e = digestEmail(d, { id: '00000000-0000-0000-0000-000000000000', email: u.email })
    try {
      await sendEmail({ ...e, subject: '[Prueba] ' + e.subject })
    } catch (err) {
      if (err instanceof EmailError) throw new UserError(err.message)
      throw err
    }
    return u.email
  })
}

/* ---------- Avisos de última hora ---------- */

export async function getPushStatus(): Promise<ActionResult<{ ready: boolean; count: number }>> {
  return run(async () => {
    await requirePermission('home.manage')
    return { ready: pushReady(), count: await pushCount() }
  })
}

const pushMsg = z.object({ text: z.string().trim().min(5).max(160), articleId: z.uuid().nullable() })

/** Manda un aviso al celular/computadora de quien lo activó. Abre la nota elegida o la portada. */
export async function sendBreakingPush(input: z.input<typeof pushMsg>): Promise<ActionResult<number>> {
  return run(async () => {
    const u = await requirePermission('home.manage')
    const d = pushMsg.safeParse(input)
    if (!d.success) throw new UserError('Escribe el aviso (entre 5 y 160 caracteres).')
    const url = (d.data.articleId && (await articlePath(d.data.articleId))) || '/'
    try {
      const r = await sendPush({ title: 'Última hora · El Global', body: d.data.text, url })
      await audit(u, 'push.send', 'site', null, { text: d.data.text, url, ...r })
      return r.sent
    } catch (e) {
      if (e instanceof PushError) throw new UserError(e.message)
      throw e
    }
  })
}

/* ---------- Comentarios ---------- */

export async function moderateComment(id: string, approve: boolean): Promise<ActionResult<void>> {
  return run(async () => {
    const u = await requirePermission('comment.moderate')
    await db
      .update(comments)
      .set({ status: approve ? 'approved' : 'rejected', moderatedBy: u.id })
      .where(eq(comments.id, z.uuid().parse(id)))
    refreshSite()
  })
}

/* ---------- Portada ---------- */

const homeSchema = z.object({
  featured: z.array(z.uuid().nullable()).length(3),
  breaking: z.object({ on: z.boolean(), text: z.string().max(120) }),
})

export async function saveHome(input: z.input<typeof homeSchema>): Promise<ActionResult<void>> {
  return run(async () => {
    const u = await requirePermission('home.manage')
    const value = homeSchema.parse(input)
    await db
      .insert(settings)
      .values({ key: 'home', value, updatedBy: u.id })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedBy: u.id } })
    await audit(u, 'home.save', 'settings', 'home', value)
    refreshSite()
  })
}

export async function saveMenu(items: { id: string; inMenu: boolean }[]): Promise<ActionResult<void>> {
  return run(async () => {
    const u = await requirePermission('home.manage')
    const list = z.array(z.object({ id: z.uuid(), inMenu: z.boolean() })).max(50).parse(items)
    for (const [i, s] of list.entries()) await db.update(sections).set({ position: i, inMenu: s.inMenu }).where(eq(sections.id, s.id))
    await audit(u, 'menu.save', 'sections', null, list)
    refreshSite()
  })
}

/* ---------- Equipo ---------- */

const userId = z.string().min(1).max(64)

/** Contraseña temporal legible (sin caracteres que se confunden), 16 caracteres. */
function tempPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const out: string[] = []
  while (out.length < 16) {
    const b = crypto.getRandomValues(new Uint8Array(1))[0]
    if (b < 228) out.push(alphabet[b % alphabet.length]) // 228 = 4 × 57: sin sesgo
  }
  return out.join('')
}

/** Contraseña elegida por el administrador; vacía = se genera una temporal. */
const chosenPassword = z
  .string()
  .max(128)
  .optional()
  .transform((p) => p || undefined)
  .refine((p) => p === undefined || p.length >= 12, 'La contraseña debe tener al menos 12 caracteres.')

async function adminCount() {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(user).where(eq(user.role, 'admin'))
  return r.n
}

async function loadTeamUser(id: string) {
  const [t] = await db.select().from(user).where(eq(user.id, id))
  if (!t) throw new UserError('Esa cuenta ya no existe.')
  return t
}

/** El propio usuario o alguien con permiso de administrar el equipo. */
async function requireSelfOrManager(id: string) {
  const u = await getUser()
  if (!u) throw new ForbiddenError()
  if (u.id !== id && !can(u.role, 'team.manage')) throw new ForbiddenError()
  return u
}

export async function setUserRole(targetId: string, role: string): Promise<ActionResult<void>> {
  return run(async () => {
    const u = await requirePermission('team.manage')
    const r = z.enum(ROLES).parse(role)
    const id = userId.parse(targetId)
    if (id === u.id && r !== 'admin') throw new UserError('No puedes quitarte a ti mismo el rol de administrador.')
    const t = await loadTeamUser(id)
    if (t.role === 'admin' && r !== 'admin' && (await adminCount()) <= 1) throw new UserError('Debe quedar al menos un administrador.')
    await db.update(user).set({ role: r }).where(eq(user.id, id))
    await audit(u, 'user.role', 'user', id, { role: r })
  })
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(200).optional(),
  bio: z.string().trim().max(300).default(''),
})

/** Nombre y biografía (y correo, solo para administradores). Actualiza también la firma pública. */
export async function updateProfile(targetId: string, input: z.input<typeof profileSchema>): Promise<ActionResult<void>> {
  return run(async () => {
    const id = userId.parse(targetId)
    const u = await requireSelfOrManager(id)
    const d = profileSchema.parse(input)
    const patch: Partial<typeof user.$inferInsert> = { name: d.name }
    if (d.email !== undefined) {
      if (!can(u.role, 'team.manage')) throw new UserError('Solo un administrador puede cambiar el correo de acceso.')
      const email = d.email.toLowerCase()
      const [dup] = await db.select({ id: user.id }).from(user).where(and(eq(user.email, email), ne(user.id, id)))
      if (dup) throw new UserError('Ya existe otra cuenta con ese correo.')
      patch.email = email
    }
    await db.update(user).set(patch).where(eq(user.id, id))
    const [byline] = await db.select({ id: authors.id }).from(authors).where(eq(authors.userId, id))
    if (byline) await db.update(authors).set({ name: d.name, bio: d.bio || null }).where(eq(authors.id, byline.id))
    else await db.insert(authors).values({ name: d.name, slug: await uniqueAuthorSlug(d.name), bio: d.bio || null, userId: id })
    await audit(u, 'user.profile', 'user', id, { name: d.name, email: patch.email })
    refreshSite()
  })
}

/** Foto de perfil: se elige de la biblioteca (o se sube antes). null la quita. */
export async function setUserAvatar(targetId: string, mediaId: string | null): Promise<ActionResult<string | null>> {
  return run(async () => {
    const id = userId.parse(targetId)
    const u = await requireSelfOrManager(id)
    let url: string | null = null
    if (mediaId) {
      const [m] = await db.select().from(media).where(eq(media.id, z.uuid().parse(mediaId)))
      if (!m) throw new UserError('Esa imagen ya no está en la biblioteca.')
      url = m.key
    }
    await db.update(user).set({ image: url }).where(eq(user.id, id))
    await db.update(authors).set({ avatarId: mediaId }).where(eq(authors.userId, id))
    await audit(u, 'user.avatar', 'user', id)
    refreshSite()
    return url
  })
}

/** Nueva contraseña para otra persona (la escrita por el administrador o una temporal). Cierra todas sus sesiones. */
export async function resetUserPassword(targetId: string, chosen?: string): Promise<ActionResult<string>> {
  return run(async () => {
    const u = await requirePermission('team.manage')
    const id = userId.parse(targetId)
    if (id === u.id) throw new UserError('Para tu propia cuenta, usa «Mi cuenta» → Contraseña.')
    await loadTeamUser(id)
    const password = chosenPassword.parse(chosen) ?? tempPassword()
    const hash = await hashPassword(password)
    const [acc] = await db.select({ id: account.id }).from(account).where(and(eq(account.userId, id), eq(account.providerId, 'credential')))
    if (acc) await db.update(account).set({ password: hash, updatedAt: new Date() }).where(eq(account.id, acc.id))
    else await db.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: 'credential', userId: id, password: hash, updatedAt: new Date() })
    await db.delete(session).where(eq(session.userId, id))
    await audit(u, 'user.resetPassword', 'user', id)
    return password
  })
}

/** Quita la verificación en dos pasos (p. ej. si la persona perdió el teléfono). */
export async function resetUserTwoFactor(targetId: string): Promise<ActionResult<void>> {
  return run(async () => {
    const u = await requirePermission('team.manage')
    const id = userId.parse(targetId)
    await loadTeamUser(id)
    await db.delete(twoFactor).where(eq(twoFactor.userId, id))
    await db.update(user).set({ twoFactorEnabled: false }).where(eq(user.id, id))
    await db.delete(session).where(eq(session.userId, id))
    await audit(u, 'user.resetTwoFactor', 'user', id)
  })
}

/** Cierra todas las sesiones abiertas de una persona. */
export async function revokeUserSessions(targetId: string): Promise<ActionResult<number>> {
  return run(async () => {
    const u = await requirePermission('team.manage')
    const id = userId.parse(targetId)
    const gone = await db.delete(session).where(eq(session.userId, id)).returning({ id: session.id })
    await audit(u, 'user.revokeSessions', 'user', id, { count: gone.length })
    return gone.length
  })
}

/** Elimina la cuenta. Sus notas y su firma se conservan, sin vínculo con la cuenta. */
export async function deleteTeamUser(targetId: string): Promise<ActionResult<void>> {
  return run(async () => {
    const u = await requirePermission('team.manage')
    const id = userId.parse(targetId)
    if (id === u.id) throw new UserError('No puedes eliminar tu propia cuenta.')
    const t = await loadTeamUser(id)
    if (t.role === 'admin' && (await adminCount()) <= 1) throw new UserError('Debe quedar al menos un administrador.')
    await db.delete(user).where(eq(user.id, id))
    await audit(u, 'user.delete', 'user', id, { email: t.email, name: t.name })
  })
}

async function uniqueAuthorSlug(name: string) {
  const root = slugify(name) || 'firma'
  const taken = new Set((await db.select({ slug: authors.slug }).from(authors).where(like(authors.slug, root + '%'))).map((r) => r.slug))
  if (!taken.has(root)) return root
  for (let i = 2; ; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`
}

const inviteSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.email().max(200), role: z.enum(ROLES), password: chosenPassword })

/** Crea la cuenta con la contraseña escrita por el administrador o una temporal que se muestra una sola vez. */
export async function createTeamUser(input: z.input<typeof inviteSchema>): Promise<ActionResult<{ user: AdminUser; password: string }>> {
  return run(async () => {
    const u = await requirePermission('team.manage')
    const d = inviteSchema.parse(input)
    const email = d.email.toLowerCase()
    const [dup] = await db.select({ id: user.id }).from(user).where(eq(user.email, email))
    if (dup) throw new UserError('Ya existe una cuenta con ese correo.')
    const password = d.password ?? tempPassword()
    const id = crypto.randomUUID()
    await db.insert(user).values({ id, name: d.name, email, role: d.role, emailVerified: true })
    await db.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: 'credential', userId: id, password: await hashPassword(password), updatedAt: new Date() })
    // Su firma para las notas
    await db.insert(authors).values({ name: d.name, slug: await uniqueAuthorSlug(d.name), userId: id })
    await audit(u, 'user.create', 'user', id, { email, role: d.role })
    return { user: { id, name: d.name, email, role: d.role, twoFactor: false, image: null, bio: '' }, password }
  })
}
