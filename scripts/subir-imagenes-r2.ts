/* Sube a Cloudflare R2 las imágenes guardadas en local (public/uploads) y actualiza
   sus direcciones en la biblioteca y dentro de las notas. Se puede repetir sin duplicar.
   Uso: pnpm media:r2   (necesita las variables R2_* en .env.local) */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { AwsClient } from 'aws4fetch'
import { eq, like } from 'drizzle-orm'
import { db } from '../db/index'
import { articles, media, type ArticleBlock } from '../db/schema'

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
  console.error('Faltan variables R2_* en .env.local (ver .env.example).')
  process.exit(1)
}
const client = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' })
const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`
const publicUrl = R2_PUBLIC_URL.replace(/\/$/, '')

async function main() {
  const local = await db.select().from(media).where(like(media.key, '/uploads/%'))
  if (!local.length) return console.log('No hay imágenes locales pendientes.')
  const moved = new Map<string, string>()

  for (const m of local) {
    const key = m.key.replace(/^\/uploads\//, '')
    const body = await readFile(path.join(process.cwd(), 'public', m.key))
    const res = await client.fetch(`${endpoint}/${key}`, {
      method: 'PUT',
      body,
      headers: { 'Content-Type': m.mime ?? 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
    if (!res.ok) throw new Error(`R2 respondió ${res.status} al subir ${m.name}`)
    const url = `${publicUrl}/${key}`
    await db.update(media).set({ key: url }).where(eq(media.id, m.id))
    moved.set(m.key, url)
    console.log('✓', m.name)
  }

  // Las notas guardan la dirección de cada imagen dentro de sus bloques
  for (const a of await db.select({ id: articles.id, blocks: articles.blocks }).from(articles)) {
    let changed = false
    const blocks = a.blocks.map((b): ArticleBlock => {
      if (b.t === 'img' && moved.has(b.src)) {
        changed = true
        return { ...b, src: moved.get(b.src)! }
      }
      return b
    })
    if (changed) await db.update(articles).set({ blocks }).where(eq(articles.id, a.id))
  }
  console.log(`Listo: ${moved.size} imágenes en R2.`)
}

main().then(
  () => process.exit(0),
  (e) => (console.error(e), process.exit(1)),
)
