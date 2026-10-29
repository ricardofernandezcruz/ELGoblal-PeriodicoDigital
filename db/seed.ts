/* Datos iniciales: secciones, firmas, ilustraciones, notas del prototipo y el primer administrador.
   Se puede ejecutar varias veces: no duplica nada. Uso: pnpm db:seed */
import { hashPassword } from 'better-auth/crypto'
import { eq } from 'drizzle-orm'
import { db } from './index'
import { account, articles, authors, media, sections, settings, user, type ArticleBlock, type HomeSettings } from './schema'

const slug = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
const daysAgo = (d: number, h: number, m = 0) => {
  const x = new Date()
  x.setDate(x.getDate() - d)
  x.setHours(h, m, 0, 0)
  return x
}

const SECTIONS = ['Actualidad', 'Mundo', 'Economía', 'Tecnología', 'Ciencia', 'Cultura', 'Sociedad', 'Deportes', 'Opinión']
const AUTHORS = ['Redacción Global', 'Lucía Ferrer', 'Andrés Molina', 'Marta Quiroga', 'Carla Méndez']
const MEDIA: [string, string, string][] = [
  ['skyline', 'Ciudad de noche', 'Vista nocturna de una ciudad con rascacielos iluminados'],
  ['ciudades', 'Ciudad verde', 'Ciudad con azoteas verdes y un tranvía'],
  ['mercados', 'Mercados', 'Gráfico de velas con tendencia al alza'],
  ['energia', 'Energía limpia', 'Aerogeneradores y paneles solares sobre colinas'],
  ['ia', 'Inteligencia artificial', 'Un documento conectado a una red de nodos'],
  ['arte', 'Arte abstracto', 'Composición abstracta con sol, montañas y arcos de colores'],
  ['trabajo', 'Escritorio', 'Escritorio con laptop, calendario y planta'],
  ['empleo', 'Empleo', 'Barras crecientes con figuras humanas'],
  ['dispositivos', 'Dispositivos', 'Teléfono con batería baja rodeado de un ciclo de reparación'],
]

const body = (heroId: string, alt: string): ArticleBlock[] => [
  { id: 'b1', t: 'img', mediaId: heroId, alt, cap: 'Ilustración.' },
  { id: 'b2', t: 'p', v: 'Durante años, la agenda internacional se movió por impulsos: una crisis desplazaba a la anterior y casi nunca quedaba tiempo para planificar. Esta semana, las principales delegaciones coincidieron en que el método tiene que cambiar.' },
  { id: 'b3', t: 'p', v: 'El acuerdo no resuelve ninguna disputa concreta, pero fija un calendario de reuniones técnicas y una lista de temas comunes. Para los analistas, ese orden previo es lo más importante.' },
  { id: 'b4', t: 'sub', v: 'Tres prioridades sobre la mesa' },
  { id: 'b5', t: 'p', v: 'La primera es la energía: cómo asegurar el suministro sin frenar la transición. La segunda es la tecnología. La tercera es la cooperación financiera para los países con menos margen.' },
]

