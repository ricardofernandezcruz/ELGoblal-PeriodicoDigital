/* Formas de datos que viajan entre el servidor y el panel de redacción. */
import type { Role } from '@/lib/roles'

export type Status = 'pub' | 'sch' | 'rev' | 'draft'
export const DB_STATUS = { pub: 'published', sch: 'scheduled', rev: 'review', draft: 'draft' } as const
export const UI_STATUS = { published: 'pub', scheduled: 'sch', review: 'rev', draft: 'draft' } as const

export type AdminNews = {
  id: string
  t: string
  slug: string
  sec: string
  secSlug: string
  au: string
  st: Status
  /** Fecha de publicación o, si está programada, de salida. */
  d: string | null
  r: number
  art: string
  createdBy: string | null
}

export type BlockType = 'p' | 'sub' | 'img' | 'quote' | 'video' | 'data' | 'sum' | 'poll'
export type Block = {
  id: string
  t: BlockType
  v?: string
  who?: string
  mediaId?: string | null
  src?: string
  alt?: string
  cap?: string
  u?: string
  vert?: boolean
  n?: string
  l?: string
  /** Encuesta: pregunta y opciones. */
  q?: string
  opts?: string[]
}

export type EditorPayload = {
  id: string | null
  title: string
  lead: string
  sectionId: string
  authorId: string | null
  tags: string[]
  slug: string
  seo: string
  blocks: Block[]
  status: Status
  when: string | null
  com: boolean
  news: boolean
  flash: boolean
  live: boolean
  createdBy: string | null
}

export type AdminVersion = { id: string; at: string; manual: boolean; title: string; blocks: number }
/** Dónde aparece una imagen. live = el público la ve (nota publicada o programada, video publicado, foto de firma). */
export type MediaUse = { k: 'art' | 'vid' | 'au'; id: string; t: string; live: boolean }
/** s = URL o ilustración · n = nombre · a = texto alternativo · c = crédito · d = en la papelera desde · by = quién la subió */
export type AdminMedia = { id: string; s: string; n: string; a: string; c: string; d: string | null; by: string | null; use: MediaUse[] }
export type AdminComment = { id: string; who: string; text: string; on: string; spam: boolean; at: string }
export type AdminSection = { id: string; name: string; slug: string; inMenu: boolean }
export type AdminAuthor = { id: string; name: string }
export type AdminUser = { id: string; name: string; email: string; role: Role; twoFactor: boolean; image: string | null; bio: string }
export type AdminHome = { featured: (string | null)[]; breaking: { on: boolean; text: string } }
export type AdminStats = { published: number; publishedMonth: number; reads: number; subscribers: number; pending: number }

export type AdminData = {
  news: AdminNews[]
  media: AdminMedia[]
  comments: AdminComment[]
  sections: AdminSection[]
  authors: AdminAuthor[]
  team: AdminUser[]
  home: AdminHome
  stats: AdminStats
  videos: AdminVideo[]
  channels: AdminChannel[]
}

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }

export type AdminVideo = {
  id: string
  slug: string
  title: string
  description: string
  sectionId: string | null
  authorId: string | null
  fileUrl: string | null
  youtubeId: string | null
  vertical: boolean
  posterId: string | null
  poster: string | null
  featured: boolean
  status: 'draft' | 'published'
  publishedAt: string | null
  views: number
  /** En la papelera desde esta fecha. */
  deletedAt: string | null
}

export type AdminChannel = {
  id: string
  slug: string
  label: string
  name: string
  youtubeChannelId: string
  url: string
  spotifyShowId: string | null
  authorId: string | null
  position: number
  active: boolean
}
