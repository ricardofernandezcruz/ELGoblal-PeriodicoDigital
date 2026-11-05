import { can } from '@/lib/permissions'
import { getUser } from '@/lib/session'
import { buildDigest, digestEmail } from '@/lib/newsletter'

/** Cómo queda hoy el boletín (solo para la redacción). */
export async function GET() {
  const u = await getUser()
  if (!u || !can(u.role, 'home.manage')) return new Response('No autorizado', { status: 401 })
  const d = await buildDigest()
  if (!d) return new Response('No hay notas publicadas en las últimas 24 horas: hoy no se enviaría boletín.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  const { html } = digestEmail(d, { id: '00000000-0000-0000-0000-000000000000', email: u.email })
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}
