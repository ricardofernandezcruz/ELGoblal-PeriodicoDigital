'use client'

import dynamic from 'next/dynamic'
import type { CurrentUser } from '@/lib/session'

// El panel usa fechas relativas a "ahora": se renderiza solo en el cliente.
const Redaccion = dynamic(() => import('@/components/redaccion/shell'), { ssr: false })

export function PanelClient({ user }: { user: CurrentUser }) {
  return <Redaccion user={user} />
}
