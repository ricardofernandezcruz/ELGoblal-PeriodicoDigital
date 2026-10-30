/* Datos iniciales: secciones, firmas, ilustraciones de apoyo y el primer administrador.
   Se puede ejecutar varias veces: no duplica nada. Uso: pnpm db:seed */
import { hashPassword } from 'better-auth/crypto'
import { eq } from 'drizzle-orm'
import { db } from './index'
import { account, authors, media, sections, settings, user, type HomeSettings } from './schema'

const slug = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

const SECTIONS = ['Actualidad', 'Mundo', 'Economía', 'Tecnología', 'Ciencia', 'Cultura', 'Sociedad', 'Deportes', 'Opinión']
const AUTHORS = ['Redacción El Global']
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

async function main() {
  // Secciones
  await db
    .insert(sections)
    .values(SECTIONS.map((name, i) => ({ name, slug: slug(name), position: i })))
    .onConflictDoNothing()

  // Firmas
  await db
    .insert(authors)
    .values(AUTHORS.map((name) => ({ name, slug: slug(name) })))
    .onConflictDoNothing()

  // Ilustraciones incorporadas (la clave es el nombre de la ilustración)
  await db
    .insert(media)
    .values(MEDIA.map(([key, name, alt]) => ({ key, name, alt, width: 640, height: 360, mime: 'image/svg+xml' })))
    .onConflictDoNothing()

  // Portada
  const home: HomeSettings = {
    featured: [null, null, null],
    breaking: { on: false, text: '' },
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
      await db
        .insert(authors)
        .values({ name: process.env.SEED_ADMIN_NAME || 'Administrador', slug: slug(process.env.SEED_ADMIN_NAME || 'administrador'), userId: id })
        .onConflictDoNothing()
      console.log('Administrador creado:', email)
    } else console.log('El administrador ya existía:', email)
  } else console.log('Sin SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD: no se creó ningún usuario.')

  console.log('Datos iniciales listos.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
