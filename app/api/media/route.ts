import { NextResponse } from 'next/server'
import { db } from '@/db'
import { media } from '@/db/schema'
import { toMedia } from '@/lib/newsroom'
import { can } from '@/lib/permissions'
import { getUser } from '@/lib/session'
import { imageKey, MAX_IMAGE, sniffImage } from '@/lib/image'
import { putObject, StorageError } from '@/lib/storage'

export async function POST(req: Request) {
  const u = await getUser()
  if (!u || !can(u.role, 'article.create')) return NextResponse.json({ error: 'Inicia sesión para subir imágenes.' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No llegó ninguna imagen.' }, { status: 400 })
  if (file.size > MAX_IMAGE) return NextResponse.json({ error: 'La imagen pesa más de 3 MB después de optimizarla. Prueba con otra.' }, { status: 413 })

  const buf = await file.arrayBuffer()
  const kind = sniffImage(new Uint8Array(buf.slice(0, 12)))
  if (!kind) return NextResponse.json({ error: 'Formato no admitido. Usa JPG, PNG, WebP o GIF.' }, { status: 415 })

  const key = imageKey(kind.ext)
  try {
    const url = await putObject(key, buf, kind.mime)
    const name = file.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Imagen'
    const dim = (k: string) => {
      const n = Number(form?.get(k))
      return Number.isInteger(n) && n > 0 && n <= 20000 ? n : null
    }
    const [row] = await db
      .insert(media)
      .values({ key: url, name, mime: kind.mime, bytes: file.size, width: dim('width'), height: dim('height'), createdBy: u.id })
      .returning()
    return NextResponse.json(toMedia(row))
  } catch (e) {
    console.error('[media]', e)
    if (e instanceof StorageError) return NextResponse.json({ error: e.message }, { status: 502 })
    return NextResponse.json({ error: 'La imagen se subió, pero no se pudo registrar en la biblioteca. Inténtalo de nuevo.' }, { status: 500 })
  }
}
