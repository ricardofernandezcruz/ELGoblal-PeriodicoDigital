'use server'

/* Acciones del sitio público (lectores). */
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { articles, comments, subscribers } from '@/db/schema'
import { searchCards, type Card } from '@/lib/queries'

type Result = { ok: true; message: string } | { ok: false; error: string }

export async function subscribe(email: string, topics: string[] = []): Promise<Result> {
  const e = z.email().max(200).safeParse(email.trim().toLowerCase())
  if (!e.success) return { ok: false, error: email.trim() ? 'Escribe un correo válido, por ejemplo tu@correo.com' : 'Escribe tu correo para recibir el resumen' }
  const t = z.array(z.string().max(40)).max(10).catch([]).parse(topics)
  await db
    .insert(subscribers)
    .values({ email: e.data, topics: t })
    .onConflictDoUpdate({ target: subscribers.email, set: { topics: t, unsubscribedAt: null } })
  return { ok: true, message: 'Listo: recibirás el resumen mañana a primera hora.' }
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