type Seed = { t: string; lead: string; sec: string; au: string; st: 'published' | 'scheduled' | 'review' | 'draft'; at: Date | null; r: number; art: string }
const ARTICLES: Seed[] = [
  { t: 'El mundo reordena sus prioridades ante una nueva era de incertidumbre', lead: 'Las grandes potencias abren una etapa de diálogo para afrontar los desafíos que definirán la próxima década.', sec: 'Mundo', au: 'Redacción Global', st: 'published', at: daysAgo(0, 8, 10), r: 18420, art: 'skyline' },
  { t: 'Una conversación pendiente: las ciudades que buscan reinventarse', lead: 'Nuevas ideas para vivir mejor en un planeta que cambia a velocidad inédita.', sec: 'Mundo', au: 'Lucía Ferrer', st: 'published', at: daysAgo(0, 7, 50), r: 7210, art: 'ciudades' },
  { t: 'Los mercados miran a Europa ante un nuevo ciclo de inversión', lead: 'Qué cambia para los inversores pequeños.', sec: 'Economía', au: 'Andrés Molina', st: 'published', at: daysAgo(0, 7, 30), r: 9310, art: 'mercados' },
  { t: 'La inteligencia artificial cambia la forma de leer las noticias', lead: 'Los lectores ya no llegan solo desde la portada.', sec: 'Tecnología', au: 'Lucía Ferrer', st: 'published', at: daysAgo(1, 18), r: 12755, art: 'ia' },
  { t: 'El empleo joven vuelve a crecer en tres de cada cuatro países', lead: 'Las cifras más altas en una década.', sec: 'Economía', au: 'Andrés Molina', st: 'published', at: daysAgo(2, 9, 10), r: 6480, art: 'empleo' },
  { t: 'Por qué los dispositivos duran menos y qué se puede hacer', lead: 'Reparar vuelve a estar de moda.', sec: 'Tecnología', au: 'Marta Quiroga', st: 'published', at: daysAgo(2, 12), r: 4120, art: 'dispositivos' },
  { t: 'Un nuevo método reduce a la mitad el costo de almacenar energía solar', lead: 'Un avance que podría acelerar la transición.', sec: 'Ciencia', au: 'Marta Quiroga', st: 'scheduled', at: daysAgo(-1, 7, 30), r: 0, art: 'energia' },
  { t: 'El arte latinoamericano que está conquistando las galerías del mundo', lead: 'Una generación de artistas cambia el mapa del mercado.', sec: 'Cultura', au: 'Marta Quiroga', st: 'scheduled', at: daysAgo(-3, 18), r: 0, art: 'arte' },
  { t: 'La generación que está cambiando las reglas del trabajo', lead: 'Horarios, oficinas y carreras: todo está en discusión.', sec: 'Sociedad', au: 'Andrés Molina', st: 'review', at: null, r: 0, art: 'trabajo' },
]

async function main() {
  // Secciones
  await db
    .insert(sections)
    .values(SECTIONS.map((name, i) => ({ name, slug: slug(name), position: i })))
    .onConflictDoNothing()
  const secs = Object.fromEntries((await db.select().from(sections)).map((s) => [s.name, s.id]))

  // Firmas
  await db
    .insert(authors)
    .values(AUTHORS.map((name) => ({ name, slug: slug(name) })))
    .onConflictDoNothing()
  const auths = Object.fromEntries((await db.select().from(authors)).map((a) => [a.name, a.id]))

  // Ilustraciones incorporadas (la clave es el nombre de la ilustración)
  await db
    .insert(media)
    .values(MEDIA.map(([key, name, alt]) => ({ key, name, alt, width: 640, height: 360, mime: 'image/svg+xml' })))
    .onConflictDoNothing()
  const meds = Object.fromEntries((await db.select().from(media)).map((m) => [m.key, m]))

  // Notas
  for (const a of ARTICLES) {
    const m = meds[a.art]
    await db
      .insert(articles)
      .values({
        slug: slug(a.t),
        title: a.t,
        lead: a.lead,
        sectionId: secs[a.sec],
        authorId: auths[a.au],
        heroId: m.id,
        blocks: body(m.id, m.alt),
        tags: ['actualidad'],
        seoDescription: a.lead,
        status: a.st,
        publishAt: a.st === 'scheduled' ? a.at : null,
        publishedAt: a.st === 'published' ? a.at : null,
        reads: a.r,
      })
      .onConflictDoNothing()
  }

  // Portada
  const home: HomeSettings = {
    featured: [null, null, null],
    breaking: { on: true, text: 'Cumbre global: las grandes potencias acuerdan una hoja de ruta de diálogo.' },
  }
  await db.insert(settings).values({ key: 'home', value: home }).onConflictDoNothing()

  // Primer administrador
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (email && password) {
    if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD debe tener al menos 12 caracteres.')
    const [existing] = await db.select().from(user).where(eq(user.email, email))
    if (!existing) {
      const id = crypto.randomUUID()
      const now = new Date()
      await db.insert(user).values({ id, email, name: process.env.SEED_ADMIN_NAME || 'Administrador', role: 'admin', emailVerified: true })
      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: id,
        providerId: 'credential',
        userId: id,
        password: await hashPassword(password),
        updatedAt: now,
      })
      console.log('Administrador creado:', email)
    } else console.log('El administrador ya existía:', email)
  } else console.log('Sin SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD: no se creó ningún usuario.')

  console.log('Datos iniciales listos.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
