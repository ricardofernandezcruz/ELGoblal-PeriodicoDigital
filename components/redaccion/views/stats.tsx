'use client'

import { num } from '../data'
import { useAdmin } from '../store'
import { Card, cp, Empty, h3, pageTitle, QL } from '../ui'
import { Kpi, PublishedChart } from './dashboard'

export function Stats() {
  const { news, stats } = useAdmin()
  const pub = news.filter((n) => n.st === 'pub')
  const bySec = Object.entries(
    pub.reduce<Record<string, number>>((a, n) => ((a[n.sec] = (a[n.sec] ?? 0) + n.r), a), {}),
  ).sort((a, b) => b[1] - a[1])
  const total = bySec.reduce((a, [, v]) => a + v, 0)
  const byAuthor = Object.entries(pub.reduce<Record<string, number>>((a, n) => ((a[n.au] = (a[n.au] ?? 0) + 1), a), {})).sort(
    (a, b) => b[1] - a[1],
  )
  const avg = pub.length ? Math.round(stats.reads / pub.length) : 0

  return (
    <>
      <div className="mb-4">
        <h2 className={pageTitle}>Analítica</h2>
        <div className="text-sm text-eg-muted">
          Datos reales de la base de datos. Las visitas detalladas (dispositivos, procedencia) se verán en Vercel Analytics.
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[420px]:grid-cols-1">
        <Kpi label="Lecturas acumuladas" value={num(stats.reads)} />
        <Kpi label="Lecturas por nota" value={num(avg)} note="Promedio de las publicadas" />
        <Kpi label="Notas publicadas" value={num(pub.length)} note={`${num(stats.publishedMonth)} este mes`} />
        <Kpi label="Suscriptores" value={num(stats.subscribers)} />
      </div>
      <Card className={`${cp} mt-4`}>
        <h3 className={h3}>Notas publicadas por día</h3>
        <div className="mt-2">
          <PublishedChart news={news} />
        </div>
      </Card>
      <div className="mt-4 grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <Card className={cp}>
          <h3 className={h3}>Lecturas por sección</h3>
          {total ? (
            <div className="mt-3 grid gap-3">
              {bySec.map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between">
                    <span>{k}</span>
                    <b>{Math.round((v / total) * 100)} %</b>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-eg-soft">
                    <i className="block h-full bg-eg-accent" style={{ width: (v / total) * 100 + '%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Sin lecturas todavía" />
          )}
        </Card>
        <Card className={cp}>
          <h3 className={h3}>Notas publicadas por firma</h3>
          {byAuthor.length ? (
            <QL className="mt-2">
              {byAuthor.map(([k, v]) => (
                <li key={k}>
                  <b>{k}</b>
                  <span className="flex-1" />
                  {v}
                </li>
              ))}
            </QL>
          ) : (
            <Empty title="Sin notas publicadas" />
          )}
        </Card>
      </div>
    </>
  )
}
