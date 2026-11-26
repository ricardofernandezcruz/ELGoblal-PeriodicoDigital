'use client'

import { useEffect, useState } from 'react'
import { getNewsletterStatus, getPushStatus, getSiteInfoForPanel, saveHome, saveMenu, saveSiteInfo, sendBreakingPush, sendNewsletterTest, type NewsletterStatus } from '@/app/redaccion/actions'
import { BREAKING_HOURS, breakingUntil, type Breaking } from '@/lib/newsroom-types'
import { SOCIALS, type SiteInfo } from '@/lib/site-info-shared'
import { ArtImg } from '@/components/eg/art'
import { cn } from '@/lib/utils'
import { useAdmin } from '../store'
import { B, Card, cp, DlgRow, DlgTitle, Empty, h3, hint, I, inp, pageTitle, QL, Row2, sub, Switch } from '../ui'

const NAMES = ['Nota principal', 'Secundaria 1', 'Secundaria 2']

const hhmm = (ms: number) => new Date(ms).toLocaleString('es-DO', { weekday: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'America/Santo_Domingo' })

/** Cuándo se quita la banda: la hora guardada o, si al guardar se reinicia la cuenta, desde ese momento. */
function breakingNote(saved: Breaking, draft: Breaking) {
  if (!draft.on) return 'Apagada. Al encenderla y guardar, empieza la cuenta.'
  const restart = !saved.on || !saved.at || saved.text !== draft.text || saved.hours !== draft.hours
  if (restart) return `Al guardar se mostrará ${draft.hours ?? 8} horas, hasta el ${hhmm(Date.now() + (draft.hours ?? 8) * 36e5)}.`
  return `En el sitio hasta el ${hhmm(breakingUntil(saved)!)}. Cambia el texto o la duración para reiniciar la cuenta.`
}

/** Estado del boletín diario, con vista previa y envío de prueba. */
function NewsletterCard() {
  const { call, toast } = useAdmin()
  const [st, setSt] = useState<NewsletterStatus | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    getNewsletterStatus().then((r) => r.ok && setSt(r.data))
  }, [])
  return (
    <Card className={cp}>
      <h3 className={h3}>Boletín diario</h3>
      <div className={`${sub} mb-3`}>Sale solo cada mañana (6:00, hora de Santo Domingo) con las notas de las últimas 24 h. Las marcadas «para el boletín» van primero.</div>
      {st ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [st.confirmed, 'suscriptores'],
              [st.pending, 'sin confirmar'],
              [st.stories, 'notas hoy'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-lg bg-eg-soft px-2 py-2.5">
                <b className="block font-serif text-[22px] leading-none">{n}</b>
                <span className={sub}>{l}</span>
              </div>
            ))}
          </div>
          {!st.ready && (
            <p className="mt-3 mb-0 rounded-lg bg-eg-warn/14 px-3 py-2 text-[13px] text-eg-warn">
              El envío de correos no está configurado (falta RESEND_API_KEY). Los suscriptores se guardan, pero todavía no reciben nada.
            </p>
          )}
          {st.lastSent && <div className={`${sub} mt-2`}>Último envío: {st.lastSent}</div>}
        </>
      ) : (
        <div className={sub}>Cargando…</div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <a href="/api/boletin/vista-previa" target="_blank" rel="noopener" className="inline-flex h-[30px] items-center gap-1.5 rounded-lg border border-eg-rule bg-eg-panel px-2.5 text-[13px] font-semibold hover:bg-eg-soft">
          <I n="eye" />
          Ver cómo queda hoy
        </a>
        <B
          v="out"
          sm
          disabled={busy || !st?.stories}
          onClick={async () => {
            setBusy(true)
            const to = await call(sendNewsletterTest())
            setBusy(false)
            if (to) toast('Prueba enviada a ' + to)
          }}
        >
          <I n="bell" />
          {busy ? 'Enviando…' : 'Enviarme una prueba'}
        </B>
      </div>
    </Card>
  )
}

