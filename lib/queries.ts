import 'server-only'
import { and, asc, desc, eq, ilike, inArray, ne, notInArray, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/db'
import { articles, authors, comments, liveUpdates, media, sections, type ArticleBlock } from '@/db/schema'
import { getHome } from './newsroom'

/* Consultas del sitio público. Una nota programada cuenta como publicada en cuanto llega su hora,
   aunque el cron todavía no haya cambiado su estado. */
const isLive = () =>
  or(eq(articles.status, 'published'), and(eq(articles.status, 'scheduled'), sql`${articles.publishAt} <= now()`))
const liveDate = sql<Date>`coalesce(${articles.publishedAt}, ${articles.publishAt})`

export type Card = {
  id: string
  title: string
  lead: string
  slug: string
  sec: string
  secSlug: string
  au: string | null
  date: string
  reads: number
  img: string | null
  alt: string
  href: string
  /** Cobertura en vivo activa. */
  live: boolean
}

const cardCols = {
  id: articles.id,
  title: articles.title,
  lead: articles.lead,
  slug: articles.slug,
  sec: sections.name,
  secSlug: sections.slug,
  au: authors.name,
  date: liveDate,
  reads: articles.reads,
  img: media.key,
  alt: media.alt,
  live: articles.live,
}

const cards = () =>
  db
    .select(cardCols)
    .from(articles)
    .innerJoin(sections, eq(articles.sectionId, sections.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .leftJoin(media, eq(articles.heroId, media.id))

const toCard = (r: Omit<Card, 'href' | 'date' | 'alt'> & { date: Date | string; alt: string | null }): Card => ({
  ...r,
  alt: r.alt ?? '',
  date: new Date(r.date).toISOString(),
  href: `/${r.secSlug}/${r.slug}`,
})

/** Notas del boletín: publicadas desde `since`. Primero las marcadas «para el boletín» y las de última hora; luego las más recientes. */
export async function getDigestCards(since: Date, limit = 8): Promise<Card[]> {
  const rows = await cards()
    .where(and(isLive(), sql`${liveDate} >= ${since.toISOString()}::timestamptz`))
    .orderBy(desc(articles.inNewsletter), desc(articles.breaking), desc(liveDate))
    .limit(limit)
  return rows.map(toCard)
}

export async function getMenu() {
  return db.select({ name: sections.name, slug: sections.slug }).from(sections).where(eq(sections.inMenu, true)).orderBy(asc(sections.position))
}

export async function getFrontPage() {
  const [home, latest, menu] = await Promise.all([getHome(), cards().where(isLive()).orderBy(desc(liveDate)).limit(40), getMenu()])
  const all = latest.map(toCard)
  const day = Date.now() - 864e5,
    week = Date.now() - 7 * 864e5
  const byReads = (l: Card[]) => [...l].sort((a, b) => b.reads - a.reads)
  const recent = all.filter((c) => +new Date(c.date) >= week)

  // Destacadas: fijas desde el panel o, si están en automático, las más leídas recientes.
  const auto = byReads(recent.length ? recent : all)
  const used = new Set<string>()
  const featured = home.featured.map((id) => {
    const pick = (id && all.find((c) => c.id === id && !used.has(c.id))) || auto.find((c) => !used.has(c.id)) || null
    if (pick) used.add(pick.id)
    return pick
  })

  return {
    breaking: home.breaking,
    menu,
    hero: featured[0],
    secondary: featured.slice(1).filter(Boolean) as Card[],
    mostRead: {
      hoy: byReads(all.filter((c) => +new Date(c.date) >= day)).slice(0, 5),
      sem: byReads(recent).slice(0, 5),
    },
    latest: all.filter((c) => !used.has(c.id)),
    updatedAt: all[0]?.date ?? null,
  }
}

export async function getSectionPage(slug: string) {
  const [sec] = await db.select().from(sections).where(eq(sections.slug, slug))
  if (!sec) return null
  const list = await cards()
    .where(and(isLive(), eq(articles.sectionId, sec.id)))
    .orderBy(desc(liveDate))
    .limit(30)
  return { section: { name: sec.name, slug: sec.slug }, cards: list.map(toCard), menu: await getMenu() }
}

const avatar = alias(media, 'avatar')

export type FullArticle = {
  id: string
  slug: string
  title: string
  lead: string
  sec: string
  secSlug: string
  au: string | null
  auImg: string | null
  auBio: string | null
  date: string
  blocks: ArticleBlock[]
  tags: string[]
  seo: string
  allowComments: boolean
  hero: { src: string; alt: string } | null
  /** Crédito de cada imagen de la nota, por URL. */
  credits: Record<string, string>
  live: boolean
  updates: LiveUpdate[]
}

export type LiveUpdate = { id: string; title: string; body: string; important: boolean; at: string }

/** Entradas de una cobertura en vivo, la más reciente primero. Con `after`, solo las más nuevas. */
export async function getLiveUpdateList(articleId: string, after?: Date) {
  const rows = await db
    .select({ id: liveUpdates.id, title: liveUpdates.title, body: liveUpdates.body, important: liveUpdates.important, at: liveUpdates.createdAt })
    .from(liveUpdates)
    .where(and(eq(liveUpdates.articleId, articleId), after ? sql`${liveUpdates.createdAt} > ${after.toISOString()}::timestamptz` : undefined))
    .orderBy(desc(liveUpdates.createdAt))
    .limit(200)
  return rows.map((r) => ({ ...r, at: r.at.toISOString() }))
}

/** ¿Se puede leer la nota en el sitio ahora mismo? */
export async function isArticleLive(id: string) {
  const [a] = await db.select({ live: articles.live, blocks: articles.blocks }).from(articles).where(and(eq(articles.id, id), isLive()))
  return a ?? null
}

export async function getArticle(secSlug: string, slug: string) {
  const [a] = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      lead: articles.lead,
      sec: sections.name,
      secSlug: sections.slug,
      sectionId: sections.id,
      au: authors.name,
      auImg: avatar.key,
      auBio: authors.bio,
      date: liveDate,
      blocks: articles.blocks,
      tags: articles.tags,
      seo: articles.seoDescription,
      allowComments: articles.allowComments,
      heroSrc: media.key,
      heroAlt: media.alt,
      heroCredit: media.credit,
      live: articles.live,
    })
    .from(articles)
    .innerJoin(sections, eq(articles.sectionId, sections.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .leftJoin(media, eq(articles.heroId, media.id))
    .leftJoin(avatar, eq(authors.avatarId, avatar.id))
    .where(and(isLive(), eq(sections.slug, secSlug), eq(articles.slug, slug)))
  if (!a) return null

  const imgIds = a.blocks.flatMap((b) => (b.t === 'img' && b.mediaId ? [b.mediaId] : []))
  const [related, coms, credited, updates] = await Promise.all([
    cards()
      .where(and(isLive(), eq(articles.sectionId, a.sectionId), ne(articles.id, a.id)))
      .orderBy(desc(liveDate))
      .limit(4),
    db
      .select({ id: comments.id, parentId: comments.parentId, who: comments.authorName, body: comments.body, at: comments.createdAt, helpful: comments.helpful })
      .from(comments)
      .where(and(eq(comments.articleId, a.id), eq(comments.status, 'approved')))
      .orderBy(asc(comments.createdAt)),
    imgIds.length
      ? db.select({ key: media.key, credit: media.credit }).from(media).where(and(inArray(media.id, imgIds), ne(media.credit, '')))
      : Promise.resolve([]),
    a.live ? getLiveUpdateList(a.id) : Promise.resolve([]),
  ])
  let rel = related.map(toCard)
  if (rel.length < 4) {
    const more = await cards()
      .where(and(isLive(), ne(articles.id, a.id), ...(rel.length ? [notInArray(articles.id, rel.map((r) => r.id))] : [])))
      .orderBy(desc(liveDate))
      .limit(4 - rel.length)
    rel = [...rel, ...more.map(toCard)]
  }

  const article: FullArticle = {
    id: a.id,
    slug: a.slug,
    title: a.title,
    lead: a.lead,
    sec: a.sec,
    secSlug: a.secSlug,
    au: a.au,
    auImg: a.auImg,
    auBio: a.auBio,
    date: new Date(a.date).toISOString(),
    blocks: a.blocks,
    tags: a.tags,
    seo: a.seo,
    allowComments: a.allowComments,
    hero: a.heroSrc ? { src: a.heroSrc, alt: a.heroAlt ?? '' } : null,
    live: a.live,
    updates,
    credits: Object.fromEntries([...credited.map((m) => [m.key, m.credit]), ...(a.heroSrc && a.heroCredit ? [[a.heroSrc, a.heroCredit]] : [])]),
  }
  return {
    article,
    next: rel[0] ?? null,
    related: rel.slice(1, 4),
    comments: coms.map((c) => ({ ...c, at: c.at.toISOString() })),
  }
}

export async function searchCards(q: string) {
  const term = `%${q.replace(/[%_\\]/g, (m) => '\\' + m)}%`
  const rows = await cards()
    .where(and(isLive(), or(ilike(articles.title, term), ilike(articles.lead, term), ilike(sections.name, term), ilike(authors.name, term))))
    .orderBy(desc(liveDate))
    .limit(12)
  return rows.map(toCard)
}

export const readingMinutes = (a: Pick<FullArticle, 'title' | 'lead' | 'blocks'>) =>
  Math.max(
    1,
    Math.ceil(
      [a.title, a.lead, ...a.blocks.map((b) => ('v' in b ? b.v : '') + ' ' + ('cap' in b ? (b.cap ?? '') : ''))]
        .join(' ')
        .split(/\s+/)
        .filter(Boolean).length / 200,
    ),
  )

