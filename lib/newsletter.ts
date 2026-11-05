import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { settings, subscribers } from '@/db/schema'
import { button, emailReady, esc, layout, sendBatch, sendEmail, type Email } from './email'
import { getDigestCards, type Card } from './queries'
import { formatDate, SITE_TZ } from './site'
import { siteUrl } from './site-url'

/* Boletín diario:
   - Suscripción con doble confirmación (el lector confirma desde su correo).
   - Cada mañana, con el cron, las notas de las últimas 24 h a quien confirmó.
   - Cada correo lleva su enlace de baja firmado y la baja en un clic que piden Gmail y Yahoo. */

/* ---------- Enlaces firmados (sin guardar tokens en la base de datos) ---------- */

type Purpose = 'confirmar' | 'baja'
const secret = () => process.env.NEWSLETTER_SECRET || process.env.BETTER_AUTH_SECRET || 'dev'
const mac = (purpose: Purpose, id: string) => createHmac('sha256', secret()).update(`${purpose}:${id}`).digest('base64url').slice(0, 32)

export const signToken = (purpose: Purpose, id: string) => `${id}.${mac(purpose, id)}`

/** Devuelve el id del suscriptor si la firma es válida. */
export function readToken(purpose: Purpose, token: string | undefined | null): string | null {
  const [id, sig] = (token ?? '').split('.')
  if (!id || !sig || !/^[0-9a-f-]{36}$/.test(id)) return null
  const want = Buffer.from(mac(purpose, id))
  const got = Buffer.from(sig)
  return want.length === got.length && timingSafeEqual(want, got) ? id : null
}

const link = (path: string, purpose: Purpose, id: string) => `${siteUrl()}${path}?t=${encodeURIComponent(signToken(purpose, id))}`

/* ---------- Confirmación ---------- */

export function confirmationEmail(sub: { id: string; email: string }): Email {
  const url = link('/boletin/confirmar', 'confirmar', sub.id)
  return {
    to: sub.email,
    subject: 'Confirma tu suscripción a El Global',
    text: `Confirma que quieres recibir el resumen diario de El Global:\n${url}\n\nSi no te suscribiste tú, ignora este correo y no te escribiremos más.`,
    html: layout({
      preheader: 'Un clic y mañana recibes tu primer resumen',
      body: `<p style="margin:0 0 14px;font-size:22px;line-height:1.25">Un paso más</p>
<p style="margin:0 0 22px;font-size:16px;line-height:1.55">Confirma que quieres recibir cada mañana lo más importante del día, en cinco minutos de lectura.</p>
<p style="margin:0 0 8px">${button(url, 'Sí, quiero recibirlo')}</p>`,
      footer: 'Si no te suscribiste tú, ignora este correo: no te escribiremos más.',
    }),
  }
}

/** En producción sin Resend no se envía nada: los suscriptores esperan a que se configure. */
const canSend = () => emailReady() || process.env.NODE_ENV !== 'production'

/** Envía la confirmación, como mucho una por hora y dirección. Devuelve false si el correo aún no está configurado. */
export async function sendConfirmation(sub: { id: string; email: string; confirmSentAt: Date | null }): Promise<boolean> {
  if (!canSend()) return false
  if (sub.confirmSentAt && Date.now() - +sub.confirmSentAt < 36e5) return true
  await sendEmail(confirmationEmail(sub))
  await db.update(subscribers).set({ confirmSentAt: new Date() }).where(eq(subscribers.id, sub.id))
  return true
}

/** Quienes se suscribieron antes de configurar el correo reciben su confirmación (lo llama el cron). */
export async function sendPendingConfirmations(): Promise<number> {
  if (!emailReady()) return 0
  const list = await db
    .select({ id: subscribers.id, email: subscribers.email })
    .from(subscribers)
    .where(and(isNull(subscribers.confirmedAt), isNull(subscribers.confirmSentAt), isNull(subscribers.unsubscribedAt)))
    .limit(90)
  if (!list.length) return 0
  const n = await sendBatch(list.map(confirmationEmail))
  await db.update(subscribers).set({ confirmSentAt: new Date() }).where(inArray(subscribers.id, list.map((s) => s.id)))
  return n
}

/* ---------- Resumen diario ---------- */

