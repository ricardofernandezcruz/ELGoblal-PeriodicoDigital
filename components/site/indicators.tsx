'use client'

import { useEffect, useState } from 'react'
import type { Indicadores } from '@/app/api/indicadores/route'
import { SITE_TZ } from '@/lib/site'

/* Franja superior: fecha, clima en Santo Domingo y dólar. Se carga en el navegador para no
   frenar la página; si las fuentes fallan, solo se ve la fecha. */

function sky(code: number): [string, 'sun' | 'moon' | 'cloud' | 'rain' | 'storm' | 'fog'] {
  if (code === 0) return ['Despejado', 'sun']
  if (code <= 2) return ['Parcialmente nublado', 'cloud']
  if (code === 3) return ['Nublado', 'cloud']
  if (code <= 48) return ['Niebla', 'fog']
  if (code <= 57) return ['Llovizna', 'rain']
  if (code <= 67) return ['Lluvia', 'rain']
  if (code <= 82) return ['Chubascos', 'rain']
  return ['Tormenta', 'storm']
}

const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 18z"/>',
  rain: '<path d="M7 15h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 15zM8 19l-1 2M12 19l-1 2M16 19l-1 2"/>',
  storm: '<path d="M7 15h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 15zM13 16l-2 3h3l-2 3"/>',
  fog: '<path d="M4 10h16M6 14h12M8 18h8"/>',
}

const money = (n: number) => n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function TopStrip() {
  const [d, setD] = useState<Indicadores | null>(null)
  const [today, setToday] = useState('')
  useEffect(() => {
    setToday(new Date().toLocaleDateString('es-DO', { timeZone: SITE_TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    fetch('/api/indicadores')
      .then((r) => (r.ok ? r.json() : null))
      .then(setD, () => null)
  }, [])
  const w = d?.weather
  const [desc, icon] = w ? sky(w.code) : (['', 'sun'] as const)
  return (
    <div className="border-b border-eg-rule text-xs text-eg-muted">
      <div className="mx-auto flex h-8 max-w-[1240px] items-center gap-4 overflow-hidden px-5 whitespace-nowrap max-[640px]:gap-3">
        <span className="capitalize max-[640px]:hidden">{today}</span>
        <span className="hidden capitalize max-[640px]:inline">{today.split(',')[0]}</span>
        {w && (
          <span className="inline-flex items-center gap-1.5" title={`${desc}. Máxima ${w.max}°, mínima ${w.min}°`}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: icon === 'sun' && !w.day ? ICONS.moon : ICONS[icon] }}
            />
            <b className="font-semibold text-eg-ink">{w.temp}°</b>
            <span className="max-[480px]:hidden">Santo Domingo</span>
            <span className="max-[900px]:hidden">
              · {w.max}° / {w.min}°
            </span>
          </span>
        )}
        {d?.usd && (
          <span className="ml-auto inline-flex items-center gap-1.5" title="Tasa de referencia del mercado; puede variar en bancos y casas de cambio">
            <span className="rounded bg-eg-surface px-1.5 py-0.5 text-[10px] font-semibold tracking-[.06em] uppercase">Dólar</span>
            <b className="font-semibold text-eg-ink">RD${money(d.usd.dop)}</b>
            <span className="max-[640px]:hidden">
              · Euro <b className="font-semibold text-eg-ink">RD${money(d.usd.eur)}</b>
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
