'use server'

/* Acciones del panel de redacción. Cada una valida la entrada y comprueba el permiso
   antes de tocar la base de datos. */
import { hashPassword } from 'better-auth/crypto'
import { and, desc, eq, inArray, like, ne, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { ROLES } from '@/db/auth-schema'
import { account, articles, articleVersions, auditLog, authors, comments, media, sections, settings, user, type ArticleBlock } from '@/db/schema'
import { getEditorPayload, getNews, slugify } from '@/lib/newsroom'
import { DB_STATUS, type ActionResult, type AdminNews, type AdminVersion, type Block, type EditorPayload, type Status } from '@/lib/newsroom-types'
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
  t: z.enum(['p', 'sub', 'img', 'quote', 'video', 'data', 'sum']),
  v: str(20000).optional(),
  who: str(200).optional(),
  mediaId: z.uuid().nullable().optional(),
  alt: str(400).optional(),
  cap: str(400).optional(),
  u: str(500).optional(),
  vert: z.boolean().optional(),
  n: str(40).optional(),
  l: str(300).optional(),
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
      if (mode === 'pub' && !a.title.trim()) continue
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

/* ---------- Multimedia ---------- */

export async function updateMediaAlt(id: string, alt: string): Promise<ActionResult<void>> {
  return run(async () => {
    await requirePermission('article.create')
    await db
      .update(media)
      .set({ alt: z.string().max(400).parse(alt).trim() })
      .where(eq(media.id, z.uuid().parse(id)))
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

export async function setUserRole(userId: string, role: string): Promise<ActionResult<void>> {
  return run(async () => {
    const u = await requirePermission('team.manage')
    const r = z.enum(ROLES).parse(role)
    const id = z.string().max(64).parse(userId)
    if (id === u.id && r !== 'admin') throw new UserError('No puedes quitarte a ti mismo el rol de administrador.')
    await db.update(user).set({ role: r }).where(eq(user.id, id))
    await audit(u, 'user.role', 'user', id, { role: r })
  })
}

async function uniqueAuthorSlug(name: string) {
  const root = slugify(name) || 'firma'
  const taken = new Set((await db.select({ slug: authors.slug }).from(authors).where(like(authors.slug, root + '%'))).map((r) => r.slug))
  if (!taken.has(root)) return root
  for (let i = 2; ; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`
}

const inviteSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.email().max(200), role: z.enum(ROLES) })

/** Crea la cuenta con una contraseña temporal que se muestra una sola vez al administrador. */
export async function createTeamUser(
  input: z.input<typeof inviteSchema>,
): Promise<ActionResult<{ user: { id: string; name: string; email: string; role: (typeof ROLES)[number]; twoFactor: boolean }; password: string }>> {
  return run(async () => {
    const u = await requirePermission('team.manage')
    const d = inviteSchema.parse(input)
    const email = d.email.toLowerCase()
    const [dup] = await db.select({ id: user.id }).from(user).where(eq(user.email, email))
    if (dup) throw new UserError('Ya existe una cuenta con ese correo.')
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    const password = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
    const id = crypto.randomUUID()
    await db.insert(user).values({ id, name: d.name, email, role: d.role, emailVerified: true })
    await db.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: 'credential', userId: id, password: await hashPassword(password), updatedAt: new Date() })
    // Su firma para las notas
    await db.insert(authors).values({ name: d.name, slug: await uniqueAuthorSlug(d.name), userId: id })
    await audit(u, 'user.create', 'user', id, { email, role: d.role })
    return { user: { id, name: d.name, email, role: d.role, twoFactor: false }, password }
  })
}

export async function whoami() {
  return getUser()
}
