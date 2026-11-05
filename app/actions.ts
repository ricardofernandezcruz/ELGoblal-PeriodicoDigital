'use server'

/* Acciones del sitio público (lectores). */
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { articles, comments, pollVotes, pushSubscriptions, subscribers, videos } from '@/db/schema'
import { sendConfirmation } from '@/lib/newsletter'
import { getLiveUpdateList, isArticleLive, searchCards, type Card, type LiveUpdate } from '@/lib/queries'

type Result = { ok: true; message: string } | { ok: false; error: string }

export async function subscribe(email: string, topics: string[] = []): Promise<Result> {
  const e = z.email().max(200).safeParse(email.trim().toLowerCase())
  if (!e.success) return { ok: false, error: email.trim() ? 'Escribe un correo válido, por ejemplo tu@correo.com' : 'Escribe tu correo para recibir el resumen' }
  const t = z.array(z.string().max(40)).max(10).catch([]).parse(topics)
  const [sub] = await db
    .insert(subscribers)
    .values({ email: e.data, topics: t })
    .onConflictDoUpdate({ target: subscribers.email, set: { topics: t, unsubscribedAt: null } })
    .returning()
  if (sub.confirmedAt) return { ok: true, message: 'Ya estabas suscrito: recibirás el resumen cada mañana.' }
  try {
    if (!(await sendConfirmation(sub))) return { ok: true, message: '¡Gracias! Te escribiremos para que confirmes la suscripción.' }
  } catch (err) {
    console.error('[boletin]', err)
    return { ok: false, error: 'No pudimos enviarte el correo de confirmación. Inténtalo de nuevo más tarde.' }
  }
  return { ok: true, message: 'Revisa tu correo y confirma la suscripción (mira también en spam).' }
}

const SPAM = /(https?:\/\/|www\.)|(\$\$\$)|(gana dinero|seguidores baratos|crypto|casino)/i

export async function addComment(input: { articleId: string; name: string; body: string; parentId?: string | null; website?: string }): Promise<Result> {
  // Campo trampa: los bots lo rellenan, las personas no lo ven.
  if (input.website) return { ok: true, message: 'Gracias. Tu comentario se publicará cuando lo revise la redacción.' }
  const d = z
    .object({
      articleId: z.uuid(),
      name: z.string().trim().min(2).max(60),
      body: z.string().trim().min(3).max(2000),
      parentId: z.uuid().nullable().optional(),
    })
    .safeParse(input)
  if (!d.success) return { ok: false, error: 'Escribe tu nombre y un comentario de al menos 3 caracteres.' }
  const [a] = await db.select({ allow: articles.allowComments }).from(articles).where(eq(articles.id, d.data.articleId))
  if (!a?.allow) return { ok: false, error: 'Los comentarios están cerrados en esta nota.' }
  await db.insert(comments).values({
    articleId: d.data.articleId,
    parentId: d.data.parentId ?? null,
    authorName: d.data.name,
    body: d.data.body,
    flaggedSpam: SPAM.test(d.data.body) || SPAM.test(d.data.name),
  })
  return { ok: true, message: 'Gracias. Tu comentario se publicará cuando lo revise la redacción.' }
}

export async function markHelpful(commentId: string): Promise<void> {
  const id = z.uuid().safeParse(commentId)
  if (!id.success) return
  await db.update(comments).set({ helpful: sql`${comments.helpful} + 1` }).where(eq(comments.id, id.data))
}

/** Cuenta una lectura (el navegador lo llama una vez por nota y sesión). */
export async function registerRead(articleId: string): Promise<void> {
  const id = z.uuid().safeParse(articleId)
  if (!id.success) return
  await db.update(articles).set({ reads: sql`${articles.reads} + 1` }).where(eq(articles.id, id.data))
}

export async function search(q: string): Promise<Card[]> {
  const t = q.trim().slice(0, 80)
  return t.length < 2 ? [] : searchCards(t)
}

