/* Datos de ejemplo del panel de redacción (simulados, sin servidor). */

export type Status = 'pub' | 'sch' | 'rev' | 'draft'
export type News = { id: number; t: string; sec: string; au: string; st: Status; d: Date | null; r: number; art: string }
export type BlockType = 'p' | 'sub' | 'img' | 'quote' | 'video' | 'data' | 'sum'
export type Block = {
  id: number
  t: BlockType
  v?: string
  who?: string
  src?: string
  alt?: string
  cap?: string
  u?: string
  vert?: boolean
  n?: string
  l?: string
}
export type MediaItem = { s: string; n: string; a: string }
export type Mode = 'now' | 'sch' | 'draft'
export type Version = { at: Date; j: string; m: boolean }
export type Editor = {
  id: number | null
  title: string
  lead: string
  sec: string
  au: string
  tags: string[]
  slug: string
  slugEd?: boolean
  seo: string
  mode: Mode
  when: string
  blocks: Block[]
  vers: Version[]
  dirty: boolean
  com: boolean
  news: boolean
  flash: boolean
  tab: 'pv' | 'pb' | 'ql'
  view: 'desk' | 'mob'
  status: string
  est: Status
}
export type View = 'dash' | 'news' | 'edit' | 'home' | 'media' | 'com' | 'stats' | 'team'

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
    .slice(0, 60)
export const num = (n: number) => n.toLocaleString('es-DO')

export const initialNews = (): News[] => [
  { id: 1, t: 'El mundo reordena sus prioridades ante una nueva era de incertidumbre', sec: 'Mundo', au: 'Redacción Global', st: 'pub', d: D(0, 8, 10), r: 18420, art: 'skyline' },
  { id: 2, t: 'Los mercados miran a Europa ante un nuevo ciclo de inversión', sec: 'Economía', au: 'Andrés Molina', st: 'pub', d: D(0, 7, 30), r: 9310, art: 'mercados' },
  { id: 3, t: 'La inteligencia artificial cambia la forma de leer las noticias', sec: 'Tecnología', au: 'Lucía Ferrer', st: 'pub', d: D(-1, 18, 0), r: 12755, art: 'ia' },
  { id: 8, t: 'El empleo joven vuelve a crecer en tres de cada cuatro países', sec: 'Economía', au: 'Andrés Molina', st: 'pub', d: D(-2, 9, 10), r: 6480, art: 'empleo' },
  { id: 4, t: 'Un nuevo método reduce a la mitad el costo de almacenar energía solar', sec: 'Ciencia', au: 'Marta Quiroga', st: 'sch', d: D(1, 7, 30), r: 0, art: 'energia' },
  { id: 5, t: 'El arte latinoamericano que está conquistando las galerías del mundo', sec: 'Cultura', au: 'Marta Quiroga', st: 'sch', d: D(3, 18, 0), r: 0, art: 'arte' },
  { id: 6, t: 'La generación que está cambiando las reglas del trabajo', sec: 'Sociedad', au: 'Andrés Molina', st: 'rev', d: null, r: 0, art: 'trabajo' },
  { id: 7, t: 'Ciudades que buscan reinventarse', sec: 'Mundo', au: 'Lucía Ferrer', st: 'draft', d: null, r: 0, art: 'ciudades' },
]

export const ST: Record<Status, string> = { pub: 'Publicada', sch: 'Programada', rev: 'En revisión', draft: 'Borrador' }
export const SECS = ['Mundo', 'Economía', 'Tecnología', 'Ciencia', 'Cultura', 'Sociedad', 'Deportes', 'Opinión']
export const AUTH = ['Redacción Global', 'Lucía Ferrer', 'Andrés Molina', 'Marta Quiroga', 'Carla Méndez']

export const VIEWS: Record<View, [string, string]> = {
  dash: ['Contenido', 'Panel'],
  news: ['Contenido', 'Noticias'],
  edit: ['Contenido', 'Editor de notas'],
  media: ['Contenido', 'Multimedia'],
  com: ['Contenido', 'Comentarios'],
  home: ['Sitio', 'Portada'],
  stats: ['Sitio', 'Analítica'],
  team: ['Sitio', 'Equipo y permisos'],
}

