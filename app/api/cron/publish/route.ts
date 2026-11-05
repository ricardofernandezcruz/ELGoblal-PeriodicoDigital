import { and, eq, isNotNull, lte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { articles, auditLog, media, videos } from '@/db/schema'
import { sendDailyDigest, sendPendingConfirmations } from '@/lib/newsletter'
import { deleteObject } from '@/lib/storage'

/* Publica las notas programadas cuya hora ya llegó. La llama Vercel Cron (o cualquier cron)
   con la cabecera Authorization: Bearer $CRON_SECRET.
   El sitio ya muestra esas notas a su hora aunque esto no se ejecute; aquí se cambia su estado
   y se regenera la portada.
   También envía el boletín del día (vercel.json: 10:00 UTC = 6:00 en Santo Domingo) y vacía la papelera:
   imágenes y videos con más de 30 días en ella se borran del almacenamiento. */
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
  // Un fallo del correo no debe impedir el resto de tareas.
  const newsletter = await sendDailyDigest().catch((e) => {
    console.error('[boletin]', e)
    return { sent: 0, skipped: 'error: ' + (e instanceof Error ? e.message : 'desconocido') }
  })
  const confirmations = await sendPendingConfirmations().catch((e) => (console.error('[boletin]', e), 0))
  const purged = await emptyTrash(new Date(now.getTime() - 30 * 864e5))
  return NextResponse.json({ published: due.length, newsletter, confirmations, purged })
}

async function emptyTrash(before: Date) {
  let n = 0
  const oldMedia = await db.select({ id: media.id, key: media.key }).from(media).where(and(isNotNull(media.deletedAt), lte(media.deletedAt, before))).limit(200)
  for (const m of oldMedia) {
    // Si el almacenamiento falla, se reintenta al día siguiente.
    if (!(await deleteObject(m.key))) continue
    await db.delete(media).where(eq(media.id, m.id))
    n++
  }
  const oldVideos = await db.select({ id: videos.id, fileUrl: videos.fileUrl }).from(videos).where(and(isNotNull(videos.deletedAt), lte(videos.deletedAt, before))).limit(200)
  for (const v of oldVideos) {
    if (v.fileUrl && !(await deleteObject(v.fileUrl))) continue
    await db.delete(videos).where(eq(videos.id, v.id))
    n++
  }
  if (n) await db.insert(auditLog).values({ action: 'trash.purge', entity: 'media', data: { media: oldMedia.length, videos: oldVideos.length } })
  return n
}
