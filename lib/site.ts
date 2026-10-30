/* Ajustes del sitio público. */
export const SITE_NAME = 'El Global'
/** Zona horaria con la que se muestran las fechas (igual en servidor y navegador). */
export const SITE_TZ = 'America/Santo_Domingo'

export const formatDate = (d: string | Date, withTime = false) =>
  new Date(d).toLocaleString('es-DO', {
    timeZone: SITE_TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })

export const formatTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString('es-DO', { timeZone: SITE_TZ, hour: '2-digit', minute: '2-digit' })

export function timeAgo(d: string | Date, now = Date.now()) {
  const m = Math.round((now - +new Date(d)) / 60000)
  if (m < 1) return 'Ahora'
  if (m < 60) return `Hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `Hace ${h} h`
  return formatDate(d)
}
