import 'server-only'
import { AwsClient } from 'aws4fetch'

/* Almacenamiento de imágenes.
   - Con las variables R2_* configuradas: Cloudflare R2 (producción y pruebas en Vercel).
   - Sin ellas, y solo en desarrollo: carpeta public/uploads del proyecto. */

const r2 = () => {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return null
  return {
    client: new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' }),
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`,
    publicUrl: R2_PUBLIC_URL.replace(/\/$/, ''),
  }
}

export const storageReady = () => !!r2() || process.env.NODE_ENV !== 'production'

/** Guarda el archivo y devuelve su URL pública. */
export async function putObject(key: string, body: ArrayBuffer, type: string): Promise<string> {
  const s = r2()
  if (s) {
    const res = await s.client.fetch(`${s.endpoint}/${key}`, {
      method: 'PUT',
      body,
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
    if (!res.ok) throw new Error('No se pudo subir la imagen al almacenamiento (' + res.status + ').')
    return `${s.publicUrl}/${key}`
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Falta configurar Cloudflare R2 (variables R2_*).')
  // Desarrollo local: se importa aquí para no incluir fs en otros entornos.
  const { mkdir, writeFile } = await import('node:fs/promises')
  const path = await import('node:path')
  const file = path.join(process.cwd(), 'public', 'uploads', key)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, Buffer.from(body))
  return `/uploads/${key}`
}
