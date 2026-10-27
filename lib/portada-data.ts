export const SECTIONS = ['Portada', 'Actualidad', 'Mundo', 'Economía', 'Tecnología', 'Cultura', 'Deportes', 'Opinión']

export const MEGA = [
  { title: 'Secciones', links: ['Mundo', 'Economía', 'Tecnología', 'Cultura'] },
  { title: 'Temas', links: ['Energía limpia', 'Inteligencia artificial', 'Elecciones', 'Ciudades'] },
  { title: 'Autores y ediciones', links: ['Columnistas', 'Edición global', 'Edición América'] },
  { title: 'Tu cuenta', links: ['Guardados', 'Boletines', 'Ingresar'] },
]

export const SEARCH_DATA: [string, string][] = [
  ['El mundo reordena sus prioridades', 'Geopolítica'],
  ['Las ciudades que buscan reinventarse', 'Mundo'],
  ['La generación que cambia las reglas del trabajo', 'Sociedad'],
  ['Los mercados miran a Europa', 'Economía'],
  ['La inteligencia artificial cambia la forma de leer', 'Tecnología'],
  ['El arte latinoamericano conquista galerías', 'Cultura'],
  ['Qué hay detrás del auge de las energías limpias', 'Ciencia'],
]

export const RANKS = {
  hoy: [
    'El mapa de las nuevas alianzas que redefinen el tablero mundial',
    'Qué hay detrás del auge de las energías limpias',
    'La crónica de una elección que todos miran',
    'El idioma invisible de las redes sociales',
    'Guía para entender la economía de este otoño',
  ],
  sem: [
    'Guía para entender la economía de este otoño',
    'La generación que cambia las reglas del trabajo',
    'El mapa de las nuevas alianzas',
    'El arte latinoamericano en las galerías',
    'La inteligencia artificial y las noticias',
  ],
}

export type ForYou = { topic: string; title: string; time: string; art: string; alt: string }

export const FOR_YOU: ForYou[] = [
  { topic: 'Economía', title: 'Los mercados miran a Europa ante un nuevo ciclo de inversión', time: 'Hace 42 min', art: 'mercados', alt: 'Ilustración: gráfico de velas con tendencia al alza' },
  { topic: 'Tecnología', title: 'La inteligencia artificial cambia la forma de leer las noticias', time: 'Hace 1 h', art: 'ia', alt: 'Ilustración: un documento conectado a una red de nodos' },
  { topic: 'Cultura', title: 'El arte latinoamericano que está conquistando las galerías del mundo', time: 'Hace 2 h', art: 'arte', alt: 'Ilustración: composición abstracta con sol, montañas y arcos de colores' },
  { topic: 'Ciencia', title: 'Un nuevo método reduce a la mitad el costo de almacenar energía solar', time: 'Hace 3 h', art: 'energia', alt: 'Ilustración: aerogeneradores y paneles solares sobre colinas verdes' },
  { topic: 'Tecnología', title: 'Por qué los dispositivos duran menos y qué se puede hacer', time: 'Hace 4 h', art: 'dispositivos', alt: 'Ilustración: teléfono con batería baja rodeado de un ciclo de reparación' },
  { topic: 'Economía', title: 'El empleo joven vuelve a crecer en tres de cada cuatro países', time: 'Hace 5 h', art: 'empleo', alt: 'Ilustración: barras crecientes con figuras humanas encima' },
]

export const TOPICS = ['Economía', 'Tecnología', 'Ciencia', 'Cultura']

export const LIVE_INITIAL = [
  { time: '14:32', text: 'Se abre la sesión plenaria con la participación de 24 delegaciones.' },
  { time: '13:58', text: 'Los equipos técnicos presentan el borrador de la hoja de ruta.' },
  { time: '12:40', text: 'Llegan las primeras delegaciones; se esperan declaraciones al mediodía.' },
]

export const LIVE_NEXT = [
  'Los delegados confirman una segunda ronda de conversaciones para mañana.',
  'Se publica el comunicado conjunto con los primeros acuerdos.',
  'Los mercados reaccionan con cautela al anuncio.',
]

export const OPINION = [
  { art: 'av1', quote: '«Las ciudades no se reinventan con planos, sino con hábitos.»', name: 'Lucía Ferrer', topic: 'Urbanismo' },
  { art: 'av2', quote: '«El trabajo del futuro se negocia hoy, y casi nadie está en la mesa.»', name: 'Andrés Molina', topic: 'Economía' },
  { art: 'av3', quote: '«Leer despacio es una forma de resistencia informativa.»', name: 'Marta Quiroga', topic: 'Cultura' },
]

export const nowHM = () => {
  const d = new Date()
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
}
