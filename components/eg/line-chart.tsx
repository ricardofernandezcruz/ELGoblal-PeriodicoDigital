'use client'

import { useRef, useState } from 'react'

/** Gráfico de línea con área, 4 guías y puntos enfocables (guía §5.16). */
export function LineChart({
  data,
  domain,
  left = 40,
  xLabel,
  showX,
  yLabel = (v) => String(Math.round(v)),
  tip,
  ariaLabel,
}: {
  data: number[]
  domain: (d: number[]) => [number, number]
  left?: number
  xLabel: (i: number) => string
  showX: (i: number) => boolean
  yLabel?: (v: number) => string
  tip: (i: number) => string
  ariaLabel: string
}) {
  const W = 640,
    H = 220,
    L = left,
    B = 26
  const [mn, mx] = domain(data)
  const x = (i: number) => L + (i * (W - L - 10)) / (data.length - 1)
  const y = (v: number) => H - B - ((v - mn) / (mx - mn)) * (H - B - 12)
  const pts = data.map((v, i) => x(i) + ',' + y(v)).join(' ')
  const wrap = useRef<HTMLDivElement>(null)
  const [t, setT] = useState<{ text: string; left: number; top: number } | null>(null)

  const show = (i: number, el: SVGCircleElement) => {
    const b = el.getBoundingClientRect(),
      p = wrap.current!.getBoundingClientRect()
    setT({ text: tip(i), left: b.left + b.width / 2 - p.left, top: b.top + b.height / 2 - p.top })
  }

  return (
    <div ref={wrap} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel} className="block">
        {[0, 1, 2, 3].map((k) => {
          const v = mn + ((mx - mn) * k) / 3
          return (
            <g key={k}>
              <line x1={L} x2={W - 10} y1={y(v)} y2={y(v)} className="stroke-eg-rule" />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" className="fill-eg-muted font-sans text-[11px]">
                {yLabel(v)}
              </text>
            </g>
          )
        })}
        <polygon points={`${x(0)},${H - B} ${pts} ${x(data.length - 1)},${H - B}`} className="fill-eg-accent opacity-10" />
        <polyline points={pts} className="fill-none stroke-eg-accent [stroke-linejoin:round] [stroke-width:2.5]" />
        {data.map((v, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(v)}
              r={13}
              fill="transparent"
              tabIndex={0}
              aria-label={tip(i)}
              onMouseEnter={(e) => show(i, e.currentTarget)}
              onFocus={(e) => show(i, e.currentTarget)}
              onMouseLeave={() => setT(null)}
              onBlur={() => setT(null)}
            />
            {showX(i) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-eg-muted font-sans text-[11px]">
                {xLabel(i)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-[125%] whitespace-nowrap rounded bg-eg-ink px-2.5 py-1.5 text-xs text-eg-bg transition-opacity"
        style={{ left: t?.left ?? 0, top: t?.top ?? 0, opacity: t ? 1 : 0 }}
      >
        {t?.text}
      </div>
    </div>
  )
}
