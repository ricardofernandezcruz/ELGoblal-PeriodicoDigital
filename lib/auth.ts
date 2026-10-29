import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { twoFactor } from 'better-auth/plugins'
import { db } from '@/db'
import * as schema from '@/db/auth-schema'

export const auth = betterAuth({
  appName: 'El Global',
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
      rateLimit: schema.rateLimit,
    },
  }),
  // Solo por invitación: nadie puede crearse una cuenta de redacción desde fuera.
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
  user: {
    additionalFields: {
      // input:false impide que el cliente cambie su propio rol.
      role: { type: 'string', required: false, defaultValue: 'collaborator', input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 12, // jornada de 12 h
    updateAge: 60 * 60,
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/two-factor/*': { window: 60, max: 5 },
    },
  },
  advanced: {
    database: { generateId: () => crypto.randomUUID() },
  },
  plugins: [twoFactor({ issuer: 'El Global' }), nextCookies()],
})

export type Session = typeof auth.$Infer.Session
