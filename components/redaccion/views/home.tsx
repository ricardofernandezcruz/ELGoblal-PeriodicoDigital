'use client'

import { ArtImg } from '@/components/eg/art'
import { cn } from '@/lib/utils'
import { useAdmin } from '../store'
import { B, Card, cp, h3, hint, I, inp, pageTitle, QL, Row2, sub, Switch } from '../ui'

const NAMES = ['Nota principal', 'Secundaria 1', 'Secundaria 2']

export function HomeView() {
  const { news, hp, setHp } = useAdmin()
  const pub = news.filter((n) => n.st === 'pub')
  const top = [...pub].sort((a, b) => b.r - a.r)
  const pick = (i: number) => (hp.auto[i] ? top[i] || pub[0] : pub.find((n) => n.id === hp.slots[i]) || pub[0])
  const mv = (i: number, j: number) =>
    setHp((h) => {
      const secs = [...h.secs]
      ;[secs[i], secs[j]] = [secs[j], secs[i]]
      return { ...h, secs }
    })

  const cell = (i: number, big?: boolean) => {
    const n = pick(i)
    if (!n) return null
    return (
      <div className={cn('rounded p-1 outline-2 outline-transparent outline-dashed', hp.hl === i && 'outline-[#b3261e]')}>
        <div className="aspect-video w-full overflow-hidden rounded-[2px] bg-[#ece6da]">
          <ArtImg src={n.art} />
        </div>
        <h4 className={cn('mt-1 mb-2 font-serif leading-[1.15] font-medium', big ? 'text-xl' : 'text-[15px]')}>{n.t}</h4>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <h2 className={pageTitle}>Portada</h2>
        <div className="text-sm text-eg-muted">Elige qué se ve primero. La vista de la derecha cambia mientras decides.</div>
      </div>
      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-4 max-[1180px]:grid-cols-1">
        <div className="grid gap-4">
          <Card className={cp}>
            <h3 className={h3}>Notas destacadas</h3>
            {NAMES.map((name, i) => (
              <div key={name} className="mt-3 flex min-w-0 flex-col gap-1.5">
                <label htmlFor={'hs' + i} className="text-[13px] font-semibold">
                  {name}
                </label>
                <select
                  id={'hs' + i}
                  className={cn(inp, 'disabled:opacity-60')}
                  disabled={hp.auto[i]}
                  value={hp.slots[i]}
                  onChange={(e) =>
                    setHp((h) => {
                      const slots = [...h.slots]
                      slots[i] = +e.target.value
                      return { ...h, slots, hl: i }
                    })
                  }
                >
                  {pub.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.t.slice(0, 60)}
                    </option>
                  ))}
                </select>
                <Row2 className="py-0.5">
                  <span className={sub}>Que el sistema la elija (más leída reciente)</span>
                  <Switch
                    checked={hp.auto[i]}
                    onChange={(v) =>
                      setHp((h) => {
                        const auto = [...h.auto]
                        auto[i] = v
                        return { ...h, auto }
                      })
                    }
                  />
                </Row2>
              </div>
            ))}
          </Card>

          <Card className={cp}>
            <h3 className={h3}>Banda de última hora</h3>
            <Row2>
              <span>Mostrar en el sitio</span>
              <Switch checked={hp.ub} onChange={(v) => setHp((h) => ({ ...h, ub: v }))} />
            </Row2>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ubx" className="text-[13px] font-semibold">
                Mensaje
              </label>
              <input
                id="ubx"
                className={inp}
                maxLength={120}
                value={hp.ut}
                onChange={(e) => setHp((h) => ({ ...h, ut: e.target.value }))}
              />
              <span className={hint}>{hp.ut.length} de 120 caracteres</span>
            </div>
          </Card>

          <Card className={cp}>
            <h3 className={h3}>Secciones del menú</h3>
            <div className={`${sub} mb-1.5`}>Ordénalas o escóndelas sin tocar código</div>
            <QL className="[&>li]:items-center">
              {hp.secs.map((s, i) => (
                <li key={s.n}>
                  <b className="min-w-[100px]">{s.n}</b>
                  <span className="flex-1" />
                  <B v="ghost" ic sm aria-label={'Subir ' + s.n} disabled={i === 0} onClick={() => mv(i, i - 1)}>
                    <I n="up" />
                  </B>
                  <B v="ghost" ic sm aria-label={'Bajar ' + s.n} disabled={i === hp.secs.length - 1} onClick={() => mv(i, i + 1)}>
                    <I n="down" />
                  </B>
                  <Switch
                    label={'Mostrar ' + s.n}
                    checked={s.on}
                    onChange={(v) => setHp((h) => ({ ...h, secs: h.secs.map((x, j) => (j === i ? { ...x, on: v } : x)) }))}
                  />
                </li>
              ))}
            </QL>
          </Card>
        </div>

        <div>
          <div className={`${sub} mb-1.5`}>Vista previa de la portada</div>
          <div className="overflow-hidden rounded-[10px] border border-eg-rule bg-[#f7f3ec] text-[#14202b]">
            {hp.ub && (
              <div className="bg-[#b3261e] px-3 py-1.5 text-xs text-white">
                <b>Última hora</b> {hp.ut}
              </div>
            )}
            <div className="pt-2.5 pb-0.5 text-center font-serif text-2xl font-semibold">El Global</div>
            <div className="flex flex-wrap justify-center gap-3 border-y border-[#ddd5c7] p-1.5 text-[11px] font-medium text-[#5b6470]">
              <b className="text-[#b3261e]">Portada</b>
              {hp.secs
                .filter((s) => s.on)
                .map((s) => (
                  <span key={s.n}>{s.n}</span>
                ))}
            </div>
            <div className="grid grid-cols-[1.5fr_1fr_.8fr] gap-3 p-3 max-[900px]:grid-cols-1">
              {cell(0, true)}
              <div>
                {cell(1)}
                {cell(2)}
              </div>
              <div className="bg-[#e9edec] p-2 font-serif text-xs leading-[1.3] font-medium">
                <b>Lo más leído</b>
                {top.slice(0, 5).map((n, i) => (
                  <div key={n.id} className="border-t border-[#ddd5c7] py-[5px]">
                    {i + 1}. {n.t.slice(0, 48)}…
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
