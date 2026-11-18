import 'server-only'
import { and, arrayOverlaps, eq, gt, isNull, lte, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { adCampaigns, adStats } from '@/db/schema'
import { adDay, type AdMap, type Placement } from './ads-shared'

/** Campañas activas para esos espacios (y esa sección, si se indica), agrupadas por espacio. */
export async function getAds(placements: Placement[], section?: string): Promise<AdMap> {
  const now = new Date()
  const rows = await db
    .select()
    .from(adCampaigns)
    .where(
      and(
        eq(adCampaigns.paused, false),
        or(isNull(adCampaigns.startsAt), lte(adCampaigns.startsAt, now)),
        or(isNull(adCampaigns.endsAt), gt(adCampaigns.endsAt, now)),
        arrayOverlaps(adCampaigns.placements, placements),
        section ? or(sql`cardinality(${adCampaigns.sections}) = 0`, arrayOverlaps(adCampaigns.sections, [section])) : sql`cardinality(${adCampaigns.sections}) = 0`,
      ),
    )
    .catch(() => [])
  const map: AdMap = {}
  for (const p of placements) {
    const list = rows
      .filter((r) => r.placements.includes(p) && (r.desktop || r.mobile))
      .map((r) => ({ id: r.id, alt: r.alt, advertiser: r.advertiser, weight: r.weight, endsAt: r.endsAt?.toISOString() ?? null, desktop: r.desktop, mobile: r.mobile }))
    if (list.length) map[p] = list
  }
  return map
}

/** Suma una vista o un clic al día de hoy. */
export async function countAd(campaignId: string, placement: string, kind: 'views' | 'clicks') {
  await db
    .insert(adStats)
    .values({ campaignId, placement, day: adDay(), [kind]: 1 })
    .onConflictDoUpdate({ target: [adStats.campaignId, adStats.day, adStats.placement], set: { [kind]: sql`${adStats[kind]} + 1` } })
}
