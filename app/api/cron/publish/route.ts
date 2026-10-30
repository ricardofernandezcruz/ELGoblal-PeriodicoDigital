import { and, eq, lte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { articles, auditLog } from '@/db/schema'

/* Publica las notas programadas cuya hora ya llegó. La llama Vercel Cron (o cualquier cron)
   con la cabecera Authorization: Bearer $CRON_SECRET.
   El sitio ya muestra esas notas a su hora aunque esto no se ejecute; aquí se cambia su estado
   y se regenera la portada. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new NextResponse('No autorizado', { status: 401 })

  const now = new Date()
  const due = await db
    .update(articles)
    .set({ status: 'published', publishedAt: now })
    .where(and(eq(articles.status, 'scheduled'), lte(articles.publishAt, now)))
    .returning({ id: articles.id, publishAt: articles.publishAt })

  if (due.length) {
    // La fecha visible es la programada, no la de ejecución del cron.
    for (const a of due) await db.update(articles).set({ publishedAt: a.publishAt }).where(eq(articles.id, a.id))
    await db.insert(auditLog).values({ action: 'article.autopublish', entity: 'article', data: { ids: due.map((a) => a.id) } })
    revalidatePath('/', 'layout')
  }
  return NextResponse.json({ published: due.length })
}