/** Razón social, contacto, «Quiénes somos» y redes: se usan en el pie, las páginas legales y los buscadores. */
function SiteInfoCard() {
  const { call, toast } = useAdmin()
  const [s, setS] = useState<SiteInfo | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    getSiteInfoForPanel().then((r) => r.ok && setS(r.data))
  }, [])
  if (!s) return null
  const field = (k: Exclude<keyof SiteInfo, 'socials' | 'about'>, label: string, ph = '') => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={'si-' + k} className="text-[13px] font-semibold">
        {label}
      </label>
      <input id={'si-' + k} className={inp} value={s[k]} placeholder={ph} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
    </div>
  )
  return (
    <Card className={cp}>
      <h3 className={h3}>Datos del periódico</h3>
      <div className={`${sub} mb-3`}>Aparecen en el pie de página, en «Quiénes somos», «Contacto» y las páginas legales. Lo que quede vacío no se muestra.</div>
      <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
        {field('legalName', 'Razón social', 'Ej.: El Global Medios, S.R.L.')}
        {field('rnc', 'RNC')}
        {field('director', 'Director')}
        {field('email', 'Correo de contacto', 'contacto@…')}
        {field('phone', 'Teléfono')}
        {field('address', 'Dirección')}
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="si-about" className="text-[13px] font-semibold">
          Texto de «Quiénes somos»
        </label>
        <textarea id="si-about" rows={4} className="min-h-[84px] w-full resize-y rounded-lg border border-eg-rule bg-eg-panel px-[11px] py-[9px] leading-[1.55]" value={s.about} onChange={(e) => setS({ ...s, about: e.target.value })} />
        <span className={hint}>Deja una línea en blanco entre párrafos. Si lo dejas vacío, se usa un texto general.</span>
      </div>
      <b className="mt-4 mb-1.5 block text-[13px]">Redes sociales</b>
      <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
        {SOCIALS.map(([id, name]) => (
          <div key={id} className="flex flex-col gap-1.5">
            <label htmlFor={'so-' + id} className="text-[13px]">
              {name}
            </label>
            <input id={'so-' + id} className={inp} inputMode="url" placeholder="https://…" value={s.socials[id]} onChange={(e) => setS({ ...s, socials: { ...s.socials, [id]: e.target.value } })} />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <B
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            const ok = await call(saveSiteInfo(s))
            setBusy(false)
            if (ok !== undefined) toast('Datos del periódico guardados')
          }}
        >
          {busy ? 'Guardando…' : 'Guardar datos'}
        </B>
      </div>
    </Card>
  )
}

/** Aviso de última hora al celular o la computadora de los lectores que lo activaron. */
function PushCard({ text }: { text: string }) {
  const { call, toast, news, dialog, closeDialog } = useAdmin()
  const [st, setSt] = useState<{ ready: boolean; count: number } | null>(null)
  const [msg, setMsg] = useState(text)
  const [art, setArt] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    getPushStatus().then((r) => r.ok && setSt(r.data))
  }, [])
  useEffect(() => setMsg(text), [text])
  const recent = news.filter((n) => n.st === 'pub').slice(0, 30)
  const send = async () => {
    closeDialog()
    setBusy(true)
    const n = await call(sendBreakingPush({ text: msg, articleId: art || null }))
    setBusy(false)
    if (n !== undefined) toast(n === 1 ? 'Aviso enviado a 1 dispositivo' : `Aviso enviado a ${n} dispositivos`)
  }
  return (
    <Card className={cp}>
      <h3 className={h3}>Aviso al celular</h3>
      <div className={`${sub} mb-2`}>
        {st ? `${st.count} ${st.count === 1 ? 'dispositivo recibe' : 'dispositivos reciben'} los avisos.` : 'Cargando…'} Úsalo solo para noticias realmente urgentes: si
        molesta, la gente lo desactiva.
      </div>
      {st && !st.ready && (
        <p className="mt-0 mb-2 rounded-lg bg-eg-warn/14 px-3 py-2 text-[13px] text-eg-warn">Faltan las claves VAPID en Vercel: los avisos todavía no se pueden enviar.</p>
      )}
      <div className="grid gap-2">
        <input className={inp} maxLength={160} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Texto del aviso" aria-label="Texto del aviso" />
        <select className={inp} value={art} onChange={(e) => setArt(e.target.value)} aria-label="Nota que abre el aviso">
          <option value="">Al tocarlo, abre la portada</option>
          {recent.map((n) => (
            <option key={n.id} value={n.id}>
              Abre: {n.t.slice(0, 70)}
            </option>
          ))}
        </select>
        <div>
          <B
            v="acc"
            sm
            disabled={busy || msg.trim().length < 5 || !st?.count}
            onClick={() =>
              dialog(
                <>
                  <DlgTitle>¿Enviar el aviso ahora?</DlgTitle>
                  <p className="text-sm text-eg-muted">
                    Llega al momento a {st?.count} {st?.count === 1 ? 'dispositivo' : 'dispositivos'} y no se puede retirar.
                  </p>
                  <div className="my-3 rounded-lg border border-eg-rule bg-eg-bg p-3 text-sm">
                    <b className="block">Última hora · El Global</b>
                    {msg}
                  </div>
                  <DlgRow>
                    <B v="out" onClick={closeDialog}>
                      Cancelar
                    </B>
                    <B v="acc" onClick={send}>
                      Enviar aviso
                    </B>
                  </DlgRow>
                </>,
              )
            }
          >
            <I n="bell" />
            {busy ? 'Enviando…' : 'Enviar aviso'}
          </B>
        </div>
      </div>
    </Card>
  )
}

