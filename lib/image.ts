import 'server-only'

/** Tamaño máximo de una imagen de la biblioteca. */
export const MAX_IMAGE = 3 * 1024 * 1024

/** Tipo real según los primeros bytes; no se confía en la extensión ni en el tipo declarado. */
export function sniffImage(b: Uint8Array): { ext: string; mime: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' }
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', mime: 'image/png' }
  if (String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return { ext: 'webp', mime: 'image/webp' }
  if (String.fromCharCode(...b.slice(0, 4)) === 'GIF8') return { ext: 'gif', mime: 'image/gif' }
  return null
}

/** Clave de almacenamiento: año/mes/uuid.ext */
export const imageKey = (ext: string) => {
  const d = new Date()
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${ext}`
}