const absolute = (href: string) => (href.startsWith('http') ? href : siteUrl() + href)

function storyHtml(c: Card, i: number) {
  const img = c.img?.startsWith('http')
    ? `<a href="${esc(absolute(c.href))}"><img src="${esc(c.img)}" alt="${esc(c.alt)}" width="552" style="display:block;width:100%;height:auto;max-height:340px;object-fit:cover;border:0;margin:0 0 14px"></a>`
    : ''
  return `<tr><td style="padding:${i ? '22px' : '0'} 0 22px;${i ? 'border-top:1px solid #e4dfd3' : ''}">
${i === 0 ? img : ''}
<div style="font:700 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.12em;color:#b3261e;text-transform:uppercase;margin:0 0 8px">${esc(c.sec)}</div>
<a href="${esc(absolute(c.href))}" style="color:#14181f;text-decoration:none"><div style="font-size:${i ? 20 : 27}px;line-height:1.18;font-weight:600;margin:0 0 8px">${esc(c.title)}</div></a>
${c.lead ? `<div style="font-size:16px;line-height:1.5;color:#3d424a">${esc(c.lead)}</div>` : ''}
</td></tr>`
}

export type Digest = { date: string; stories: Card[] }

/** Notas de las últimas 24 h. null si no hay nada que enviar. */
export async function buildDigest(): Promise<Digest | null> {
  const stories = await getDigestCards(new Date(Date.now() - 864e5), 8)
  return stories.length ? { date: formatDate(new Date()), stories } : null
}

export function digestEmail(d: Digest, sub: { id: string; email: string }): Email {
  const unsub = link('/boletin/baja', 'baja', sub.id)
  const oneClick = `${siteUrl()}/api/boletin/baja?t=${encodeURIComponent(signToken('baja', sub.id))}`
  const [top, ...rest] = d.stories
  return {
    to: sub.email,
    subject: `${top.title}${rest.length ? ' y más' : ''} · El Global, ${d.date}`,
    headers: { 'List-Unsubscribe': `<${oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    text: [`El Global · ${d.date}`, '', ...d.stories.map((c) => `${c.sec.toUpperCase()}\n${c.title}\n${absolute(c.href)}\n`), `Darte de baja: ${unsub}`].join('\n'),
    html: layout({
      preheader: rest.length ? `También: ${rest.slice(0, 2).map((c) => c.title).join(' · ')}` : top.lead,
      body: `<div style="font:600 12px/1 Arial,Helvetica,sans-serif;color:#6b6f76;margin:0 0 18px">${esc(d.date)} · Lo más importante del día</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${d.stories.map(storyHtml).join('')}</table>
<p style="margin:8px 0 0">${button(siteUrl(), 'Leer El Global')}</p>`,
      footer: `Recibes este correo porque te suscribiste al resumen diario de El Global. <a href="${esc(unsub)}" style="color:#6b6f76">Darte de baja</a>.`,
    }),
  }
}

/** Fecha de hoy en la hora del periódico, para no enviar dos veces el mismo día. */
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TZ }).format(new Date())

/** Envía el resumen de hoy a todos los suscriptores confirmados (una vez al día). */
export async function sendDailyDigest(): Promise<{ sent: number; skipped?: string }> {
  if (!canSend()) return { sent: 0, skipped: 'correo sin configurar (RESEND_API_KEY)' }
  const [state] = await db.select().from(settings).where(eq(settings.key, 'newsletter'))
  if ((state?.value as { lastSent?: string } | undefined)?.lastSent === today()) return { sent: 0, skipped: 'ya enviado hoy' }
  const d = await buildDigest()
  if (!d) return { sent: 0, skipped: 'sin notas nuevas' }
  const list = await db
    .select({ id: subscribers.id, email: subscribers.email })
    .from(subscribers)
    .where(and(isNotNull(subscribers.confirmedAt), isNull(subscribers.unsubscribedAt)))
  // Se marca antes de enviar: si algo falla a mitad, mejor perder un envío que repetirlo.
  await db
    .insert(settings)
    .values({ key: 'newsletter', value: { lastSent: today() } })
    .onConflictDoUpdate({ target: settings.key, set: { value: { lastSent: today() } } })
  const sent = await sendBatch(list.map((s) => digestEmail(d, s)))
  return { sent }
}
