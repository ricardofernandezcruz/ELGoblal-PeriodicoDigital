/** URL pública del sitio, para enlaces en correos y en el cron.
    SITE_URL (dominio propio) → producción de Vercel → despliegue actual → local. */
export function siteUrl(): string {
  const v = (h?: string) => (h ? `https://${h}` : undefined)
  return (
    process.env.SITE_URL?.trim().replace(/\/$/, '') ||
    (process.env.VERCEL_ENV === 'production' ? v(process.env.VERCEL_PROJECT_PRODUCTION_URL) : v(process.env.VERCEL_BRANCH_URL) ?? v(process.env.VERCEL_URL)) ||
    'http://localhost:3000'
  )
}
