/* Modelo de contenido de El Global (guía §11). */
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { user } from './auth-schema'

export * from './auth-schema'

const created = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updated = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

/* ---------- Secciones y autores ---------- */

export const sections = pgTable('sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  inMenu: boolean('in_menu').notNull().default(true),
  createdAt: created(),
})

/** Firma pública: puede ser una persona del equipo o una firma colectiva ("Redacción Global"). */
export const authors = pgTable('authors', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  bio: text('bio'),
  avatarId: uuid('avatar_id').references((): AnyPgColumn => media.id, { onDelete: 'set null' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  createdAt: created(),
})

/* ---------- Multimedia ---------- */

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Clave en el almacenamiento (R2) o nombre de ilustración incorporada. */
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  alt: text('alt').notNull().default(''),
  width: integer('width'),
  height: integer('height'),
  mime: text('mime'),
  bytes: integer('bytes'),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: created(),
})

/* ---------- Notas ---------- */

export const articleStatus = pgEnum('article_status', ['draft', 'review', 'scheduled', 'published'])

/** Bloques del editor, guardados en orden dentro de la nota. */
export type ArticleBlock =
  | { id: string; t: 'p'; v: string }
  | { id: string; t: 'sub'; v: string }
  | { id: string; t: 'img'; mediaId: string | null; src: string; alt: string; cap?: string }
  | { id: string; t: 'quote'; v: string; who?: string }
  | { id: string; t: 'video'; u: string; vert: boolean; cap?: string }
  | { id: string; t: 'data'; n: string; l: string }
  | { id: string; t: 'sum'; v: string }

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    title: text('title').notNull().default(''),
    lead: text('lead').notNull().default(''),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => sections.id, { onDelete: 'restrict' }),
    authorId: uuid('author_id').references(() => authors.id, { onDelete: 'set null' }),
    heroId: uuid('hero_id').references(() => media.id, { onDelete: 'set null' }),
    blocks: jsonb('blocks').$type<ArticleBlock[]>().notNull().default([]),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    seoDescription: text('seo_description').notNull().default(''),
    status: articleStatus('status').notNull().default('draft'),
    /** Hora de salida de una nota programada. */
    publishAt: timestamp('publish_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    allowComments: boolean('allow_comments').notNull().default(true),
    inNewsletter: boolean('in_newsletter').notNull().default(false),
    breaking: boolean('breaking').notNull().default(false),
    reads: integer('reads').notNull().default(0),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex('articles_section_slug_idx').on(t.sectionId, t.slug),
    index('articles_status_published_idx').on(t.status, t.publishedAt),
    index('articles_publish_at_idx').on(t.publishAt).where(sql`${t.status} = 'scheduled'`),
    check('articles_scheduled_has_date', sql`${t.status} <> 'scheduled' OR ${t.publishAt} IS NOT NULL`),
  ],
)

/** Copias de una nota: se guardan solas al escribir y al publicar. */
export const articleVersions = pgTable(
  'article_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    snapshot: jsonb('snapshot')
      .$type<{ title: string; lead: string; blocks: ArticleBlock[]; tags: string[] }>()
      .notNull(),
    manual: boolean('manual').notNull().default(false),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: created(),
  },
  (t) => [index('article_versions_article_idx').on(t.articleId, t.createdAt)],
)

/* ---------- Comentarios ---------- */

export const commentStatus = pgEnum('comment_status', ['pending', 'approved', 'rejected', 'spam'])

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),
    authorName: text('author_name').notNull(),
    authorEmail: text('author_email'),
    body: text('body').notNull(),
    status: commentStatus('status').notNull().default('pending'),
    /** Marcado automático de posible spam, para ordenar la moderación. */
    flaggedSpam: boolean('flagged_spam').notNull().default(false),
    helpful: integer('helpful').notNull().default(0),
    moderatedBy: text('moderated_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: created(),
  },
  (t) => [index('comments_article_status_idx').on(t.articleId, t.status), index('comments_status_idx').on(t.status)],
)

/* ---------- Newsletter ---------- */

export const subscribers = pgTable('subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  topics: text('topics').array().notNull().default(sql`'{}'::text[]`),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  createdAt: created(),
})

/* ---------- Portada y ajustes del sitio ---------- */

export type HomeSettings = {
  /** Notas destacadas: id fijo o null para que el sistema elija la más leída. */
  featured: (string | null)[]
  breaking: { on: boolean; text: string }
}

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
  updatedAt: updated(),
})

/* ---------- Auditoría ---------- */

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    data: jsonb('data'),
    createdAt: created(),
  },
  (t) => [index('audit_log_entity_idx').on(t.entity, t.entityId), index('audit_log_created_idx').on(t.createdAt)],
)

/* ---------- Video ---------- */

export const videoStatus = pgEnum('video_status', ['draft', 'published'])

/** Videos de la redacción: un archivo propio (R2) o un video de YouTube. Separados de las notas. */
export const videos = pgTable(
  'videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    /** Categoría del área de video (usa las secciones del periódico). */
    sectionId: uuid('section_id').references(() => sections.id, { onDelete: 'set null' }),
    authorId: uuid('author_id').references(() => authors.id, { onDelete: 'set null' }),
    /** URL del archivo subido (mp4/webm) o null si es de YouTube. */
    fileUrl: text('file_url'),
    youtubeId: text('youtube_id'),
    vertical: boolean('vertical').notNull().default(false),
    /** Imagen de portada; si es de YouTube y no hay, se usa la miniatura de YouTube. */
    posterId: uuid('poster_id').references(() => media.id, { onDelete: 'set null' }),
    durationSec: integer('duration_sec'),
    featured: boolean('featured').notNull().default(false),
    status: videoStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    views: integer('views').notNull().default(0),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index('videos_status_published_idx').on(t.status, t.publishedAt),
    check('videos_has_source', sql`${t.fileUrl} IS NOT NULL OR ${t.youtubeId} IS NOT NULL`),
  ],
)

/** Canales de YouTube de redactores (p. ej. Deportes, Podcast) que se muestran en el área de video. */
export const videoChannels = pgTable('video_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  /** Etiqueta corta que ve el lector: "Deportes", "Podcast"… */
  label: text('label').notNull(),
  /** Nombre del programa o canal. */
  name: text('name').notNull(),
  youtubeChannelId: text('youtube_channel_id').notNull(),
  url: text('url').notNull(),
  spotifyShowId: text('spotify_show_id'),
  /** Redactor responsable (su firma). */
  authorId: uuid('author_id').references(() => authors.id, { onDelete: 'set null' }),
  position: integer('position').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: created(),
})
