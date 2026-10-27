'use client'

import dynamic from 'next/dynamic'

// El panel usa fechas relativas a "ahora": se renderiza solo en el cliente.
const Redaccion = dynamic(() => import('@/components/redaccion/shell'), { ssr: false })

export default function Page() {
  return <Redaccion />
}
