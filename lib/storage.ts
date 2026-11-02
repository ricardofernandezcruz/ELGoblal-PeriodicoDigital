import 'server-only'
import { AwsClient } from 'aws4fetch'

/* Almacenamiento de imágenes.
   - Con las variables R2_* configuradas: Cloudflare R2 (producción y pruebas en Vercel).
   - Sin ellas, y solo en desarrollo: carpeta public/uploads del proyecto. */

/** Error de almacenamiento con un mensaje que se puede mostrar a la redacción (sin datos sensibles). */
export class StorageError extends Error {}

// Las variables se limpian de espacios y saltos de línea: es lo que suele colarse al pegarlas en Vercel.
const env = (k: string) => process.env[k]?.trim().replace(/^["']|["']$/g, '') || undefined

const r2 = () => {
  const [account, keyId, secret, bucket, publicUrl] = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL'].map(env)
  if (!account || !keyId || !secret || !bucket || !publicUrl) return null
  return {
    client: new AwsClient({ accessKeyId: keyId, secretAccessKey: secret, service: 's3', region: 'auto' }),
    endpoint: `https://${account}.r2.cloudflarestorage.com/${bucket}`,
    bucket,
    publicUrl: publicUrl.replace(/\/$/, ''),
  }
}

/** Qué variables R2_* faltan (solo sus nombres). */
export const missingR2 = () =>
  ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL'].filter((k) => !env(k))

export const storageReady = () => !!r2() || process.env.NODE_ENV !== 'production'

/** Guarda el archivo y devuelve su URL pública. */
export async function putObject(key: string, body: ArrayBuffer, type: string): Promise<string> {
  const s = r2()
  if (s) {
    let res: Response
    try {
      // Se firma la petición y se envía con el contenido completo y su tamaño: R2 exige Content-Length
      // y, en Vercel, una petición firmada con cuerpo viaja como flujo sin tamaño (error 411).
      const bytes = new Uint8Array(body)
      const signed = await s.client.sign(`${s.endpoint}/${key}`, {
        method: 'PUT',
        body: bytes,
        headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable' },
      })
      const headers = new Headers(signed.headers)
      headers.set('Content-Length', String(bytes.byteLength))
      res = await fetch(signed.url, { method: 'PUT', headers, body: bytes, cache: 'no-store' })
    } catch {
      throw new StorageError('No se pudo conectar con Cloudflare R2. Revisa R2_ACCOUNT_ID en Vercel.')
    }
    if (res.status === 401 || res.status === 403)
      throw new StorageError('Cloudflare R2 rechazó las llaves de acceso. Revisa R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY en Vercel.')
    if (res.status === 404) throw new StorageError(`Cloudflare R2 no encuentra el bucket «${s.bucket}». Revisa R2_BUCKET en Vercel.`)
    if (!res.ok) throw new StorageError(`Cloudflare R2 respondió con un error (${res.status}). Inténtalo de nuevo en un momento.`)
    return `${s.publicUrl}/${key}`
  }
  if (process.env.NODE_ENV === 'production')
    throw new StorageError(`El almacenamiento de imágenes no está configurado: faltan ${missingR2().join(', ')} en Vercel.`)
  // Desarrollo local: se importa aquí para no incluir fs en otros entornos.
  const { mkdir, writeFile } = await import('node:fs/promises')
  const path = await import('node:path')
  const file = path.join(process.cwd(), 'public', 'uploads', key)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, Buffer.from(body))
  return `/uploads/${key}`
}

/** Enlace firmado (1 h) para que el navegador suba un archivo grande directamente a R2.
    Sin R2 (solo en desarrollo) devuelve null y la subida se hace a /api/video-upload. */
export async function presignUpload(key: string): Promise<{ uploadUrl: string; publicUrl: string } | null> {
  const s = r2()
  if (!s) return null
  const signed = await s.client.sign(new Request(`${s.endpoint}/${key}?X-Amz-Expires=3600`, { method: 'PUT' }), { aws: { signQuery: true } })
  return { uploadUrl: signed.url, publicUrl: `${s.publicUrl}/${key}` }
}
