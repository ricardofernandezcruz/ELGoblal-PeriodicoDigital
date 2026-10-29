'use client'

import { useEffect, useState } from 'react'
import { ArtImg } from '@/components/eg/art'
import { LineChart } from '@/components/eg/line-chart'
import { DAYS, num, READS } from '../data'
import { useAdmin } from '../store'
import { B, Card, cp, h3, I, QL, sub, Tbl, Thumb } from '../ui'

export const readsChart = (
  <LineChart
    data={READS}
    domain={(d) => [Math.min(...d) * 0.9, Math.max(...d) * 1.05]}
    xLabel={(i) => DAYS[i]}
    showX={(i) => i % 2 === 0}
    yLabel={(v) => (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(Math.round(v)))}
    tip={(i) => `${DAYS[i]}: ${num(READS[i])} lecturas`}
    ariaLabel="Lecturas diarias, tendencia al alza"
  />
)

export function Kpi({ label, value, delta, live }: { label: React.ReactNode; value: string; delta: string; live?: boolean }) {
  return (
    <Card className={cp}>
      <div className={sub}>{label}</div>
      <b className="my-1 block font-serif text-[30px] font-semibold">{value}</b>
      <span className={live ? sub : 'text-xs text-eg-ok'}>{delta}</span>
    </Card>
  )
}

export function Dashboard() {
  const { me, news, newNote, openEd, go } = useAdmin()
  const [live, setLive] = useState(1284)
  useEffect(() => {
    const t = setInterval(() => setLive((l) => l + Math.round(Math.random() * 18 - 8)), 2500)
    return () => clearInterval(t)
  }, [])
  const h = new Date().getHours()
  const sal = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  const pend = news.filter((n) => n.st === 'rev').length
  const sch = news.filter((n) => n.st === 'sch').length
  const top = news
    .filter((n) => n.st === 'pub')
    .sort((a, b) => b.r - a.r)
    .slice(0, 4)

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-end gap-3">
        <div>
          <h2 className="m-0 font-serif text-[30px] font-semibold">{sal}, {me.name.split(' ')[0]}</h2>
          <div className="text-sm text-eg-muted">Esto es lo que necesita tu atención hoy.</div>
        </div>
        <span className="flex-1" />
        <B v="acc" onClick={() => newNote()}>
          <I n="plus" />
          Nueva nota
        </B>
      </div>
      <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[420px]:grid-cols-1">
        <Kpi label="Lecturas hoy" value="48.2 k" delta="+12 % frente a ayer" />
        <Kpi
          label={
            <>
              <span className="eg-dot mr-1.5" />
              Lectores ahora
            </>
          }
          value={num(live)}
          delta="Se actualiza en vivo"
          live
        />
        <Kpi label="Notas publicadas este mes" value="126" delta="+9 frente al mes pasado" />
        <Kpi label="Suscriptores" value="8,431" delta="+54 hoy" />
      </div>

      <div className="mt-4 grid grid-cols-[2fr_1fr] gap-4 max-[1180px]:grid-cols-1">
        <Card className={cp}>
          <h3 className={h3}>Lecturas de los últimos 14 días</h3>
          <div className={sub}>Pasa el cursor o enfoca un punto para ver el valor</div>
          <div className="mt-2">{readsChart}</div>
        </Card>
        <Card className={cp}>
          <h3 className={h3}>Para hoy</h3>
          <div className={`${sub} mb-1.5`}>Lo que el sistema detectó por ti</div>
          <QL>
            <li>
              <I n="cal" />
              <div>
                <b>{sch} notas programadas</b>
                <div className={sub}>La próxima sale mañana a las 7:30</div>
              </div>
              <B v="out" sm className="ml-auto" onClick={() => go('news')}>
                Ver
              </B>
            </li>
            <li>
              <I n="eye" />
              <div>
                <b>{pend} nota esperando revisión</b>
                <div className={sub}>&quot;La generación que está cambiando las reglas…&quot;</div>
              </div>
              <B v="out" sm className="ml-auto" onClick={() => openEd(6)}>
                Revisar
              </B>
            </li>
            <li>
              <I n="chat" />
              <div>
                <b>5 comentarios por moderar</b>
                <div className={sub}>2 parecen spam</div>
              </div>
              <B v="out" sm className="ml-auto" onClick={() => go('com')}>
                Moderar
              </B>
            </li>
            <li>
              <I n="spark" />
              <div>
                <b>Mejor hora para publicar hoy</b>
                <div className={sub}>18:00 a 19:00, cuando más lectores abren el sitio</div>
              </div>
              <B v="out" sm className="ml-auto" onClick={() => newNote()}>
                Programar
              </B>
            </li>
          </QL>
        </Card>
      </div>

      <Card className="mt-4">
        <div className={`${cp} flex items-center justify-between gap-3`}>
          <div>
            <h3 className={h3}>Lo más leído hoy</h3>
            <div className={sub}>Notas publicadas, ordenadas por lecturas</div>
          </div>
          <B v="out" sm onClick={() => go('news')}>
            Ver todas
          </B>
        </div>
        <div className="overflow-auto">
          <Tbl>
            <tbody>
              {top.map((n, i) => (
                <tr key={n.id} className="cursor-pointer" onClick={() => openEd(n.id)}>
                  <td className="w-[30px] font-serif text-xl font-semibold text-eg-accent">{i + 1}</td>
                  <td>
                    <div className="flex min-w-[260px] items-center gap-3">
                      <Thumb>
                        <ArtImg src={n.art} />
                      </Thumb>
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
      </Card>
    </>
  )
}
