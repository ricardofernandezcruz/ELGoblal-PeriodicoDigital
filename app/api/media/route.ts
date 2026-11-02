import { NextResponse } from 'next/server'
import { db } from '@/db'
import { media } from '@/db/schema'
import { toMedia } from '@/lib/newsroom'
import { can } from '@/lib/permissions'
import { getUser } from '@/lib/session'
import { putObject, StorageError } from '@/lib/storage'

const MAX = 3 * 1024 * 1024

/** Tipo real según los primeros bytes; no se confía en la extensión ni en el tipo declarado. */
function sniff(b: Uint8Array): { ext: string; mime: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' }
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', mime: 'image/png' }
  if (String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return { ext: 'webp', mime: 'image/webp' }
  if (String.fromCharCode(...b.slice(0, 4)) === 'GIF8') return { ext: 'gif', mime: 'image/gif' }
  return null
}

export async function POST(req: Request) {
  const u = await getUser()
  if (!u || !can(u.role, 'article.create')) return NextResponse.json({ error: 'Inicia sesión para subir imágenes.' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No llegó ninguna imagen.' }, { status: 400 })
  if (file.size > MAX) return NextResponse.json({ error: 'La imagen pesa más de 3 MB. Reduce su tamaño antes de subirla.' }, { status: 413 })

  const buf = await file.arrayBuffer()
  const kind = sniff(new Uint8Array(buf.slice(0, 12)))
  if (!kind) return NextResponse.json({ error: 'Formato no admitido. Usa JPG, PNG, WebP o GIF.' }, { status: 415 })

  const d = new Date()
  const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${kind.ext}`
  try {
    const url = await putObject(key, buf, kind.mime)
    const name = file.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Imagen'
    const [row] = await db.insert(media).values({ key: url, name, mime: kind.mime, bytes: file.size, createdBy: u.id }).returning()
    return NextResponse.json(toMedia(row))
  } catch (e) {
    console.error('[media]', e)
    if (e instanceof StorageError) return NextResponse.json({ error: e.message }, { status: 502 })
    return NextResponse.json({ error: 'La imagen se subió, pero no se pudo registrar en la biblioteca. Inténtalo de nuevo.' }, { status: 500 })
  }
}
