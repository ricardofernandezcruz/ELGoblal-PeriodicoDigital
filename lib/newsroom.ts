import 'server-only'
import { and, asc, count, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { articles, authors, comments, media, sections, settings, subscribers, user, type HomeSettings } from '@/db/schema'
import type { AdminData, AdminHome, AdminMedia, AdminNews, EditorPayload } from './newsroom-types'
import { UI_STATUS } from './newsroom-types'

export const DEFAULT_HOME: HomeSettings = { featured: [null, null, null], breaking: { on: false, text: '' } }

export const slugify = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)

const newsCols = {
  id: articles.id,
  t: articles.title,
  slug: articles.slug,
  status: articles.status,
  publishAt: articles.publishAt,
  publishedAt: articles.publishedAt,
  r: articles.reads,
  createdBy: articles.createdBy,
  sec: sections.name,
  secSlug: sections.slug,
  au: authors.name,
  art: media.key,
}

type NewsRow = {
  id: string
  t: string
  slug: string
  status: keyof typeof UI_STATUS
  publishAt: Date | null
  publishedAt: Date | null
  r: number
  createdBy: string | null
  sec: string
  secSlug: string
  au: string | null
  art: string | null
}

export const toNews = (n: NewsRow): AdminNews => ({
  id: n.id,
  t: n.t,
  slug: n.slug,
  sec: n.sec,
  secSlug: n.secSlug,
  au: n.au ?? '—',
  st: UI_STATUS[n.status],
  d: (n.status === 'scheduled' ? n.publishAt : n.status === 'published' ? n.publishedAt : null)?.toISOString() ?? null,
  r: n.r,
  art: n.art ?? '',
  createdBy: n.createdBy,
})

const newsQuery = () =>
  db
    .select(newsCols)
    .from(articles)
    .innerJoin(sections, eq(articles.sectionId, sections.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .leftJoin(media, eq(articles.heroId, media.id))

export async function getNews(ids?: string[]): Promise<AdminNews[]> {
  const q = newsQuery()
  const rows = await (ids ? q.where(inArray(articles.id, ids)) : q).orderBy(desc(articles.updatedAt))
  return rows.map(toNews)
}

export const toMedia = (m: typeof media.$inferSelect): AdminMedia => ({ id: m.id, s: m.key, n: m.name, a: m.alt })

export async function getHome(): Promise<AdminHome> {
  const [row] = await db.select().from(settings).where(eq(settings.key, 'home'))
  return { ...DEFAULT_HOME, ...((row?.value as HomeSettings) ?? {}) }
}

export async function getAdminData(): Promise<AdminData> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const [news, med, com, secs, auths, team, home, [pub], [pubMonth], [subs], [reads]] = await Promise.all([
    getNews(),
    db.select().from(media).orderBy(desc(media.createdAt)),
    db
      .select({ id: comments.id, who: comments.authorName, text: comments.body, on: articles.title, spam: comments.flaggedSpam, at: comments.createdAt })
      .from(comments)
      .innerJoin(articles, eq(comments.articleId, articles.id))
      .where(eq(comments.status, 'pending'))
      .orderBy(desc(comments.createdAt)),
    db.select().from(sections).orderBy(asc(sections.position)),
    db.select({ id: authors.id, name: authors.name }).from(authors).orderBy(asc(authors.name)),
    db.select().from(user).orderBy(asc(user.name)),
    getHome(),
    db.select({ n: count() }).from(articles).where(eq(articles.status, 'published')),
    db
      .select({ n: count() })
      .from(articles)
      .where(and(eq(articles.status, 'published'), gte(articles.publishedAt, monthStart))),
    db.select({ n: count() }).from(subscribers),
    db.select({ n: sql<number>`coalesce(sum(${articles.reads}), 0)::int` }).from(articles),
  ])
  return {
    news,
    media: med.map(toMedia),
    comments: com.map((c) => ({ ...c, at: c.at.toISOString() })),
    sections: secs.map((s) => ({ id: s.id, name: s.name, slug: s.slug, inMenu: s.inMenu })),
    authors: auths,
    team: team.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, twoFactor: !!u.twoFactorEnabled })),
    home,
    stats: { published: pub.n, publishedMonth: pubMonth.n, subscribers: subs.n, reads: reads.n, pending: com.length },
  }
}

export async function getEditorPayload(id: string): Promise<EditorPayload | null> {
  const [a] = await db.select().from(articles).where(eq(articles.id, id))
  if (!a) return null
  return {
    id: a.id,
    title: a.title,
    lead: a.lead,
    sectionId: a.sectionId,
    authorId: a.authorId,
    tags: a.tags,
    slug: a.slug,
    seo: a.seoDescription,
    blocks: a.blocks,
    status: UI_STATUS[a.status],
    when: (a.publishAt ?? null)?.toISOString() ?? null,
    com: a.allowComments,
    news: a.inNewsletter,
    flash: a.breaking,
    createdBy: a.createdBy,
  }
}
