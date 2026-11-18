'use server'

/* Acciones de publicidad del panel (permiso ads.manage: editores y administradores). */
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { adCampaigns, adStats, auditLog } from '@/db/schema'
import { adDay, PLACEMENT_IDS, type AdminAd, type AdReport, type Placement } from '@/lib/ads-shared'
import type { ActionResult } from '@/lib/newsroom-types'
import { ForbiddenError, requirePermission, type CurrentUser } from '@/lib/session'
import { deleteObject } from '@/lib/storage'

class UserError extends Error {}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof UserError) return { ok: false, error: e.message }
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message || 'Hay datos con un formato no válido. Revisa los campos.' }
    console.error('[publicidad]', e)
    return { ok: false, error: 'No se pudo completar la acción. Inténtalo de nuevo en un momento.' }
  }
}

const audit = (u: CurrentUser, action: string, entityId: string | null, data?: unknown) =>
  db.insert(auditLog).values({ userId: u.id, action, entity: 'ad', entityId, data: data ?? null })

/** Los anuncios salen en páginas en caché: al cambiar una campaña se regeneran. */
const refresh = () => revalidatePath('/', 'layout')

const since30 = () => adDay(new Date(Date.now() - 29 * 864e5))

export async function listAds(): Promise<ActionResult<AdminAd[]>> {
  return run(async () => {
    await requirePermission('ads.manage')
    const [rows, stats] = await Promise.all([
      db.select().from(adCampaigns).orderBy(desc(adCampaigns.updatedAt)),
      db
        .select({ id: adStats.campaignId, views: sql<number>`sum(${adStats.views})::int`, clicks: sql<number>`sum(${adStats.clicks})::int` })
        .from(adStats)
        .where(gte(adStats.day, since30()))
        .groupBy(adStats.campaignId),
    ])
    const by = new Map(stats.map((s) => [s.id, s]))
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      advertiser: r.advertiser,
      url: r.url,
      alt: r.alt,
      paused: r.paused,
      startsAt: r.startsAt?.toISOString() ?? null,
      endsAt: r.endsAt?.toISOString() ?? null,
      placements: r.placements.filter((p): p is Placement => PLACEMENT_IDS.includes(p as Placement)),
      sections: r.sections,
      weight: r.weight,
      desktop: r.desktop,
      mobile: r.mobile,
      views: by.get(r.id)?.views ?? 0,
      clicks: by.get(r.id)?.clicks ?? 0,
    }))
  })
}

// Los archivos solo pueden venir de nuestro almacenamiento (R2) o, en desarrollo, de /uploads.
const fileUrl = z
  .string()
  .max(500)
  .refine((u) => {
    const pub = process.env.R2_PUBLIC_URL?.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '')
    return (!!pub && u.startsWith(pub + '/')) || (process.env.NODE_ENV !== 'production' && u.startsWith('/uploads/'))
  }, 'Sube el archivo desde el panel.')
const creative = z.object({ type: z.enum(['image', 'video']), url: fileUrl, w: z.number().int().min(1).max(10000), h: z.number().int().min(1).max(10000) }).nullable()

const adSchema = z
  .object({
    id: z.uuid().nullable(),
    name: z.string().trim().min(2, 'Ponle un nombre a la campaña.').max(120),
    advertiser: z.string().trim().max(120),
    url: z
      .string()
      .trim()
      .max(1000)
      .refine((u) => {
        try {
          const x = new URL(u)
          return x.protocol === 'https:' || x.protocol === 'http:'
        } catch {
          return false
        }
      }, 'El enlace de destino debe empezar por https://'),
    alt: z.string().trim().max(300),
    paused: z.boolean(),
    startsAt: z.iso.datetime({ offset: true }).nullable(),
    endsAt: z.iso.datetime({ offset: true }).nullable(),
    placements: z.array(z.enum(PLACEMENT_IDS as [Placement, ...Placement[]])).min(1, 'Elige al menos un espacio.'),
    sections: z.array(z.string().max(80)).max(30),
    weight: z.number().int().min(1).max(5),
    desktop: creative,
    mobile: creative,
  })
  .refine((d) => d.desktop || d.mobile, 'Sube al menos una imagen o un video.')
  .refine((d) => !d.startsAt || !d.endsAt || d.startsAt < d.endsAt, 'La fecha de fin debe ser posterior a la de inicio.')

