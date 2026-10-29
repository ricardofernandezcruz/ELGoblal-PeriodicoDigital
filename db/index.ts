import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

/** Cliente HTTP de Neon: funciona igual en Vercel, Cloudflare Workers y Node. */
function connect() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Falta DATABASE_URL. Cópiala de Neon en .env.local (ver .env.example).')
  return drizzle(neon(url), { schema, casing: 'snake_case' })
}

export type DB = ReturnType<typeof connect>

let client: DB | undefined

/** La conexión se crea al primer uso, así la build no necesita la base de datos. */
export const db = new Proxy({} as DB, {
  get(_, prop) {
    client ??= connect()
    const v = Reflect.get(client, prop, client)
    return typeof v === 'function' ? v.bind(client) : v
  },
})
