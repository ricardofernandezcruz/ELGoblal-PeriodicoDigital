/* Formato de los párrafos: negrita, cursiva y subrayado (y saltos de línea).
   Se guarda como HTML mínimo y limpio: solo <b>, <i>, <u> y <br>, sin atributos.
   Todo lo demás (estilos, enlaces, scripts, lo que venga al pegar desde Word o una web) se descarta
   y su texto se conserva. La misma función se usa en el navegador, en el servidor y al mostrar la nota. */

const TAGS: Record<string, 'b' | 'i' | 'u'> = { b: 'b', strong: 'b', i: 'i', em: 'i', u: 'u', ins: 'u' }
const BLOCKS = new Set(['div', 'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'tr'])

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü',
  iexcl: '¡', iquest: '¿', laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  mdash: '—', ndash: '–', hellip: '…', deg: '°', euro: '€', copy: '©', reg: '®',
}

/** Convierte entidades HTML en caracteres. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''
    }
    return NAMED[e] ?? m
  })
}

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Deja solo <b>, <i>, <u> y <br>, bien anidados y sin atributos. */
export function sanitizeInline(input: string): string {
  const src = input
    .replace(/<(script|style|head|title|template|noscript|svg|math|iframe|object)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  let out = ''
  const open: ('b' | 'i' | 'u')[] = []
  const re = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*>|([^<]+)|</g
  for (const m of src.matchAll(re)) {
    if (m[3] !== undefined) {
      out += escapeHtml(decodeEntities(m[3]))
      continue
    }
    if (m[2] === undefined) {
      out += '&lt;'
      continue
    }
    const name = m[2].toLowerCase()
    const closing = m[1] === '/'
    if (name === 'br') out += '<br>'
    else if (BLOCKS.has(name)) {
      // Un bloque nuevo (lo que crea Enter o lo que trae Word) es un salto de línea.
      if (!closing && out && !out.endsWith('<br>')) out += '<br>'
    } else if (TAGS[name]) {
      const t = TAGS[name]
      if (!closing) {
        if (open.includes(t)) continue
        open.push(t)
        out += `<${t}>`
      } else {
        const at = open.lastIndexOf(t)
        if (at < 0) continue
        // Cierra hasta esa etiqueta y vuelve a abrir las de dentro, para que todo quede bien anidado.
        const inner = open.splice(at)
        out += [...inner].reverse().map((x) => `</${x}>`).join('')
        for (const x of inner.slice(1)) {
          open.push(x)
          out += `<${x}>`
        }
      }
    }
  }
  out += open.reverse().map((x) => `</${x}>`).join('')
  // Sin etiquetas vacías ni saltos sobrantes al final.
  let prev = ''
  while (prev !== out) {
    prev = out
    out = out.replace(/<(b|i|u)>(\s*)<\/\1>/g, '$2')
  }
  return out.replace(/(<br>\s*)+$/, '').replace(/^(\s*<br>)+/, '')
}

/** Texto sin formato (para contar palabras, resúmenes, buscadores). */
export function plainText(v: string, html?: boolean): string {
  if (!html) return v
  return decodeEntities(v.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ''))
}

/** HTML listo para mostrar: los párrafos viejos (texto plano) se escapan y sus saltos pasan a <br>. */
export function paragraphHtml(v: string, html?: boolean): string {
  return html ? sanitizeInline(v) : escapeHtml(v).replace(/\n/g, '<br>')
}