export const DAYS = Array.from({ length: 14 }, (_, i) => {
  const x = new Date()
  x.setDate(x.getDate() - 13 + i)
  return x.getDate() + '/' + (x.getMonth() + 1)
})
export const READS = [31200, 28900, 33100, 35800, 30400, 26100, 24800, 34500, 38200, 41000, 39800, 43600, 45100, 48200]

export const initialMedia = (): MediaItem[] =>
  [
    ['skyline', 'Ciudad de noche', 'Vista nocturna de una ciudad con rascacielos iluminados'],
    ['ciudades', 'Ciudad verde', 'Ciudad con azoteas verdes y un tranvía'],
    ['mercados', 'Mercados', 'Gráfico de velas con tendencia al alza'],
    ['energia', 'Energía limpia', 'Aerogeneradores y paneles solares sobre colinas'],
    ['ia', 'Inteligencia artificial', 'Un documento conectado a una red de nodos'],
    ['arte', 'Arte abstracto', ''],
    ['trabajo', 'Escritorio', 'Escritorio con laptop, calendario y planta'],
    ['empleo', 'Empleo', 'Barras crecientes con figuras humanas'],
    ['dispositivos', 'Dispositivos', ''],
  ].map((m) => ({ s: m[0], n: m[1], a: m[2] }))

export type Comment = { who: string; text: string; on: string; av: string; spam: boolean }
export const initialComments = (): Comment[] => [
  { who: 'Luis P.', text: 'Excelente análisis, gracias por explicarlo con tanta claridad.', on: 'El mundo reordena sus prioridades', av: 'av2', spam: false },
  { who: 'Promo-ganar-dinero', text: 'Gana $$$ desde casa, entra a mi perfil ya mismo http://…', on: 'Los mercados miran a Europa', av: 'av3', spam: true },
  { who: 'Ana R.', text: 'No estoy de acuerdo con el tercer punto, creo que faltan cifras.', on: 'La inteligencia artificial cambia la forma de leer', av: 'av1', spam: false },
  { who: 'Carlos D.', text: '¿Dónde puedo leer más sobre el acuerdo de energía?', on: 'El mundo reordena sus prioridades', av: 'av2', spam: false },
  { who: 'oferta-unica', text: 'Compra seguidores baratos ahora', on: 'El empleo joven vuelve a crecer', av: 'av3', spam: true },
]

export type HomeState = {
  slots: number[]
  auto: boolean[]
  ub: boolean
  ut: string
  secs: { n: string; on: boolean }[]
  hl: number
}
export const initialHome = (): HomeState => ({
  slots: [1, 2, 3],
  auto: [false, false, false],
  ub: true,
  ut: 'Cumbre global: las grandes potencias acuerdan una hoja de ruta de diálogo.',
  secs: SECS.slice(0, 7).map((n) => ({ n, on: true })),
  hl: -1,
})

/* Editor: tipos de bloque */
export const LBL: Record<BlockType, string> = { p: 'Texto', sub: 'Subtítulo', img: 'Imagen', quote: 'Cita', video: 'Video', data: 'Dato destacado', sum: 'En 30 segundos' }
export const BI = { p: 'type', sub: 'hash', img: 'image', quote: 'quote', video: 'video', data: 'chart', sum: 'list' } as const
export const BH: Record<BlockType, string> = {
  p: 'Párrafo normal',
  sub: 'Divide la nota en partes',
  img: 'La primera será la portada',
  quote: 'Se destaca sola',
  video: 'Horizontal o vertical',
  data: 'Una cifra grande',
  sum: 'Resumen de 3 puntos',
}

let BID = 1
export const mk = (t: BlockType, o: Partial<Block> = {}): Block => ({ id: BID++, t, ...o })

