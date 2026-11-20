/* Datos del periódico que se editan desde el panel (Portada → Datos del periódico):
   identidad legal, contacto y redes. Los usan el pie de página, las páginas legales y los
   datos para buscadores. Mientras un dato esté vacío, no se muestra. */

export type SiteInfo = {
  legalName: string
  rnc: string
  address: string
  email: string
  phone: string
  director: string
  /** Texto de «Quiénes somos». Párrafos separados por una línea en blanco. */
  about: string
  socials: Record<SocialId, string>
}

export const SOCIALS = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['x', 'X'],
  ['tiktok', 'TikTok'],
  ['youtube', 'YouTube'],
  ['threads', 'Threads'],
  ['whatsapp', 'Canal de WhatsApp'],
] as const
export type SocialId = (typeof SOCIALS)[number][0]

export const DEFAULT_SITE_INFO: SiteInfo = {
  legalName: '',
  rnc: '',
  address: '',
  email: '',
  phone: '',
  director: '',
  about: '',
  socials: { facebook: '', instagram: '', x: '', tiktok: '', youtube: '', threads: '', whatsapp: '' },
}

/** Nombre del responsable para los textos legales. */
export const owner = (s: SiteInfo) => s.legalName || 'El Global'
