export const ROLES = ['collaborator', 'writer', 'editor', 'admin'] as const
export type Role = (typeof ROLES)[number]