export const TEMPLATES: Record<'std' | 'cro' | 'dat' | 'vid', () => Block[]> = {
  std: () => [
    mk('img', { src: 'skyline', alt: 'Vista nocturna de una ciudad con rascacielos iluminados', cap: 'Una ciudad al anochecer. Ilustración.' }),
    mk('p', { v: 'Durante años, la agenda internacional se movió por impulsos: una crisis desplazaba a la anterior y casi nunca quedaba tiempo para planificar. Esta semana, las principales delegaciones coincidieron en que el método tiene que cambiar.' }),
    mk('p', { v: 'El acuerdo no resuelve ninguna disputa concreta, pero fija un calendario de reuniones técnicas y una lista de temas comunes. Para los analistas, ese orden previo es lo más importante.' }),
    mk('sub', { v: 'Tres prioridades sobre la mesa' }),
    mk('p', { v: 'La primera es la energía: cómo asegurar el suministro sin frenar la transición. La segunda es la tecnología. La tercera es la cooperación financiera para los países con menos margen.' }),
  ],
  cro: () => [
    mk('img', { src: 'ciudades', alt: 'Ciudad con azoteas verdes y un tranvía', cap: 'Una avenida con tranvía.' }),
    mk('p', { v: 'Llegamos a las seis de la mañana. La ciudad ya estaba en marcha: tranvías, bicicletas y un olor a pan recién hecho.' }),
    mk('p', { v: 'En diez años, el centro perdió la mitad de sus autos y ganó cuarenta hectáreas de azoteas verdes.' }),
    mk('img', { src: 'energia', alt: 'Paneles solares y aerogeneradores', cap: '' }),
    mk('img', { src: 'trabajo', alt: 'Escritorio con laptop y planta', cap: '' }),
    mk('quote', { v: 'Nadie quiere volver atrás, ni siquiera los que protestaron al principio.', who: 'Vecina del barrio' }),
    mk('p', { v: 'La experiencia ya se estudia en otras capitales que enfrentan los mismos problemas.' }),
  ],
  dat: () => [
    mk('data', { n: '42 %', l: 'menos emisiones en el centro desde 2016' }),
    mk('p', { v: 'El dato sorprendió incluso a quienes diseñaron el plan. La reducción se concentró en los primeros tres años.' }),
    mk('sub', { v: 'Qué explica el cambio' }),
    mk('p', { v: 'Tres decisiones: menos estacionamientos, más transporte público y un impuesto a los viajes cortos en auto.' }),
    mk('data', { n: '1 de cada 3', l: 'viajes se hace ahora en bicicleta o a pie' }),
    mk('p', { v: 'Queda pendiente medir el efecto sobre el comercio de la zona.' }),
  ],
  vid: () => [
    mk('video', { u: 'Video vertical del lugar', vert: true, cap: 'Grabado en el barrio.' }),
    mk('p', { v: 'Bastó un teléfono para registrar lo que pasó anoche en la plaza.' }),
    mk('quote', { v: 'Fue algo que no se veía hace años.', who: 'Testigo' }),
    mk('p', { v: 'Las autoridades prometieron un informe en las próximas 48 horas.' }),
  ],
}

export const emptyEditor = (o: Partial<Editor> = {}): Editor => ({
  id: null,
  title: '',
  lead: '',
  sec: 'Mundo',
  au: 'Carla Méndez',
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
  tab: 'pv',
  view: 'desk',
  status: 'Listo para escribir',
  est: 'draft',
  ...o,
})

export const TEAM = [
  ['Carla Méndez', 'Editora', 'av1'],
  ['Andrés Molina', 'Redactor', 'av2'],
  ['Lucía Ferrer', 'Redactora', 'av3'],
  ['Marta Quiroga', 'Colaboradora', 'av1'],
]
export const PERM = ['Escribir notas propias', 'Editar notas de otros', 'Publicar', 'Gestionar la portada', 'Moderar comentarios', 'Administrar el equipo']
export const ROLES = ['Colaborador', 'Redactor', 'Editor', 'Administrador']
export const PM = () => [
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1],
]
