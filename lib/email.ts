import 'server-only'

/* Envío de correos con Resend (API HTTP, sin SDK).
   Variables: RESEND_API_KEY y EMAIL_FROM ("El Global <boletin@tudominio.com>", de un dominio verificado en Resend).
   Sin RESEND_API_KEY: en desarrollo el correo se muestra en la consola; en producción no se envía. */

export type Email = {
  to: string
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
}

export class EmailError extends Error {}

const key = () => process.env.RESEND_API_KEY?.trim() || undefined
const from = () => process.env.EMAIL_FROM?.trim() || 'El Global <onboarding@resend.dev>'

export const emailReady = () => !!key()

async function resend(path: string, body: unknown) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  }).catch(() => null)
  if (!res) throw new EmailError('No se pudo conectar con el servicio de correo.')
  if (res.status === 401 || res.status === 403) throw new EmailError('Resend rechazó la clave. Revisa RESEND_API_KEY y que el dominio de EMAIL_FROM esté verificado.')
  if (res.status === 422) throw new EmailError('Resend no aceptó el correo: ' + ((await res.json().catch(() => null))?.message ?? 'datos no válidos') + '.')
  if (res.status === 429) throw new EmailError('Se superó el límite de envíos de Resend. Inténtalo más tarde.')
  if (!res.ok) throw new EmailError(`El servicio de correo respondió con un error (${res.status}).`)
  return res.json()
}

const toResend = (e: Email) => ({ from: from(), to: [e.to], subject: e.subject, html: e.html, text: e.text, headers: e.headers })

function logInDev(e: Email) {
  if (process.env.NODE_ENV === 'production') throw new EmailError('El correo no está configurado: falta RESEND_API_KEY en Vercel.')
  console.info(`\n[correo de prueba] Para: ${e.to}\nAsunto: ${e.subject}\n${e.text}\n`)
}

export async function sendEmail(e: Email): Promise<void> {
  if (!key()) return logInDev(e)
  await resend('/emails', toResend(e))
}

/** Envío por lotes (Resend admite 100 por petición). Devuelve cuántos se enviaron. */
export async function sendBatch(list: Email[]): Promise<number> {
  if (!key()) {
    list.slice(0, 2).forEach(logInDev)
    return list.length
  }
  let sent = 0
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100)
    await resend('/emails/batch', chunk.map(toResend))
    sent += chunk.length
  }
  return sent
}

/** Escapa texto para meterlo en HTML. */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Plantilla común: cabecera con la marca, contenido y pie. Tablas y estilos en línea, para que se vea bien en Gmail y Outlook. */
export function layout({ preheader, body, footer }: { preheader: string; body: string; footer: string }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><title>El Global</title></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif;color:#14181f">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e4dfd3">
<tr><td align="center" style="padding:28px 24px 18px;border-bottom:3px double #14181f">
<div style="font-size:40px;line-height:1;font-weight:600;letter-spacing:-.02em">El Global</div>
<div style="margin-top:8px;font:500 10px/1 Arial,Helvetica,sans-serif;letter-spacing:.24em;color:#6b6f76;text-transform:uppercase">El mundo en una sola mirada</div>
</td></tr>
<tr><td style="padding:24px">${body}</td></tr>
<tr><td style="padding:18px 24px;border-top:1px solid #e4dfd3;font:12px/1.5 Arial,Helvetica,sans-serif;color:#6b6f76">${footer}</td></tr>
</table></td></tr></table></body></html>`
}

export const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:#b3261e;color:#ffffff;text-decoration:none;font:600 15px/1 Arial,Helvetica,sans-serif;padding:14px 22px;border-radius:6px">${esc(label)}</a>`