export function HomeView() {
  const { news, home, setHome, sections, setSections, call, toast, can } = useAdmin()
  const [draft, setDraft] = useState(home)
  const [secs, setSecs] = useState(sections)
  const [hl, setHl] = useState(-1)
  const [busy, setBusy] = useState(false)
  const allowed = can('home.manage')
  const dirty = JSON.stringify(draft) !== JSON.stringify(home) || JSON.stringify(secs) !== JSON.stringify(sections)

  const pub = news.filter((n) => n.st === 'pub')
  const top = [...pub].sort((a, b) => +new Date(b.d ?? 0) - +new Date(a.d ?? 0))
  // Misma regla que el sitio: fija si está elegida, si no la más reciente que no esté usada.
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
    const breaking = await call(saveHome(draft))
    const b = breaking === undefined ? undefined : await call(saveMenu(secs.map((s) => ({ id: s.id, inMenu: s.inMenu }))))
    setBusy(false)
    if (b === undefined) return
    const saved = { ...draft, breaking: breaking ?? draft.breaking }
    setHome(saved)
    setDraft(saved)
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
                  <span className={sub}>Que el sistema la elija (la más reciente)</span>
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
            <div className="mt-3 flex flex-col gap-1.5">
              <label htmlFor="ubh" className="text-[13px] font-semibold">
                Se quita sola después de
              </label>
              <select
                id="ubh"
                className={inp}
                value={draft.breaking.hours ?? 8}
                onChange={(e) => setDraft((h) => ({ ...h, breaking: { ...h.breaking, hours: Number(e.target.value) } }))}
              >
                {BREAKING_HOURS.map((n) => (
                  <option key={n} value={n}>
                    {n} horas
                  </option>
                ))}
              </select>
              <span className={hint}>{breakingNote(home.breaking, draft.breaking)}</span>
            </div>
          </Card>

          <Card className={cp}>
            <h3 className={h3}>Regalo de Navidad</h3>
            <div className={`${sub} mb-1.5`}>
              Al entrar o recargar cualquier página del sitio, un regalo se abre y deja ver el periódico. No sale al pasar de una página a otra, ni a quien pidió menos animaciones.
            </div>
            <Row2>
              <span>Mostrar en estas fechas</span>
              <Switch checked={draft.gift.on} onChange={(v) => setDraft((h) => ({ ...h, gift: { ...h.gift, on: v } }))} />
            </Row2>
            <div className="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gfrom" className="text-[13px] font-semibold">
                  Desde
                </label>
                <input id="gfrom" type="date" className={inp} value={draft.gift.from} onChange={(e) => setDraft((h) => ({ ...h, gift: { ...h.gift, from: e.target.value } }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gto" className="text-[13px] font-semibold">
                  Hasta (incluido)
                </label>
                <input id="gto" type="date" className={inp} value={draft.gift.to} min={draft.gift.from} onChange={(e) => setDraft((h) => ({ ...h, gift: { ...h.gift, to: e.target.value } }))} />
              </div>
            </div>
            <a href="/?regalo=1" target="_blank" rel="noopener" className="mt-3 inline-flex h-[30px] items-center gap-1.5 rounded-lg border border-eg-rule bg-eg-panel px-2.5 text-[13px] font-semibold hover:bg-eg-soft">
              <I n="eye" />
              Ver la animación
            </a>
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

          {allowed && <PushCard text={draft.breaking.text} />}
          {allowed && <SiteInfoCard />}
          {allowed && <NewsletterCard />}
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
