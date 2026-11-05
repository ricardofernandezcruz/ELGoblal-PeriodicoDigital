import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { subscribers } from '@/db/schema'
import { readToken } from '@/lib/newsletter'

/** Baja en un clic (cabecera List-Unsubscribe-Post): el botón «Cancelar suscripción» de Gmail y Yahoo llama aquí. */
export async function POST(req: Request) {
  const id = readToken('baja', new URL(req.url).searchParams.get('t'))
  if (!id) return new Response('Enlace no válido', { status: 400 })
  await db.update(subscribers).set({ unsubscribedAt: new Date() }).where(eq(subscribers.id, id))
  return new Response('Baja confirmada')
}