/** Cuenta una reproducción de un video de la redacción (una por video y sesión). */
export async function registerVideoView(videoId: string): Promise<void> {
  const id = z.uuid().safeParse(videoId)
  if (!id.success) return
  await db.update(videos).set({ views: sql`${videos.views} + 1` }).where(eq(videos.id, id.data))
}

/* ---------- Cobertura en vivo ---------- */

/** Entradas publicadas después de `after` (la nota la consulta cada 30 s mientras está abierta). */
export async function getLiveUpdates(articleId: string, after: string): Promise<LiveUpdate[]> {
  const id = z.uuid().safeParse(articleId)
  const since = z.iso.datetime({ offset: true }).safeParse(after)
  if (!id.success || !since.success) return []
  const a = await isArticleLive(id.data)
  if (!a?.live) return []
  return getLiveUpdateList(id.data, new Date(since.data))
}

/* ---------- Encuestas ---------- */

export type PollResult = { counts: number[]; total: number; mine: number | null }

const pollInput = z.object({ articleId: z.uuid(), blockId: z.string().min(1).max(40), voter: z.string().regex(/^[\w-]{16,64}$/) })

async function pollCounts(articleId: string, blockId: string, size: number, voter: string): Promise<PollResult> {
  const rows = await db
    .select({ option: pollVotes.option, n: sql<number>`count(*)::int`, mine: sql<boolean>`bool_or(${pollVotes.voter} = ${voter})` })
    .from(pollVotes)
    .where(and(eq(pollVotes.articleId, articleId), eq(pollVotes.blockId, blockId)))
    .groupBy(pollVotes.option)
  const counts = Array.from({ length: size }, (_, i) => rows.find((r) => r.option === i)?.n ?? 0)
  return { counts, total: counts.reduce((a, b) => a + b, 0), mine: rows.find((r) => r.mine)?.option ?? null }
}

async function findPoll(articleId: string, blockId: string) {
  const a = await isArticleLive(articleId)
  const b = a?.blocks.find((x) => x.id === blockId)
  return b?.t === 'poll' ? b : null
}

/** Resultados de una encuesta (y el voto de este navegador, si votó). */
export async function getPoll(input: z.input<typeof pollInput>): Promise<PollResult | null> {
  const d = pollInput.safeParse(input)
  if (!d.success) return null
  const poll = await findPoll(d.data.articleId, d.data.blockId)
  return poll ? pollCounts(d.data.articleId, d.data.blockId, poll.opts.length, d.data.voter) : null
}

/** Un voto por navegador y encuesta: si ya votó, devuelve los resultados sin cambiar nada. */
export async function votePoll(input: z.input<typeof pollInput> & { option: number }): Promise<PollResult | null> {
  const d = pollInput.extend({ option: z.number().int().min(0).max(5) }).safeParse(input)
  if (!d.success) return null
  const poll = await findPoll(d.data.articleId, d.data.blockId)
  if (!poll || d.data.option >= poll.opts.length) return null
  await db.insert(pollVotes).values(d.data).onConflictDoNothing()
  return pollCounts(d.data.articleId, d.data.blockId, poll.opts.length, d.data.voter)
}

/* ---------- Avisos de última hora (Web Push) ---------- */

/* El servidor hará POST a esta dirección: solo se aceptan los servicios de push de los navegadores. */
const PUSH_HOSTS = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[\w-]+\.push\.apple\.com|[\w.-]+\.notify\.windows\.com)$/
const pushInput = z.object({
  endpoint: z
    .url()
    .max(1000)
    .refine((u) => {
      const url = new URL(u)
      return url.protocol === 'https:' && !url.port && PUSH_HOSTS.test(url.hostname)
    }),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
})

export async function savePushSubscription(sub: unknown): Promise<boolean> {
  const d = pushInput.safeParse(sub)
  if (!d.success) return false
  await db
    .insert(pushSubscriptions)
    .values({ endpoint: d.data.endpoint, p256dh: d.data.keys.p256dh, auth: d.data.keys.auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { p256dh: d.data.keys.p256dh, auth: d.data.keys.auth } })
  return true
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  if (typeof endpoint === 'string' && endpoint.length < 1000) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
}
