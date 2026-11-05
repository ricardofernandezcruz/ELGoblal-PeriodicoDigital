/* Utilidades y tipos del panel de redacción (los datos vienen de la base de datos). */
import type { AdminVersion, Block, BlockType, Status } from '@/lib/newsroom-types'

export type { AdminChannel, AdminComment, AdminMedia, AdminNews, AdminSection, AdminUser, AdminVideo, Block, BlockType, Status } from '@/lib/newsroom-types'

/** 'rev' = enviar a revisión (para quien no puede publicar). */
export type Mode = 'now' | 'sch' | 'draft' | 'rev'
export type View = 'dash' | 'news' | 'edit' | 'videos' | 'home' | 'media' | 'com' | 'stats' | 'team'

export type Editor = {
  id: string | null
  title: string
  lead: string
  sec: string // id de sección
  au: string | null // id de firma
  tags: string[]
  slug: string
  slugEd?: boolean
  seo: string
  mode: Mode
  when: string // datetime-local
  blocks: Block[]
  vers: AdminVersion[]
  dirty: boolean
  com: boolean
  news: boolean
  flash: boolean
  /** Cobertura en vivo. */
  live: boolean
  tab: 'pv' | 'pb' | 'ql'
  view: 'desk' | 'mob'
  status: string
  est: Status
  createdBy: string | null
}

export const D = (d: number, h = 0, m = 0) => {
  const x = new Date()
  x.setDate(x.getDate() + d)
  x.setHours(h, m, 0, 0)
  return x
}
export const fd = (d: Date | string | null) =>
  d ? new Date(d).toLocaleString('es-DO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
export const loc = (d: Date | string) => {
  const x = new Date(d),
    p = (n: number) => String(n).padStart(2, '0')
  return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()) + 'T' + p(x.getHours()) + ':' + p(x.getMinutes())
}
export const slugify = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
export const num = (n: number) => n.toLocaleString('es-DO')
export const hm = (d: Date | string) => new Date(d).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })

export const ST: Record<Status, string> = { pub: 'Publicada', sch: 'Programada', rev: 'En revisión', draft: 'Borrador' }

export const VIEWS: Record<View, [string, string]> = {
  dash: ['Contenido', 'Panel'],
  news: ['Contenido', 'Noticias'],
  edit: ['Contenido', 'Editor de notas'],
  videos: ['Contenido', 'Videos'],
  media: ['Contenido', 'Multimedia'],
  com: ['Contenido', 'Comentarios'],
  home: ['Sitio', 'Portada'],
  stats: ['Sitio', 'Analítica'],
  team: ['Sitio', 'Equipo y permisos'],
}

/* Editor: tipos de bloque */
export const LBL: Record<BlockType, string> = {
  p: 'Texto',
  sub: 'Subtítulo',
  img: 'Imagen',
  quote: 'Cita',
  video: 'Video',
  data: 'Dato destacado',
  sum: 'En 30 segundos',
  poll: 'Encuesta',
}
export const BI = { p: 'type', sub: 'hash', img: 'image', quote: 'quote', video: 'video', data: 'chart', sum: 'list', poll: 'poll' } as const
export const BH: Record<BlockType, string> = {
  p: 'Párrafo normal',
  sub: 'Divide la nota en partes',
  img: 'La primera será la portada',
  quote: 'Se destaca sola',
  video: 'Horizontal o vertical',
  data: 'Una cifra grande',
  sum: 'Resumen de 3 puntos',
  poll: 'Los lectores votan',
}

export const mk = (t: BlockType, o: Partial<Block> = {}): Block => ({
  ...(t === 'p' || t === 'sub' || t === 'sum' || t === 'quote' ? { v: '' } : {}),
  ...(t === 'poll' ? { q: '', opts: ['', ''] } : {}),
  ...o,
  id: crypto.randomUUID().slice(0, 8),
  t,
})

/** Puntos de partida: solo la estructura, el contenido lo escribe la redacción. */
export const TEMPLATES: Record<'std' | 'cro' | 'dat' | 'vid', () => Block[]> = {
  std: () => [mk('img'), mk('p'), mk('p'), mk('sub'), mk('p')],
  cro: () => [mk('img'), mk('p'), mk('p'), mk('img'), mk('img'), mk('quote'), mk('p')],
  dat: () => [mk('data'), mk('p'), mk('sub'), mk('p'), mk('data'), mk('p')],
  vid: () => [mk('video', { vert: true }), mk('p'), mk('quote'), mk('p')],
}

export const emptyEditor = (o: Partial<Editor> = {}): Editor => ({
  id: null,
  title: '',
  lead: '',
  sec: '',
  au: null,
  tags: [],
  slug: '',
  seo: '',
  mode: 'now',
  when: loc(D(1, 7, 30)),
  blocks: [],
  vers: [],
  dirty: false,
  com: true,
  news: false,
  flash: false,
  live: false,
  tab: 'pv',
  view: 'desk',
  status: 'Listo para escribir',
  est: 'draft',
  createdBy: null,
  ...o,
})
