import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { settings } from '@/db/schema'
import { DEFAULT_SITE_INFO, type SiteInfo } from './site-info-shared'

export async function getSiteInfo(): Promise<SiteInfo> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, 'site'))
    const v = (row?.value ?? {}) as Partial<SiteInfo>
    return { ...DEFAULT_SITE_INFO, ...v, socials: { ...DEFAULT_SITE_INFO.socials, ...(v.socials ?? {}) } }
  } catch {
    return DEFAULT_SITE_INFO
  }
}
