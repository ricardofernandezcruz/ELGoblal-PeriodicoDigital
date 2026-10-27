'use client'

import { Card, cp, h3, pageTitle, QL } from '../ui'
import { Kpi, readsChart } from './dashboard'

const SOURCES: [string, number][] = [
  ['Búsqueda', 46],
  ['Redes sociales', 28],
  ['Directo', 16],
  ['Boletín', 10],
]

export function Stats() {
  return (
    <>
      <div className="mb-4">
        <h2 className={pageTitle}>Analítica</h2>
        <div className="text-sm text-eg-muted">Datos de ejemplo de los últimos 14 días.</div>
      </div>
      <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[420px]:grid-cols-1">
        <Kpi label="Lecturas" value="517 k" delta="+18 %" />
        <Kpi label="Lectores únicos" value="186 k" delta="+11 %" />
        <Kpi label="Tiempo medio de lectura" value="3:42" delta="+0:18" />
        <Kpi label="Nuevos suscriptores" value="412" delta="+23 %" />
      </div>
      <Card className={`${cp} mt-4`}>
        <h3 className={h3}>Lecturas por día</h3>
        <div className="mt-2">{readsChart}</div>
      </Card>
      <div className="mt-4 grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
        <Card className={cp}>
          <h3 className={h3}>Dispositivos</h3>
          <div className="mt-3 flex items-center gap-4">
            <div
              className="relative size-[120px] flex-none rounded-full bg-[conic-gradient(var(--eg-accent)_0_68%,var(--eg-ink)_68%_92%,var(--eg-rule)_92%_100%)] after:absolute after:inset-[26px] after:rounded-full after:bg-eg-panel after:content-['']"
              role="img"
              aria-label="68 % móvil, 24 % escritorio, 8 % tableta"
            />
            <QL className="flex-1">
              {[
                ['Móvil', '68 %'],
                ['Escritorio', '24 %'],
                ['Tableta', '8 %'],
              ].map(([k, v]) => (
                <li key={k}>
                  <b>{k}</b>
                  <span className="flex-1" />
                  {v}
                </li>
              ))}
            </QL>
          </div>
        </Card>
        <Card className={cp}>
          <h3 className={h3}>De dónde llegan</h3>
          <div className="mt-3 grid gap-3">
            {SOURCES.map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between">
                  <span>{k}</span>
                  <b>{v} %</b>
                </div>
                <div className="h-2 overflow-hidden rounded bg-eg-soft">
                  <i className="block h-full bg-eg-accent" style={{ width: v * 2 + '%' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className={cp}>
          <h3 className={h3}>Secciones más leídas</h3>
          <QL className="mt-2">
            {[
              ['Mundo', '31 %'],
              ['Economía', '22 %'],
              ['Tecnología', '18 %'],
              ['Cultura', '12 %'],
            ].map(([k, v]) => (
              <li key={k}>
                <b>{k}</b>
                <span className="flex-1" />
                {v}
              </li>
            ))}
          </QL>
        </Card>
      </div>
    </>
  )
}
