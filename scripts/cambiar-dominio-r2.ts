/* Cambia la dirección pública de las imágenes y videos de R2 (por ejemplo, de https://pub-xxxx.r2.dev
   a https://media.tudominio.com) en todo lo guardado: biblioteca, notas y sus versiones, fotos de
   perfil y videos. Los archivos no se mueven: son los mismos, servidos desde otro dominio.

   Uso:
     pnpm media:dominio https://pub-xxxx.r2.dev https://media.tudominio.com            (solo cuenta)
     pnpm media:dominio https://pub-xxxx.r2.dev https://media.tudominio.com --aplicar  (cambia)

   Antes de aplicar: conecta el dominio al bucket (Cloudflare → R2 → bucket → Settings → Custom Domains)
   y comprueba que una imagen abre con la dirección nueva. Después: cambia R2_PUBLIC_URL en Vercel. */
import { sql } from 'drizzle-orm'
import { db } from '../db/index'

const [from, to] = process.argv.slice(2, 4).map((u) => u?.replace(/\/$/, ''))
const apply = process.argv.includes('--aplicar')
if (!from || !to || !/^https:\/\/[^/\s'"\\]+$/.test(from) || !/^https:\/\/[^/\s'"\\]+$/.test(to)) {
  console.error('Uso: pnpm media:dominio https://dominio-viejo https://dominio-nuevo [--aplicar]')
  process.exit(1)
}
const prefix = from + '/'

// Columnas de texto que guardan la URL al principio y columnas JSON que la llevan dentro.
const textCols = [
  ['media', 'key'],
  ['user', 'image'],
  ['videos', 'file_url'],
] as const
const jsonCols = [
  ['articles', 'blocks'],
  ['article_versions', 'snapshot'],
] as const

async function main() {
  console.log(`${apply ? 'Cambiando' : 'Contando (sin cambiar nada)'}: ${from} → ${to}\n`)
  for (const [t, c] of textCols) {
    const q = apply
      ? sql`update ${sql.identifier(t)} set ${sql.identifier(c)} = ${to + '/'} || substr(${sql.identifier(c)}, ${prefix.length + 1}) where ${sql.identifier(c)} like ${prefix + '%'}`
      : sql`select count(*)::int as n from ${sql.identifier(t)} where ${sql.identifier(c)} like ${prefix + '%'}`
    const r = await db.execute<{ n: number }>(q)
    console.log(`${t}.${c}: ${apply ? r.rowCount : r.rows[0].n}`)
  }
  for (const [t, c] of jsonCols) {
    const q = apply
      ? sql`update ${sql.identifier(t)} set ${sql.identifier(c)} = replace(${sql.identifier(c)}::text, ${prefix}, ${to + '/'})::jsonb where strpos(${sql.identifier(c)}::text, ${prefix}) > 0`
      : sql`select count(*)::int as n from ${sql.identifier(t)} where strpos(${sql.identifier(c)}::text, ${prefix}) > 0`
    const r = await db.execute<{ n: number }>(q)
    console.log(`${t}.${c}: ${apply ? r.rowCount : r.rows[0].n}`)
  }
  console.log(apply ? '\nListo. Ahora cambia R2_PUBLIC_URL en Vercel y en .env.local y vuelve a desplegar.' : '\nPara aplicar los cambios, repite el comando con --aplicar.')
}

main().then(() => process.exit(0), (e) => (console.error(e), process.exit(1)))