export async function saveAd(input: z.input<typeof adSchema>): Promise<ActionResult<string>> {
  return run(async () => {
    const u = await requirePermission('ads.manage')
    const d = adSchema.parse(input)
    const values = {
      name: d.name,
      advertiser: d.advertiser,
      url: d.url,
      alt: d.alt,
      paused: d.paused,
      startsAt: d.startsAt ? new Date(d.startsAt) : null,
      endsAt: d.endsAt ? new Date(d.endsAt) : null,
      placements: [...new Set(d.placements)],
      sections: [...new Set(d.sections)],
      weight: d.weight,
      desktop: d.desktop,
      mobile: d.mobile,
    }
    let id = d.id
    if (id) {
      const [old] = await db.select({ desktop: adCampaigns.desktop, mobile: adCampaigns.mobile }).from(adCampaigns).where(eq(adCampaigns.id, id))
      if (!old) throw new UserError('Esa campaña ya no existe.')
      await db.update(adCampaigns).set(values).where(eq(adCampaigns.id, id))
      // Los archivos que se reemplazaron se borran del almacenamiento.
      for (const f of [old.desktop, old.mobile]) if (f && f.url !== d.desktop?.url && f.url !== d.mobile?.url) await deleteObject(f.url).catch(() => null)
    } else {
      ;[{ id }] = await db.insert(adCampaigns).values({ ...values, createdBy: u.id }).returning({ id: adCampaigns.id })
    }
    await audit(u, d.id ? 'ad.update' : 'ad.create', id, { name: d.name })
    refresh()
    return id!
  })
}

export async function setAdPaused(id: string, paused: boolean): Promise<ActionResult<void>> {
  return run(async () => {
    const u = await requirePermission('ads.manage')
    await db.update(adCampaigns).set({ paused }).where(eq(adCampaigns.id, z.uuid().parse(id)))
    await audit(u, paused ? 'ad.pause' : 'ad.resume', id)
    refresh()
  })
}

export async function deleteAd(id: string): Promise<ActionResult<void>> {
  return run(async () => {
    const u = await requirePermission('ads.manage')
    const [c] = await db.delete(adCampaigns).where(eq(adCampaigns.id, z.uuid().parse(id))).returning()
    if (!c) return
    for (const f of [c.desktop, c.mobile]) if (f) await deleteObject(f.url).catch(() => null)
    await audit(u, 'ad.delete', id, { name: c.name })
    refresh()
  })
}

/** Informe para el anunciante: totales, por espacio y por día (últimos 60 días). */
export async function adReport(id: string): Promise<ActionResult<AdReport>> {
  return run(async () => {
    await requirePermission('ads.manage')
    const cid = z.uuid().parse(id)
    const from = adDay(new Date(Date.now() - 59 * 864e5))
    const where = and(eq(adStats.campaignId, cid), gte(adStats.day, from))
    const sum = { views: sql<number>`sum(${adStats.views})::int`, clicks: sql<number>`sum(${adStats.clicks})::int` }
    const [byPlacement, byDay] = await Promise.all([
      db.select({ placement: adStats.placement, ...sum }).from(adStats).where(where).groupBy(adStats.placement),
      db.select({ day: adStats.day, ...sum }).from(adStats).where(where).groupBy(adStats.day).orderBy(desc(adStats.day)),
    ])
    return {
      views: byPlacement.reduce((n, r) => n + r.views, 0),
      clicks: byPlacement.reduce((n, r) => n + r.clicks, 0),
      byPlacement: byPlacement.sort((a, b) => b.views - a.views),
      byDay,
    }
  })
}

