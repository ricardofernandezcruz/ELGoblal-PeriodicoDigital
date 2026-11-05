import type { Metadata } from 'next'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { subscribers } from '@/db/schema'
import { readToken } from '@/lib/newsletter'
import { Notice } from '../notice'

export const metadata: Metadata = { title: 'Suscripción · El Global', robots: { index: false } }

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const id = readToken('confirmar', (await searchParams).t)
  if (!id) return <Notice title="Este enlace no es válido">Copia el enlace completo del correo o vuelve a suscribirte desde la portada.</Notice>
  const [sub] = await db
    .update(subscribers)
    .set({ confirmedAt: new Date(), unsubscribedAt: null })
    .where(and(eq(subscribers.id, id), isNull(subscribers.confirmedAt)))
    .returning({ email: subscribers.email })
  return (
    <Notice title={sub ? '¡Suscripción confirmada!' : 'Ya estabas suscrito'}>
      Mañana a primera hora te llegará el resumen del día{sub ? <> a <b className="text-eg-ink">{sub.email}</b></> : ''}. Puedes darte de baja cuando quieras desde
      cualquier correo.
    </Notice>
  )
}
