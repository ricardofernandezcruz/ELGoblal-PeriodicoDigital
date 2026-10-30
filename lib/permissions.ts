/* Único lugar donde se decide qué puede hacer cada rol (panel → Equipo y permisos).
   Toda acción del servidor debe pasar por can() o requirePermission(). */
import type { Role } from '@/lib/roles'

export const PERMISSION_LABEL: Record<(typeof PERMISSIONS)[number], string> = {
  'article.create': 'Escribir notas propias',
  'article.editAny': 'Editar notas de otros',
  'article.publish': 'Publicar y programar',
  'home.manage': 'Gestionar la portada',
  'comment.moderate': 'Moderar comentarios',
  'team.manage': 'Administrar el equipo',
}

export const PERMISSIONS = [
  'article.create', // escribir notas propias
  'article.editAny', // editar notas de otros
  'article.publish', // publicar y programar
  'home.manage', // gestionar la portada
  'comment.moderate', // moderar comentarios
  'team.manage', // administrar el equipo
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const MATRIX: Record<Role, readonly Permission[]> = {
  collaborator: ['article.create'],
  writer: ['article.create'],
  editor: ['article.create', 'article.editAny', 'article.publish', 'home.manage', 'comment.moderate'],
  admin: PERMISSIONS,
}

export const ROLE_LABEL: Record<Role, string> = {
  collaborator: 'Colaborador',
  writer: 'Redactor',
  editor: 'Editor',
  admin: 'Administrador',
}

export function can(role: Role | null | undefined, p: Permission): boolean {
  return !!role && MATRIX[role]?.includes(p)
}

/** ¿Puede este usuario editar esta nota? Las propias siempre; las ajenas solo con article.editAny. */
export function canEditArticle(u: { id: string; role: Role }, a: { createdBy: string | null }) {
  return a.createdBy === u.id ? can(u.role, 'article.create') : can(u.role, 'article.editAny')
}
