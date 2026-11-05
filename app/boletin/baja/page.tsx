import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { subscribers } from '@/db/schema'
import { readToken } from '@/lib/newsletter'
import { Notice } from '../notice'

export const metadata: Metadata = { title: 'Darse de baja · El Global', robots: { index: false } }

/* La baja se confirma con un botón (POST): algunos antivirus de correo abren los enlaces solos
   y, con un simple GET, darían de baja a la gente sin que lo pidiera. */
async function unsubscribe(form: FormData) {
  'use server'
  const t = String(form.get('t') ?? '')
  const id = readToken('baja', t)
  if (id) await db.update(subscribers).set({ unsubscribedAt: new Date() }).where(eq(subscribers.id, id))
  redirect('/boletin/baja?t=' + encodeURIComponent(t))
}

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const t = (await searchParams).t ?? ''
  const id = readToken('baja', t)
  if (!id) return <Notice title="Este enlace no es válido">Usa el enlace «Darte de baja» que aparece al final de cualquier boletín.</Notice>
  const [sub] = await db.select({ email: subscribers.email, out: subscribers.unsubscribedAt }).from(subscribers).where(eq(subscribers.id, id))
  if (!sub || sub.out) return <Notice title="Ya no recibes el boletín">Si cambias de opinión, puedes volver a suscribirte desde la portada.</Notice>
  return (
    <Notice title="¿Dejar de recibir el boletín?">
      <p className="m-0">
        No volveremos a escribir a <b className="text-eg-ink">{sub.email}</b>.
      </p>
      <form action={unsubscribe} className="mt-6">
        <input type="hidden" name="t" value={t} />
        <button className="min-h-11 rounded border border-eg-rule bg-transparent px-5 font-sans text-[15px] font-semibold text-eg-ink hover:bg-eg-surface">
          Sí, darme de baja
        </button>
      </form>
    </Notice>
  )
}
