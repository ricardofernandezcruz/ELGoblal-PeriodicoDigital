import 'server-only'
import { inArray, sql } from 'drizzle-orm'
import webpush from 'web-push'
import { db } from '@/db'
import { pushSubscriptions } from '@/db/schema'

/* Avisos de última hora con Web Push. Claves: VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY
   (se generan una vez; si cambian, los lectores tienen que volver a activar los avisos). */

export class PushError extends Error {}

const keys = () => {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const priv = process.env.VAPID_PRIVATE_KEY?.trim()
  return pub && priv ? { pub, priv, subject: process.env.VAPID_SUBJECT?.trim() || 'mailto:redaccion@elglobal.com' } : null
}

export const pushReady = () => !!keys()

export async function pushCount() {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(pushSubscriptions)
  return r.n
}

/** Envía el aviso a todos los navegadores suscritos. Borra los que ya no existen (el lector quitó el permiso). */
export async function sendPush(msg: { title: string; body: string; url: string }): Promise<{ sent: number; removed: number }> {
  const k = keys()
  if (!k) throw new PushError('Faltan las claves VAPID en Vercel (NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY).')
  webpush.setVapidDetails(k.subject, k.pub, k.priv)
  const subs = await db.select().from(pushSubscriptions)
  const payload = JSON.stringify(msg)
  const gone: string[] = []
  let sent = 0
  // De 50 en 50 para no abrir cientos de conexiones a la vez.
  for (let i = 0; i < subs.length; i += 50) {
    const res = await Promise.allSettled(
      subs.slice(i, i + 50).map((s) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 6, urgency: 'high', timeout: 10_000 }),
      ),
    )
    res.forEach((r, j) => {
      if (r.status === 'fulfilled') sent++
      else if ([404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0)) gone.push(subs[i + j].id)
    })
  }
  if (gone.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone))
  return { sent, removed: gone.length }
}
