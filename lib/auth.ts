import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { twoFactor } from 'better-auth/plugins'
import { db } from '@/db'
import * as schema from '@/db/auth-schema'
import { button, esc, layout, sendEmail } from '@/lib/email'
import { siteUrl } from '@/lib/site-url'

// En Vercel: dominio de producción, URL de la rama y URL de cada despliegue de prueba.
const https = (h?: string) => (h ? `https://${h}` : undefined)
const prod = https(process.env.VERCEL_PROJECT_PRODUCTION_URL)
const preview = https(process.env.VERCEL_BRANCH_URL) ?? https(process.env.VERCEL_URL)
const vercelOrigins = [prod, https(process.env.VERCEL_BRANCH_URL), https(process.env.VERCEL_URL)].filter((o): o is string => !!o)

export const auth = betterAuth({
  appName: 'El Global',
  secret: process.env.BETTER_AUTH_SECRET,
  // Sin BETTER_AUTH_URL se usa la URL de Vercel: la de producción o la del despliegue de prueba.
  baseURL: process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_ENV === 'production' ? prod : preview),
  trustedOrigins: vercelOrigins,
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
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    // Recuperar contraseña: enlace válido 1 h; al cambiarla se cierran todas las sesiones abiertas.
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      const link = `${siteUrl()}/redaccion/login?token=${encodeURIComponent(token)}`
      await sendEmail({
        to: user.email,
        subject: 'Cambia tu contraseña de El Global',
        text: `Hola, ${user.name}:\n\nPediste cambiar tu contraseña del panel de redacción. Abre este enlace (vale 1 hora):\n${link}\n\nSi no fuiste tú, ignora este correo: tu contraseña sigue igual.`,
        html: layout({
          preheader: 'Enlace para cambiar tu contraseña (vale 1 hora)',
          body: `<p style="margin:0 0 14px;font-size:18px">Hola, ${esc(user.name)}:</p>
<p style="margin:0 0 22px;font-size:16px;line-height:1.55">Pediste cambiar tu contraseña del panel de redacción. El enlace vale <b>1 hora</b>.</p>
<p style="margin:0 0 22px">${button(link, 'Elegir una contraseña nueva')}</p>`,
          footer: 'Si no fuiste tú, ignora este correo: tu contraseña sigue igual. Nadie de El Global te pedirá nunca tu contraseña.',
        }),
      })
    },
  },
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
      '/request-password-reset': { window: 300, max: 3 },
      '/reset-password': { window: 60, max: 5 },
    },
  },
  advanced: {
    database: { generateId: () => crypto.randomUUID() },
  },
  plugins: [twoFactor({ issuer: 'El Global' }), nextCookies()],
})

export type Session = typeof auth.$Infer.Session
