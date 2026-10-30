import { NextResponse } from 'next/server'
import { z } from 'zod'
import { can } from '@/lib/permissions'
import { getUser } from '@/lib/session'
import { presignUpload } from '@/lib/storage'

/* Subida de archivos de video. El navegador pide un destino (POST) y sube el archivo
   directamente a él (PUT): a R2 con un enlace firmado o, en desarrollo, a esta misma ruta. */

const MAX = 500 * 1024 * 1024
const TYPES: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' }
const KEY = /^videos\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(mp4|webm|mov)$/

async function allowed() {
  const u = await getUser()
  return !!u && can(u.role, 'article.create')
}

export async function POST(req: Request) {
  if (!(await allowed())) return NextResponse.json({ error: 'Inicia sesión para subir videos.' }, { status: 401 })
  const d = z.object({ type: z.string(), size: z.number().int().positive() }).safeParse(await req.json().catch(() => null))
  if (!d.success) return NextResponse.json({ error: 'Petición no válida.' }, { status: 400 })
  const ext = TYPES[d.data.type]
  if (!ext) return NextResponse.json({ error: 'Formato no admitido. Usa MP4, WebM o MOV.' }, { status: 415 })
  if (d.data.size > MAX) return NextResponse.json({ error: 'El video pesa más de 500 MB. Comprímelo o súbelo a YouTube y pega el enlace.' }, { status: 413 })

  const now = new Date()
  const key = `videos/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${ext}`
  const r2 = await presignUpload(key)
  if (r2) return NextResponse.json(r2)
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Falta configurar Cloudflare R2.' }, { status: 503 })
  return NextResponse.json({ uploadUrl: `/api/video-upload?key=${encodeURIComponent(key)}`, publicUrl: `/uploads/${key}` })
}

/** Solo en desarrollo: guarda el archivo en public/uploads. */
export async function PUT(req: Request) {
  if (process.env.NODE_ENV === 'production') return new NextResponse('No disponible', { status: 404 })
  if (!(await allowed())) return new NextResponse('No autorizado', { status: 401 })
  const key = new URL(req.url).searchParams.get('key') ?? ''
  if (!KEY.test(key) || !req.body) return new NextResponse('Destino no válido', { status: 400 })
  const { mkdir, writeFile } = await import('node:fs/promises')
  const path = await import('node:path')
  const file = path.join(process.cwd(), 'public', 'uploads', key)
  await mkdir(path.dirname(file), { recursive: true })
  const buf = Buffer.from(await req.arrayBuffer())
  if (buf.length > MAX) return new NextResponse('Demasiado grande', { status: 413 })
  await writeFile(file, buf)
  return new NextResponse(null, { status: 200 })
}
