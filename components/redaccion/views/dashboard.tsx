'use client'

import { ArtImg } from '@/components/eg/art'
import { LineChart } from '@/components/eg/line-chart'
import { fd, num, type AdminNews } from '../data'
import { useAdmin } from '../store'
import { B, Card, cp, Empty, h3, I, QL, sub, Tbl, Thumb } from '../ui'

/** Notas publicadas por día en los últimos 14 días (dato real). */
export function PublishedChart({ news }: { news: AdminNews[] }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - 13 + i)
    return d
  })
  const data = days.map((d) => news.filter((n) => n.st === 'pub' && n.d && new Date(n.d).toDateString() === d.toDateString()).length)
  const label = (i: number) => days[i].getDate() + '/' + (days[i].getMonth() + 1)
  if (!data.some(Boolean)) return <Empty title="Aún no hay notas publicadas">El gráfico aparecerá cuando publiques las primeras.</Empty>
  return (
    <LineChart
      data={data}
      domain={(d) => [0, Math.max(...d, 1) * 1.15]}
      xLabel={label}
      showX={(i) => i % 2 === 0}
      tip={(i) => `${label(i)}: ${data[i]} ${data[i] === 1 ? 'nota publicada' : 'notas publicadas'}`}
      ariaLabel="Notas publicadas por día en las últimas dos semanas"
    />
  )
}

export function Kpi({ label, value, note }: { label: React.ReactNode; value: string; note?: string }) {
  return (
    <Card className={cp}>
      <div className={sub}>{label}</div>
      <b className="my-1 block font-serif text-[30px] font-semibold">{value}</b>
      {note && <span className={sub}>{note}</span>}
    </Card>
  )
}

export function Dashboard() {
  const { me, news, com, stats, newNote, openEd, go, can } = useAdmin()
  const h = new Date().getHours()
  const sal = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  const review = news.filter((n) => n.st === 'rev')
  const scheduled = news.filter((n) => n.st === 'sch' && n.d).sort((a, b) => +new Date(a.d!) - +new Date(b.d!))
  const mine = news.filter((n) => n.st === 'draft' && n.createdBy === me.id)
  const published = news.filter((n) => n.st === 'pub')
  const top = [...published].sort((a, b) => b.r - a.r).slice(0, 5)

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-end gap-3">
        <div>
          <h2 className="m-0 font-serif text-[30px] font-semibold">
            {sal}, {me.name.split(' ')[0]}
          </h2>
          <div className="text-sm text-eg-muted">Esto es lo que necesita tu atención hoy.</div>
        </div>
        <span className="flex-1" />
        <B v="acc" onClick={() => newNote()}>
          <I n="plus" />
          Nueva nota
        </B>
      </div>
      <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[420px]:grid-cols-1">
        <Kpi label="Notas publicadas" value={num(published.length)} note={`${num(stats.publishedMonth)} este mes`} />
        <Kpi label="Lecturas acumuladas" value={num(stats.reads)} note="Una por lector y sesión" />
        <Kpi label="Suscriptores al boletín" value={num(stats.subscribers)} />
        <Kpi label="Comentarios por moderar" value={num(com.length)} />
      </div>

      <div className="mt-4 grid grid-cols-[2fr_1fr] gap-4 max-[1180px]:grid-cols-1">
        <Card className={cp}>
          <h3 className={h3}>Notas publicadas en los últimos 14 días</h3>
          <div className={sub}>Pasa el cursor o enfoca un punto para ver el valor</div>
          <div className="mt-2">
            <PublishedChart news={news} />
          </div>
        </Card>
        <Card className={cp}>
          <h3 className={h3}>Para hoy</h3>
          <div className={`${sub} mb-1.5`}>Lo pendiente en la redacción</div>
          <QL>
            <li>
              <I n="cal" />
              <div>
                <b>
                  {scheduled.length} {scheduled.length === 1 ? 'nota programada' : 'notas programadas'}
                </b>
                <div className={sub}>{scheduled[0] ? 'La próxima sale el ' + fd(scheduled[0].d) : 'No hay nada programado'}</div>
              </div>
              <B v="out" sm className="ml-auto" onClick={() => go('news')}>
                Ver
              </B>
            </li>
            <li>
              <I n="eye" />
              <div>
                <b>
                  {review.length} {review.length === 1 ? 'nota esperando revisión' : 'notas esperando revisión'}
                </b>
                <div className={sub}>{review[0] ? `"${review[0].t.slice(0, 48)}${review[0].t.length > 48 ? '…' : ''}"` : 'Nada pendiente'}</div>
              </div>
              {review[0] && can('article.editAny') && (
                <B v="out" sm className="ml-auto" onClick={() => openEd(review[0].id)}>
                  Revisar
                </B>
              )}
            </li>
            {can('comment.moderate') && (
              <li>
                <I n="chat" />
                <div>
                  <b>{com.length} comentarios por moderar</b>
                  <div className={sub}>{com.filter((c) => c.spam).length} parecen spam</div>
                </div>
                <B v="out" sm className="ml-auto" onClick={() => go('com')}>
                  Moderar
                </B>
              </li>
            )}
            <li>
              <I n="file" />
              <div>
                <b>
                  {mine.length} {mine.length === 1 ? 'borrador tuyo' : 'borradores tuyos'}
                </b>
                <div className={sub}>{mine[0] ? mine[0].t || 'Sin titular' : 'Empieza una nota nueva'}</div>
              </div>
              <B v="out" sm className="ml-auto" onClick={() => (mine[0] ? openEd(mine[0].id) : newNote())}>
                {mine[0] ? 'Seguir' : 'Escribir'}
              </B>
            </li>
          </QL>
        </Card>
      </div>

      <Card className="mt-4">
        <div className={`${cp} flex items-center justify-between gap-3`}>
          <div>
            <h3 className={h3}>Lo más leído</h3>
            <div className={sub}>Notas publicadas, ordenadas por lecturas</div>
          </div>
          <B v="out" sm onClick={() => go('news')}>
            Ver todas
          </B>
        </div>
        {top.length ? (
          <div className="overflow-auto">
            <Tbl>
              <tbody>
                {top.map((n, i) => (
                  <tr key={n.id} className="cursor-pointer" onClick={() => openEd(n.id)}>
                    <td className="w-[30px] font-serif text-xl font-semibold text-eg-accent">{i + 1}</td>
                    <td>
                      <div className="flex min-w-[260px] items-center gap-3">
                        <Thumb>{n.art && <ArtImg src={n.art} />}</Thumb>
                        <b>{n.t}</b>
                      </div>
                    </td>
                    <td>{n.sec}</td>
                    <td className="text-right whitespace-nowrap tabular-nums">{num(n.r)} lecturas</td>
                  </tr>
                ))}
              </tbody>
            </Tbl>
          </div>
        ) : (
          <Empty title="Todavía no hay lecturas">Publica una nota y ábrela en el sitio para ver cómo se cuenta.</Empty>
        )}
      </Card>
    </>
  )
}
