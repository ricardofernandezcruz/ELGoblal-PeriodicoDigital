/* Prepara una foto en el navegador antes de subirla:
   - la reduce a 2400 px por el lado mayor (de sobra para pantallas retina a ancho completo);
   - la convierte a WebP (pesa entre 3 y 10 veces menos que un JPG de cámara);
   - le quita los metadatos EXIF, que pueden incluir la ubicación GPS de quien hizo la foto;
   - respeta la orientación con que se tomó (fotos de celular en vertical).
   Los GIF se suben tal cual para no perder la animación. */

export const MAX_SIDE = 2400
/** Lo que se acepta elegir en el equipo; lo que llega al servidor ya va reducido. */
export const MAX_INPUT = 40 * 1024 * 1024
const MAX_UPLOAD = 3 * 1024 * 1024

export class ImagePrepError extends Error {}

export type Prepared = { file: File; width: number; height: number }

const toBlob = (c: HTMLCanvasElement, type: string, q: number) => new Promise<Blob | null>((r) => c.toBlob(r, type, q))

export async function prepareImage(f: File): Promise<Prepared> {
  if (f.size > MAX_INPUT) throw new ImagePrepError('La imagen pesa más de 40 MB. Elige una más ligera.')
  if (f.type === 'image/gif') {
    if (f.size > MAX_UPLOAD) throw new ImagePrepError('Los GIF no se pueden reducir y este pesa más de 3 MB.')
    const bmp = await createImageBitmap(f).catch(() => null)
    const size = { width: bmp?.width ?? 0, height: bmp?.height ?? 0 }
    bmp?.close()
    return { file: f, ...size }
  }

  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(f, { imageOrientation: 'from-image' })
  } catch {
    throw new ImagePrepError('No se pudo leer la imagen. Usa una foto JPG, PNG o WebP.')
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const width = Math.round(bmp.width * scale)
  const height = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImagePrepError('Tu navegador no pudo procesar la imagen.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, width, height)
  bmp.close()

  // Calidad alta y, si aún pesa demasiado, se baja un poco hasta que quepa.
  const name = f.name.replace(/\.[^.]+$/, '') + '.webp'
  for (const q of [0.86, 0.78, 0.68, 0.58]) {
    const blob = await toBlob(canvas, 'image/webp', q)
    // Safari antiguo no sabe crear WebP y devuelve PNG: entonces se usa JPG.
    const out = blob?.type === 'image/webp' ? blob : await toBlob(canvas, 'image/jpeg', q)
    if (!out) break
    if (out.size <= MAX_UPLOAD) {
      // Si la original ya era pequeña y más ligera, se queda la original (sin EXIF solo si se recodificó).
      const keepOriginal = scale === 1 && f.size <= out.size && f.size <= MAX_UPLOAD && f.type !== 'image/jpeg'
      if (keepOriginal) return { file: f, width, height }
      return { file: new File([out], out.type === 'image/webp' ? name : name.replace(/\.webp$/, '.jpg'), { type: out.type }), width, height }
    }
  }
  throw new ImagePrepError('No se pudo reducir la imagen por debajo de 3 MB. Prueba con otra.')
}
