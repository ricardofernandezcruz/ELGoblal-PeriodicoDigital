/* Espacios de publicidad del sitio y datos que comparten el sitio y el panel.
   Todos los espacios usan los mismos dos formatos, así una campaña necesita solo dos piezas:
   970×250 para computadora y 300×250 para celular. Cada espacio reserva ese hueco, así la
   página no salta al cargar. */

export type AdCreative = { type: 'image' | 'video'; url: string; w: number; h: number }

export const AD_DESKTOP = [970, 250] as const
export const AD_MOBILE = [300, 250] as const

export const PLACEMENTS = {
  'home-top': { label: 'Portada · bajo la cabecera', desktop: AD_DESKTOP, mobile: AD_MOBILE },
  'home-mid': { label: 'Portada · entre bloques de noticias', desktop: AD_DESKTOP, mobile: AD_MOBILE },
  section: { label: 'Secciones · arriba de la lista', desktop: AD_DESKTOP, mobile: AD_MOBILE },
  article: { label: 'Notas · dentro del texto', desktop: AD_DESKTOP, mobile: AD_MOBILE },
  video: { label: 'Video · entre filas', desktop: AD_DESKTOP, mobile: AD_MOBILE },
} as const satisfies Record<string, { label: string; desktop: readonly [number, number]; mobile: readonly [number, number] }>

export type Placement = keyof typeof PLACEMENTS
export const PLACEMENT_IDS = Object.keys(PLACEMENTS) as Placement[]

/** Lo que recibe el sitio para pintar un anuncio (el destino del clic no viaja: lo resuelve /api/ads/click). */
export type PublicAd = { id: string; alt: string; advertiser: string; weight: number; endsAt: string | null; desktop: AdCreative | null; mobile: AdCreative | null }
export type AdMap = Partial<Record<Placement, PublicAd[]>>

export type AdStatus = 'active' | 'scheduled' | 'ended' | 'paused'
export const AD_STATUS_LABEL: Record<AdStatus, string> = { active: 'Activa', scheduled: 'Programada', ended: 'Terminada', paused: 'En pausa' }

export function adStatus(c: { paused: boolean; startsAt: string | null; endsAt: string | null }, now = Date.now()): AdStatus {
  if (c.endsAt && +new Date(c.endsAt) <= now) return 'ended'
  if (c.paused) return 'paused'
  if (c.startsAt && +new Date(c.startsAt) > now) return 'scheduled'
  return 'active'
}

/** Día en la hora del periódico (AAAA-MM-DD), para las estadísticas. */
export const adDay = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' })

/** Campaña tal como la ve el panel. */
export type AdminAd = {
  id: string
  name: string
  advertiser: string
  url: string
  alt: string
  paused: boolean
  startsAt: string | null
  endsAt: string | null
  placements: Placement[]
  sections: string[]
  weight: number
  desktop: AdCreative | null
  mobile: AdCreative | null
  /** Últimos 30 días. */
  views: number
  clicks: number
}

export type AdReport = {
  views: number
  clicks: number
  byPlacement: { placement: string; views: number; clicks: number }[]
  byDay: { day: string; views: number; clicks: number }[]
}

export const ctr = (views: number, clicks: number) => (views ? ((clicks / views) * 100).toLocaleString('es-DO', { maximumFractionDigits: 2 }) + ' %' : '—')
