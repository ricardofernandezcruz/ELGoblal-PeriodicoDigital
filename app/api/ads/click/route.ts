import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { adCampaigns } from '@/db/schema'
import { countAd } from '@/lib/ads'
import { PLACEMENT_IDS } from '@/lib/ads-shared'
import { allow, LIMITS } from '@/lib/rate-limit'

/** Clic en un anuncio: se cuenta y se redirige al anunciante. El destino sale de la base de datos,
    nunca de la URL, así este enlace no se puede usar para redirigir a otro sitio. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  const id = z.uuid().safeParse(q.get('c'))
  const p = q.get('p') ?? ''
  if (!id.success) return NextResponse.redirect(new URL('/', req.url))
  const [c] = await db.select({ url: adCampaigns.url }).from(adCampaigns).where(eq(adCampaigns.id, id.data))
  if (!c || !/^https?:\/\//.test(c.url)) return NextResponse.redirect(new URL('/', req.url))
  if (PLACEMENT_IDS.includes(p as never) && (await allow(LIMITS.counter))) await countAd(id.data, p, 'clicks').catch(() => null)
  return NextResponse.redirect(c.url, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
}
