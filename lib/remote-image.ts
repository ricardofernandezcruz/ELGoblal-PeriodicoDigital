import 'server-only'
import { lookup, type LookupAddress } from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import { BlockList, isIP } from 'node:net'

/* Descarga una imagen desde un enlace pegado en el panel, sin abrir la puerta a la red interna (SSRF):
   - solo http/https en los puertos estándar;
   - la dirección se comprueba en el momento de conectar (no antes), así un DNS que cambia de
     respuesta no puede colar una IP privada;
   - como máximo 3 redirecciones y un tamaño máximo, con tiempo límite.
   Si el enlace es una página (una noticia), se usa su imagen principal (og:image). */

export class RemoteImageError extends Error {}

const blocked = new BlockList()
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
] as const)
  blocked.addSubnet(net, prefix, 'ipv4')
for (const [net, prefix] of [
  ['::', 127],
  ['64:ff9b::', 96],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const)
  blocked.addSubnet(net, prefix, 'ipv6')

function isPrivate(ip: string): boolean {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1]
  if (mapped) return blocked.check(mapped, 'ipv4')
  return blocked.check(ip, isIP(ip) === 6 ? 'ipv6' : 'ipv4')
}

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void
/** Resolución DNS que rechaza direcciones privadas; la usa el socket justo al conectar. */
function safeLookup(host: string, opts: { all?: boolean; family?: number }, cb: LookupCb) {
  lookup(host, { family: opts.family, all: true }, (err, addrs) => {
    if (err) return cb(err, [])
    if (!addrs.length || addrs.some((a) => isPrivate(a.address))) return cb(new RemoteImageError('Ese enlace apunta a una dirección no permitida.'), [])
    if (opts.all) cb(null, addrs)
    else cb(null, addrs[0].address, addrs[0].family)
  })
}

const UA = 'Mozilla/5.0 (compatible; ElGlobalBot/1.0; +https://el-goblal-periodico-digital.vercel.app)'

function get(raw: string, max: number): Promise<{ status: number; location?: string; type: string; body: Buffer }> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new RemoteImageError('Ese enlace no es válido. Cópialo completo, empezando por https://')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new RemoteImageError('Solo se admiten enlaces http o https.')
  if (url.port && url.port !== '80' && url.port !== '443') throw new RemoteImageError('Ese enlace usa un puerto no permitido.')
  if (url.username || url.password) throw new RemoteImageError('El enlace no puede llevar usuario ni contraseña.')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (isIP(host) && isPrivate(host)) throw new RemoteImageError('Ese enlace apunta a una dirección no permitida.')

  const mod = url.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const req = mod.get(
      url,
      { lookup: safeLookup as never, timeout: 10_000, headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/*,text/html;q=0.8,*/*;q=0.5' } },
      (res) => {
        const status = res.statusCode ?? 0
        const type = String(res.headers['content-type'] ?? '').toLowerCase()
        if (status >= 300 && status < 400) {
          res.resume()
          return resolve({ status, location: res.headers.location, type, body: Buffer.alloc(0) })
        }
        if (Number(res.headers['content-length'] ?? 0) > max) {
          res.destroy()
          return reject(new RemoteImageError('La imagen pesa más de 3 MB. Descárgala, redúcela y súbela desde tu equipo.'))
        }
        const chunks: Buffer[] = []
        let size = 0
        res.on('data', (c: Buffer) => {
          size += c.length
          if (size > max) {
            res.destroy()
            reject(new RemoteImageError('La imagen pesa más de 3 MB. Descárgala, redúcela y súbela desde tu equipo.'))
          } else chunks.push(c)
        })
        res.on('end', () => resolve({ status, type, body: Buffer.concat(chunks) }))
        res.on('error', reject)
      },
    )
    req.on('timeout', () => req.destroy(new RemoteImageError('La página tardó demasiado en responder. Inténtalo de nuevo.')))
    req.on('error', (e) => reject(e instanceof RemoteImageError ? e : new RemoteImageError('No se pudo abrir ese enlace. Comprueba que funciona en el navegador.')))
  })
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")

/** Imagen principal de una página (og:image / twitter:image) y su título. */
function pageImage(html: string, base: string): { image: string | null; title: string | null } {
  const meta = (name: string) =>
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, 'i'))?.[1] ??
    null
  const img = meta('og:image:secure_url') ?? meta('og:image') ?? meta('twitter:image')
  const title = meta('og:title') ?? html.match(/<title[^>]*>([^<]{1,300})<\/title>/i)?.[1] ?? null
  let image: string | null = null
  try {
    image = img ? new URL(decode(img), base).toString() : null
  } catch {}
  return { image, title: title ? decode(title).trim() : null }
}

/** Descarga una imagen (o la imagen principal de una página). Devuelve los bytes y un nombre sugerido. */
export async function fetchRemoteImage(raw: string, max: number): Promise<{ body: Buffer; name: string; source: string }> {
  let url = raw.trim()
  let title: string | null = null
  let fromPage = false
  for (let hop = 0; hop < 5; hop++) {
    const r = await get(url, max)
    if (r.location) {
      url = new URL(r.location, url).toString()
      continue
    }
    if (r.status === 401 || r.status === 403) throw new RemoteImageError('Ese sitio no permite descargar la imagen. Guárdala en tu equipo y súbela.')
    if (r.status === 404) throw new RemoteImageError('Ese enlace no existe (error 404).')
    if (r.status !== 200) throw new RemoteImageError(`El sitio respondió con un error (${r.status}).`)
    if (r.type.includes('text/html') && !fromPage) {
      const page = pageImage(r.body.toString('utf8'), url)
      if (!page.image) throw new RemoteImageError('Esa página no tiene una imagen principal. Copia el enlace de la imagen (clic derecho → «Copiar dirección de la imagen»).')
      title = page.title
      url = page.image
      fromPage = true
      continue
    }
    const file = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '').replace(/\.[^.]+$/, '')
    return { body: r.body, name: (title ?? file ?? 'Imagen').slice(0, 120) || 'Imagen', source: url }
  }
  throw new RemoteImageError('El enlace redirige demasiadas veces.')
}
