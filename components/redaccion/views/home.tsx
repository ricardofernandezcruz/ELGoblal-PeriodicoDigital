'use client'

import { useState } from 'react'
import { saveHome, saveMenu } from '@/app/redaccion/actions'
import { ArtImg } from '@/components/eg/art'
import { cn } from '@/lib/utils'
import { useAdmin } from '../store'
import { B, Card, cp, Empty, h3, hint, I, inp, pageTitle, QL, Row2, sub, Switch } from '../ui'

const NAMES = ['Nota principal', 'Secundaria 1', 'Secundaria 2']

export function HomeView() {
  const { news, home, setHome, sections, setSections, call, toast, can } = useAdmin()
  const [draft, setDraft] = useState(home)
  const [secs, setSecs] = useState(sections)
  const [hl, setHl] = useState(-1)
  const [busy, setBusy] = useState(false)
  const allowed = can('home.manage')
  const dirty = JSON.stringify(draft) !== JSON.stringify(home) || JSON.stringify(secs) !== JSON.stringify(sections)

  const pub = news.filter((n) => n.st === 'pub')
  const week = Date.now() - 7 * 864e5
  const recent = pub.filter((n) => n.d && +new Date(n.d) >= week)
  const top = [...(recent.length ? recent : pub)].sort((a, b) => b.r - a.r)
  // Misma regla que el sitio: fija si está elegida, si no la más leída reciente que no esté usada.
  const used = new Set<string>()
  const picks = draft.featured.map((id) => {
    const p = (id && pub.find((n) => n.id === id && !used.has(n.id))) || top.find((n) => !used.has(n.id)) || null
    if (p) used.add(p.id)
    return p
  })

  const mv = (i: number, j: number) =>
    setSecs((s) => {
      const c = [...s]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })

  const save = async () => {
    setBusy(true)
    const a = await call(saveHome(draft))
    const b = a === undefined ? undefined : await call(saveMenu(secs.map((s) => ({ id: s.id, inMenu: s.inMenu }))))
    setBusy(false)
    if (b === undefined) return
    setHome(draft)
    setSections(secs)
    toast('Portada actualizada en el sitio')
  }

  const cell = (i: number, big?: boolean) => {
    const n = picks[i]
    if (!n) return <div className="rounded border border-dashed border-[#ddd5c7] p-3 text-xs text-[#5b6470]">Sin nota</div>
    return (
      <div className={cn('rounded p-1 outline-2 outline-transparent outline-dashed', hl === i && 'outline-[#b3261e]')}>
        <div className="aspect-video w-full overflow-hidden rounded-[2px] bg-[#ece6da]">{n.art && <ArtImg src={n.art} />}</div>
        <h4 className={cn('mt-1 mb-2 font-serif leading-[1.15] font-medium', big ? 'text-xl' : 'text-[15px]')}>{n.t}</h4>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <h2 className={pageTitle}>Portada</h2>
          <div className="text-sm text-eg-muted">Elige qué se ve primero. La vista de la derecha cambia mientras decides.</div>
        </div>
        <span className="flex-1" />
        {allowed && (
          <B v="acc" disabled={!dirty || busy} onClick={save}>
            <I n="check" />
            {busy ? 'Guardando…' : dirty ? 'Guardar portada' : 'Portada al día'}
          </B>
        )}
      </div>
      {!allowed && (
        <Card className={`${cp} mb-4`}>
          <Empty title="Solo los editores pueden cambiar la portada">Puedes ver cómo queda, pero no guardar cambios.</Empty>
        </Card>
      )}
      <fieldset disabled={!allowed} className="m-0 grid min-w-0 grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-4 border-0 p-0 max-[1180px]:grid-cols-1">
        <div className="grid gap-4">
          <Card className={cp}>
            <h3 className={h3}>Notas destacadas</h3>
            {!pub.length && <p className={`${sub} mt-2`}>Publica notas para poder destacarlas.</p>}
            {NAMES.map((name, i) => (
              <div key={name} className="mt-3 flex min-w-0 flex-col gap-1.5">
                <label htmlFor={'hs' + i} className="text-[13px] font-semibold">
                  {name}
                </label>
                <select
                  id={'hs' + i}
                  className={cn(inp, 'disabled:opacity-60')}
                  disabled={draft.featured[i] === null}
                  value={draft.featured[i] ?? picks[i]?.id ?? ''}
                  onChange={(e) => {
                    setDraft((h) => ({ ...h, featured: h.featured.map((x, j) => (j === i ? e.target.value : x)) }))
                    setHl(i)
                  }}
                >
                  {!pub.length && <option value="">—</option>}
                  {pub.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.t.slice(0, 70)}
                    </option>
                  ))}
                </select>
                <Row2 className="py-0.5">
                  <span className={sub}>Que el sistema la elija (más leída reciente)</span>
                  <Switch
                    checked={draft.featured[i] === null}
                    onChange={(v) =>
                      setDraft((h) => ({ ...h, featured: h.featured.map((x, j) => (j === i ? (v ? null : (picks[i]?.id ?? pub[0]?.id ?? null)) : x)) }))
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
              <Switch checked={draft.breaking.on} onChange={(v) => setDraft((h) => ({ ...h, breaking: { ...h.breaking, on: v } }))} />
            </Row2>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ubx" className="text-[13px] font-semibold">
                Mensaje
              </label>
              <input
                id="ubx"
                className={inp}
                maxLength={120}
                value={draft.breaking.text}
                onChange={(e) => setDraft((h) => ({ ...h, breaking: { ...h.breaking, text: e.target.value } }))}
              />
              <span className={hint}>{draft.breaking.text.length} de 120 caracteres</span>
            </div>
          </Card>

          <Card className={cp}>
            <h3 className={h3}>Secciones del menú</h3>
            <div className={`${sub} mb-1.5`}>Ordénalas o escóndelas sin tocar código</div>
            <QL className="[&>li]:items-center">
              {secs.map((s, i) => (
                <li key={s.id}>
                  <b className="min-w-[100px]">{s.name}</b>
                  <span className="flex-1" />
                  <B v="ghost" ic sm aria-label={'Subir ' + s.name} disabled={i === 0} onClick={() => mv(i, i - 1)}>
                    <I n="up" />
                  </B>
                  <B v="ghost" ic sm aria-label={'Bajar ' + s.name} disabled={i === secs.length - 1} onClick={() => mv(i, i + 1)}>
                    <I n="down" />
                  </B>
                  <Switch
                    label={'Mostrar ' + s.name}
                    checked={s.inMenu}
                    onChange={(v) => setSecs((l) => l.map((x, j) => (j === i ? { ...x, inMenu: v } : x)))}
                  />
                </li>
              ))}
            </QL>
          </Card>
        </div>

        <div>
          <div className={`${sub} mb-1.5`}>Vista previa de la portada</div>
          <div className="overflow-hidden rounded-[10px] border border-eg-rule bg-[#f7f3ec] text-[#14202b]">
            {draft.breaking.on && draft.breaking.text && (
              <div className="bg-[#b3261e] px-3 py-1.5 text-xs text-white">
                <b>Última hora</b> {draft.breaking.text}
              </div>
            )}
            <div className="pt-2.5 pb-0.5 text-center font-serif text-2xl font-semibold">El Global</div>
            <div className="flex flex-wrap justify-center gap-3 border-y border-[#ddd5c7] p-1.5 text-[11px] font-medium text-[#5b6470]">
              <b className="text-[#b3261e]">Portada</b>
              {secs
                .filter((s) => s.inMenu)
                .map((s) => (
                  <span key={s.id}>{s.name}</span>
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
                    {i + 1}. {n.t.slice(0, 48)}
                    {n.t.length > 48 ? '…' : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </fieldset>
    </>
  )
}
