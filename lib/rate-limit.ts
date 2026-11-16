import 'server-only'
import { createHmac } from 'node:crypto'
import { lt, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { db } from '@/db'
import { rateLimits } from '@/db/schema'

/* Límite de usos por IP para las acciones públicas: frena a los bots que inflan votos o lecturas
   y a quien quiera usar el formulario del boletín para mandar correos a terceros.
   La IP no se guarda tal cual: se guarda cifrada (HMAC), así no queda un registro de visitantes. */

export type Bucket = { name: string; max: number; windowSec: number }

export const LIMITS = {
  comment: { name: 'comment', max: 5, windowSec: 600 },
  subscribe: { name: 'subscribe', max: 5, windowSec: 3600 },
  vote: { name: 'vote', max: 40, windowSec: 600 },
  search: { name: 'search', max: 40, windowSec: 60 },
  counter: { name: 'counter', max: 120, windowSec: 600 },
  live: { name: 'live', max: 120, windowSec: 600 },
  push: { name: 'push', max: 10, windowSec: 3600 },
} satisfies Record<string, Bucket>

async function clientIp() {
  const h = await headers()
  // En Vercel, x-vercel-forwarded-for y x-real-ip los pone la propia plataforma (no el visitante).
  return h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}

const secret = () => process.env.BETTER_AUTH_SECRET || 'dev'

/** true si la acción puede seguir; false si esta IP superó el límite en la ventana actual. */
export async function allow(b: Bucket): Promise<boolean> {
  const ip = await clientIp()
  const key = b.name + ':' + createHmac('sha256', secret()).update(ip).digest('base64url').slice(0, 22)
  const reset = new Date(Date.now() + b.windowSec * 1000)
  try {
    // Una sola consulta: crea el contador, lo suma o lo reinicia si la ventana ya pasó.
    const [r] = await db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt: reset })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`case when ${rateLimits.resetAt} < now() then 1 else ${rateLimits.count} + 1 end`,
          resetAt: sql`case when ${rateLimits.resetAt} < now() then ${reset.toISOString()}::timestamptz else ${rateLimits.resetAt} end`,
        },
      })
      .returning({ count: rateLimits.count })
    return r.count <= b.max
  } catch (e) {
    // Si el contador falla, mejor dejar pasar que bloquear a un lector real.
    console.error('[rate-limit]', e)
    return true
  }
}

/** Borra contadores vencidos (lo llama el cron diario). */
export const cleanRateLimits = () => db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date()))
