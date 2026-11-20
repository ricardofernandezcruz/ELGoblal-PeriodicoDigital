/** Páginas institucionales y legales (sus textos están en components/site/legal.tsx). */
export type InfoKind = 'quienes-somos' | 'contacto' | 'privacidad' | 'terminos' | 'normas-de-comentarios' | 'correcciones'

export const INFO_TITLE: Record<InfoKind, string> = {
  'quienes-somos': 'Quiénes somos',
  contacto: 'Contacto',
  privacidad: 'Política de privacidad',
  terminos: 'Términos de uso',
  'normas-de-comentarios': 'Normas de los comentarios',
  correcciones: 'Política de correcciones',
}
