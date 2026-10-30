'use client'

import { useEffect, useState } from 'react'
import { formatDate, timeAgo } from '@/lib/site'

/** "Hace 12 min" en el navegador; fecha fija en el servidor para no desincronizar el HTML. */
export function TimeAgo({ date }: { date: string }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])
  return <time dateTime={date}>{now === null ? formatDate(date) : timeAgo(date, now)}</time>
}
