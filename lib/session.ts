import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Role } from '@/lib/roles'
import { auth } from './auth'
import { can, type Permission } from './permissions'

export type CurrentUser = { id: string; name: string; email: string; role: Role; twoFactorEnabled: boolean }

export async function getUser(): Promise<CurrentUser | null> {
  const s = await auth.api.getSession({ headers: await headers() })
  if (!s) return null
  const u = s.user as typeof s.user & { role?: Role; twoFactorEnabled?: boolean | null }
  return { id: u.id, name: u.name, email: u.email, role: u.role ?? 'collaborator', twoFactorEnabled: !!u.twoFactorEnabled }
}

/** Para páginas: sin sesión, al login. */
export async function requireUser(): Promise<CurrentUser> {
  const u = await getUser()
  if (!u) redirect('/redaccion/login')
  return u
}

export class ForbiddenError extends Error {
  constructor() {
    super('No tienes permiso para hacer esto. Pide acceso a un editor.')
  }
}

/** Para Server Actions: comprueba sesión y permiso antes de tocar datos. */
export async function requirePermission(p: Permission): Promise<CurrentUser> {
  const u = await getUser()
  if (!u || !can(u.role, p)) throw new ForbiddenError()
  return u
}
