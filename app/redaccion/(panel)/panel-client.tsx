'use client'

import dynamic from 'next/dynamic'
import type { AdminData } from '@/lib/newsroom-types'
import type { CurrentUser } from '@/lib/session'

// El panel usa fechas relativas a "ahora": se renderiza solo en el cliente.
const Redaccion = dynamic(() => import('@/components/redaccion/shell'), { ssr: false })

export function PanelClient({ user, initial }: { user: CurrentUser; initial: AdminData }) {
  return <Redaccion user={user} initial={initial} />
}
