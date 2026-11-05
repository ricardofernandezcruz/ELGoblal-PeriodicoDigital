import { NextResponse } from 'next/server'

/* Clima de Santo Domingo (Open-Meteo, CC BY 4.0) y tasa del dólar (ExchangeRate-API, referencia de mercado).
   Fuentes gratuitas y sin claves; se guardan en caché para no consultarlas en cada visita. */

export const revalidate = 1800

export type Indicadores = {
  weather: { temp: number; max: number; min: number; code: number; day: boolean } | null
  usd: { dop: number; eur: number; at: string } | null
}

async function weather(): Promise<Indicadores['weather']> {
  const r = await fetch(
    'https://api.open-meteo.com/v1/forecast?latitude=18.4861&longitude=-69.9312&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=America%2FSanto_Domingo',
    { next: { revalidate: 1800 }, signal: AbortSignal.timeout(5000) },
  )
  if (!r.ok) return null
  const d = await r.json()
  return {
    temp: Math.round(d.current.temperature_2m),
    max: Math.round(d.daily.temperature_2m_max[0]),
    min: Math.round(d.daily.temperature_2m_min[0]),
    code: d.current.weather_code,
    day: d.current.is_day === 1,
  }
}

async function usd(): Promise<Indicadores['usd']> {
  const r = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 21600 }, signal: AbortSignal.timeout(5000) })
  if (!r.ok) return null
  const d = await r.json()
  if (d.result !== 'success' || !d.rates?.DOP) return null
  return { dop: d.rates.DOP, eur: d.rates.DOP / d.rates.EUR, at: new Date(d.time_last_update_unix * 1000).toISOString() }
}

export async function GET() {
  const [w, u] = await Promise.allSettled([weather(), usd()])
  const body: Indicadores = { weather: w.status === 'fulfilled' ? w.value : null, usd: u.status === 'fulfilled' ? u.value : null }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } })
}
