import type { Metadata } from 'next'
import { getAdminData } from '@/lib/newsroom'
import { requireUser } from '@/lib/session'
import { PanelClient } from './panel-client'

export const metadata: Metadata = { title: 'Panel de redacción · El Global', robots: { index: false } }

export default async function Page() {
  const user = await requireUser()
  const initial = await getAdminData()
  return <PanelClient user={user} initial={initial} />
}
