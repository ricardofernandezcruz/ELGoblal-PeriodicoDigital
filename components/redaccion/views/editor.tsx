'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArtImg } from '@/components/eg/art'
import { cn } from '@/lib/utils'
import { addLiveUpdate, deleteLiveUpdate, getVersion, listLiveUpdates, listVersions, saveArticle, setArticleStatus, type AdminLiveUpdate } from '@/app/redaccion/actions'
import {
  BH,
  BI,
  D,
  fd,
  hm,
  LBL,
  loc,
  mk,
  slugify,
  ST,
  type Block,
  type BlockType,
  type Editor,
  type Mode,
} from '../data'
import { TplBtn, TplGrid, useAdmin } from '../store'
import {
  B,
  Badge,
  btnClass,
  Card,
  Chip,
  cp,
  DlgRow,
  DlgTitle,
  Empty,
  hint,
  I,
  inp,
  lab,
  QL,
  Row2,
  Seg,
  sub,
  Switch,
  ta,
  Tabs,
  Thumb,
} from '../ui'
import { usePickMedia } from './media'

/* ---------- utilidades ---------- */

const words = (E: Editor) =>
  [E.title, E.lead, ...E.blocks.map((b) => [b.v, b.who, b.n, b.l, b.cap].filter(Boolean).join(' '))]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length
const readTime = (E: Editor) => Math.max(1, Math.ceil(words(E) / 200))

function genSum(E: Editor) {
  const ps = E.blocks.filter((b) => b.t === 'p' && b.v?.trim()).slice(0, 3)
  return ps.length
    ? ps
        .map((p) => {
          const s = p.v!.trim().split(/(?<=[.!?])\s/)[0]
          return s.length > 120 ? s.slice(0, 117).trim() + '…' : s
        })
        .join('\n')
    : 'Escribe algunos párrafos y vuelve a pulsar este botón.'
}

type LayoutItem = Block | { t: 'gal'; id: string; im: Block[] }
function layout(E: Editor) {
  const bl = E.blocks.filter((b) => !(b.t === 'p' && !b.v)),
    hero = bl.find((b) => b.t === 'img' && b.src) ?? null,
    rest = bl.filter((b) => b !== hero),
    out: LayoutItem[] = []
  let gal: { t: 'gal'; id: string; im: Block[] } | null = null
  rest.forEach((b) => {
    if (b.t === 'img' && b.src) {
      if (!gal) {
        gal = { t: 'gal', id: 'g' + b.id, im: [] }
        out.push(gal)
      }
      gal.im.push(b)
    } else {
      gal = null
      out.push(b)
    }
  })
  return {
    hero,
    out,
    flags: {
      hero: !!hero,
      gal: out.some((o) => o.t === 'gal' && o.im.length > 1),
      quote: out.some((o) => o.t === 'quote'),
      data: out.some((o) => o.t === 'data'),
      vid: out.some((o) => o.t === 'video' && (o as Block).vert),
      drop: out.some((o) => o.t === 'p'),
    },
  }
}

type Check = { ok: boolean; l: string; h: string; f: () => void }

/* ---------- editor ---------- */

export function EditorView() {
  const { E: maybeE } = useAdmin()
  if (!maybeE) return <Empty title="No hay ninguna nota abierta">Crea una nota nueva o abre una desde Noticias.</Empty>
  return <EditorInner />
}

function AutoTA({
  value,
  taRef,
  ...props
}: Omit<React.ComponentProps<'textarea'>, 'ref'> & { value: string; taRef?: React.RefObject<HTMLTextAreaElement | null> }) {
  const own = useRef<HTMLTextAreaElement>(null)
  const ref = taRef ?? own
  useLayoutEffect(() => {
    const t = ref.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = t.scrollHeight + 'px'
  }, [value, ref])
  return <textarea ref={ref} value={value} {...props} />
}

const hasContent = (b: Block) => !!(b.v?.trim() || b.mediaId || b.u?.trim() || b.n?.trim())

function EditorInner() {
  const { E: e, setE, toast, dialog, closeDialog, setNews, show, newNote, call, can, sections, authors } = useAdmin()
  const E = e!
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const leadRef = useRef<HTMLTextAreaElement>(null)
  const [rev, setRev] = useState(0)
  const revRef = useRef(0)
  const eRef = useRef(E)
  eRef.current = E
  const saving = useRef<Promise<unknown> | null>(null)
  const pickMedia = usePickMedia()
  const canPublish = can('article.publish')
  const secOf = (id: string) => sections.find((s) => s.id === id)
  const auOf = (id: string | null) => authors.find((a) => a.id === id)?.name ?? 'Sin firma'

  /** Aplica un cambio de contenido: marca la nota como modificada y dispara el autoguardado. */
  const change = useCallback(
    (patch: Partial<Editor> | ((e: Editor) => Partial<Editor>)) => {
      setE((x) => x && { ...x, ...(typeof patch === 'function' ? patch(x) : patch), dirty: true, status: 'Cambios sin guardar…' })
      revRef.current++
      setRev(revRef.current)
    },
    [setE],
  )
  /** Cambio de interfaz (pestaña, vista) que no ensucia la nota. */
  const ui = (patch: Partial<Editor>) => setE((x) => x && { ...x, ...patch })

  /** Guarda en la base de datos. Devuelve el id de la nota o null si no se pudo. */
  const persist = useCallback(
    async (manual: boolean): Promise<string | null> => {
      if (saving.current) await saving.current
      const x = eRef.current
      if (!x) return null
      if (!x.id && !x.title.trim() && !x.lead.trim() && !x.blocks.some(hasContent)) return null
      const sent = revRef.current
      setE((y) => y && { ...y, status: 'Guardando…' })
      const p = call(
        saveArticle({
          id: x.id,
          title: x.title,
          lead: x.lead,
          sectionId: x.sec,
          authorId: x.au,
          tags: x.tags,
          slug: x.slug,
          seo: x.seo,
          blocks: x.blocks,
          com: x.com,
          news: x.news,
          flash: x.flash,
          live: x.live,
          manual,
        }),
      )
      saving.current = p
      const r = await p
      saving.current = null
      if (!r) {
        setE((y) => y && { ...y, status: 'No se pudo guardar. Se reintentará con el próximo cambio.' })
        return null
      }
      setE(
        (y) =>
          y && {
            ...y,
            id: r.id,
            slug: r.slug,
            dirty: revRef.current !== sent,
            status: 'Guardado a las ' + hm(r.savedAt),
            vers: r.version ? [r.version, ...y.vers] : y.vers,
          },
      )
      setNews((ns) => (ns.some((n) => n.id === r.id) ? ns.map((n) => (n.id === r.id ? r.news : n)) : [r.news, ...ns]))
      return r.id
    },
    [call, setE, setNews],
  )

  // Autoguardado 1,2 s después del último cambio
  useEffect(() => {
    if (!rev) return
    const t = setTimeout(() => persist(false), 1200)
    return () => clearTimeout(t)
  }, [rev, persist])

  // Versiones guardadas de una nota existente
  useEffect(() => {
    if (!E.id || E.vers.length) return
    call(listVersions(E.id)).then((v) => v && setE((y) => y && { ...y, vers: v }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [E.id])

  const saveNow = useCallback(async () => {
    if (await persist(true)) toast('Borrador guardado')
    else if (!eRef.current?.id) toast('Escribe algo antes de guardar')
  }, [persist, toast])

  // Ctrl/Cmd+S guarda
  useEffect(() => {
    const on = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
        ev.preventDefault()
        saveNow()
      }
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [saveNow])

  const setBlocks = (fn: (b: Block[]) => Block[]) => change((x) => ({ blocks: fn([...x.blocks]) }))
  const setBlock = (i: number, patch: Partial<Block>) => setBlocks((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  const picker = (at: number, replace: boolean) =>
    dialog(
      <>
        <DlgTitle>{replace ? 'Cambiar tipo de bloque' : 'Añadir un bloque'}</DlgTitle>
        <p className="text-sm text-eg-muted">Elige qué quieres colocar. El sistema decide cómo se ve.</p>
        <TplGrid>
          {(Object.keys(LBL) as BlockType[]).map((k) => (
            <TplBtn
              key={k}
              icon={<I n={BI[k]} />}
              title={LBL[k]}
              desc={BH[k]}
              onClick={() => {
                const nb = mk(k)
                setBlocks((b) => {
                  if (replace) b[at] = nb
                  else b.splice(at, 0, nb)
                  return b
                })
                closeDialog()
                setTimeout(() => document.querySelector<HTMLElement>(`[data-bid="${nb.id}"] input, [data-bid="${nb.id}"] textarea`)?.focus(), 30)
              }}
            />
          ))}
        </TplGrid>
        <DlgRow>
          <B v="out" onClick={closeDialog}>
            Cancelar
          </B>
        </DlgRow>
      </>,
    )

  /* calidad */
  const imgs = E.blocks.filter((b) => b.t === 'img' && b.src)
  const ps = E.blocks.filter((b) => b.t === 'p').length
  const w = words(E),
    tl = E.title.trim().length,
    seo = E.seo.length
  const focusId = (id: string) => {
    ui({ tab: 'pb' })
    setTimeout(() => document.getElementById(id)?.focus(), 30)
  }
  const quality: Check[] = [
    { ok: tl >= 40 && tl <= 90, l: 'Titular claro, de 40 a 90 caracteres', h: tl ? `Ahora tiene ${tl}.` : 'Aún no hay titular.', f: () => titleRef.current?.focus() },
    { ok: E.lead.trim().length >= 60, l: 'Bajada que resume la nota', h: 'Escribe al menos 60 caracteres.', f: () => leadRef.current?.focus() },
    {
      ok: imgs.length > 0 && imgs.every((i) => i.alt?.trim()),
      l: 'Imagen principal con texto alternativo',
      h: imgs.length ? 'Falta el texto alternativo en alguna imagen.' : 'Añade al menos una imagen.',
      f: () => picker(E.blocks.length, false),
    },
    { ok: ps < 4 || E.blocks.some((b) => b.t === 'sub'), l: 'Subtítulos en notas largas', h: 'Con 4 o más párrafos conviene dividir con un subtítulo.', f: () => picker(E.blocks.length, false) },
    { ok: w >= 120, l: 'Extensión suficiente (120 palabras o más)', h: `Ahora tiene ${w}.`, f: () => {} },
    { ok: E.tags.length >= 2, l: 'Al menos 2 etiquetas', h: 'Ayudan a encontrarla y a recomendarla.', f: () => focusId('tg') },
    { ok: seo >= 90 && seo <= 160, l: 'Descripción para buscadores de 90 a 160 caracteres', h: `Ahora tiene ${seo}.`, f: () => focusId('seo') },
  ]
  const score = Math.round((quality.filter((x) => x.ok).length / quality.length) * 100)

  /* versiones */
  const versions = () =>
    dialog(
      <>
        <DlgTitle>Versiones de esta nota</DlgTitle>
        <p className="text-sm text-eg-muted">Se guardan solas mientras escribes. Al restaurar una, la actual queda guardada como versión.</p>
        {E.vers.length ? (
          <QL className="mt-2">
            {E.vers.slice(0, 20).map((v) => (
              <li key={v.id}>
                <I n="clock" />
                <div>
                  <b>
                    {fd(v.at)}
                    {v.manual ? ' · manual' : ''}
                  </b>
                  <div className={sub}>
                    {(v.title || 'Sin titular').slice(0, 60)} · {v.blocks} bloques
                  </div>
                </div>
                <B
                  v="out"
                  sm
                  className="ml-auto"
                  onClick={async () => {
                    closeDialog()
                    const d = await call(getVersion(v.id))
                    if (!d) return
                    change({ title: d.title, lead: d.lead, blocks: d.blocks, tags: d.tags })
                    toast('Versión restaurada')
                  }}
                >
                  Restaurar
                </B>
              </li>
            ))}
          </QL>
        ) : (
          <Empty title="Aún no hay versiones">Empieza a escribir y se guardarán solas.</Empty>
        )}
        <DlgRow>
          <B v="out" onClick={closeDialog}>
            Cerrar
          </B>
        </DlgRow>
      </>,
    )

  /* publicar */
  const actionLabel =
    E.mode === 'now' ? (E.est === 'pub' ? 'Actualizar nota' : 'Publicar ahora') : E.mode === 'sch' ? 'Programar' : E.mode === 'rev' ? 'Enviar a revisión' : 'Guardar borrador'

  const publish = () => {
    if (E.mode !== 'draft' && !E.title.trim()) {
      toast('Escribe un titular antes de continuar')
      titleRef.current?.focus()
      return
    }
    const bad = quality.filter((x) => !x.ok),
      wh = new Date(E.when),
      sch = E.mode === 'sch'
    if (sch && wh < new Date()) {
      toast('Elige una fecha futura para programar la nota')
      ui({ tab: 'pb' })
      return
    }
    const ttl = E.mode === 'now' ? (E.est === 'pub' ? 'Actualizar la nota publicada' : 'Publicar ahora') : sch ? 'Programar la nota' : E.mode === 'rev' ? 'Enviar a revisión' : 'Guardar como borrador'
    dialog(
      <>
        <DlgTitle>{ttl}</DlgTitle>
        <p className="mb-2.5 text-sm">
          <b>{E.title || 'Sin titular'}</b>
          <br />
          <span className={sub}>
            {secOf(E.sec)?.name} · {auOf(E.au)}
            {sch ? ' · saldrá el ' + fd(wh) : ''}
          </span>
        </p>
        <div className={`${cp} rounded-xl bg-eg-soft`}>
          <b>Calidad editorial: {score} de 100</b>
          {bad.length ? (
            <>
              <ul className="mt-1.5 mb-0 list-disc pl-[18px]">
                {bad.slice(0, 4).map((x) => (
                  <li key={x.l}>{x.l}</li>
                ))}
              </ul>
              <div className={`${sub} mt-1.5`}>Puedes continuar, pero conviene revisarlo.</div>
            </>
          ) : (
            <div className={sub}>Todo en orden.</div>
          )}
        </div>
        <DlgRow>
          <B v="out" onClick={closeDialog}>
            Seguir editando
          </B>
          <B v={E.mode === 'now' ? 'acc' : 'ink'} onClick={confirm}>
            {bad.length && E.mode !== 'draft' ? ttl + ' con avisos' : ttl}
          </B>
        </DlgRow>
      </>,
    )

    async function confirm() {
      closeDialog()
      const id = await persist(true)
      if (!id) return
      const mode = E.mode === 'now' ? 'pub' : E.mode
      const row = await call(setArticleStatus({ id, mode, when: sch ? wh.toISOString() : null }))
      if (!row) return
      setNews((ns) => ns.map((n) => (n.id === row.id ? row : n)))
      setE((x) => x && { ...x, est: row.st, dirty: false })
      const st = row.st
      toast(
        st === 'pub' ? 'Nota publicada en El Global' : st === 'sch' ? 'Nota programada para el ' + fd(wh) : st === 'rev' ? 'Nota enviada a revisión' : 'Borrador guardado',
      )
      const url = `/${row.secSlug}/${row.slug}`
      if (st === 'pub' || st === 'sch')
        dialog(
          <>
            <DlgTitle>{st === 'pub' ? 'Tu nota ya está en línea' : 'Tu nota quedó programada'}</DlgTitle>
            <p className="text-sm text-eg-muted">
              {st === 'pub'
                ? `Aparece en la sección ${row.sec} y en la portada. El sitio se actualiza en unos segundos.`
                : 'Saldrá sola el ' + fd(wh) + '. Puedes cambiarla desde el calendario editorial.'}
            </p>
            <DlgRow>
              {st === 'pub' && (
                <a href={url} target="_blank" rel="noopener" className={btnClass({ v: 'out' })}>
                  <I n="eye" />
                  Ver en el sitio
                </a>
              )}
              <B
                v="out"
                onClick={() => {
                  closeDialog()
                  show('news')
                }}
              >
                Ir a Noticias
              </B>
              <B
                onClick={() => {
                  closeDialog()
                  newNote()
                }}
              >
                Escribir otra nota
              </B>
            </DlgRow>
          </>,
        )
    }
  }

  const n = E.title.length

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_440px] items-start gap-5 pb-[90px] max-[1180px]:grid-cols-1">
        <div className="mx-auto w-full max-w-[760px]">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge k={E.est === 'draft' ? '' : E.est}>{ST[E.est]}</Badge>
            <span className={sub} aria-live="polite">
              {E.status}
            </span>
          </div>
          <AutoTA
            taRef={titleRef}
            rows={1}
            value={E.title}
            placeholder="Escribe el titular"
            aria-label="Titular"
            onChange={(ev) => {
              const t = ev.target.value
              change((x) => ({ title: t, slug: x.slugEd ? x.slug : slugify(t) }))
            }}
            className="w-full resize-none overflow-hidden border-0 bg-transparent py-1.5 font-serif text-[clamp(28px,3.4vw,40px)] leading-[1.1] font-semibold tracking-[-.02em] outline-0"
          />
          <div className={hint}>{n ? n + ' caracteres' + (n > 90 ? ' · conviene acortarlo' : '') : ''}</div>
          <AutoTA
            taRef={leadRef}
            rows={2}
            value={E.lead}
            placeholder="Escribe la bajada: una o dos frases que resuman la nota"
            aria-label="Bajada"
            onChange={(ev) => change({ lead: ev.target.value })}
            className="w-full resize-none border-0 border-b border-eg-rule bg-transparent pt-1 pb-3.5 font-serif text-[19px] leading-[1.45] text-eg-muted outline-0"
          />
          <Blocks
            E={E}
            setBlock={setBlock}
            setBlocks={setBlocks}
            picker={picker}
            pickMedia={pickMedia}
            onDelete={() => toast('Bloque eliminado')}
            onGen={(i) => {
              setBlock(i, { v: genSum(E) })
              toast('Resumen generado desde tus párrafos')
            }}
          />
        </div>

        <aside className="sticky top-[76px] grid gap-3 max-[1180px]:static">
          <Card>
            <Tabs
              value={E.tab}
              onChange={(t) => ui({ tab: t })}
              tabs={[
                ['pv', 'Vista previa'],
                ['pb', 'Publicar'],
                [
                  'ql',
                  <>
                    Calidad <Badge>{score}%</Badge>
                  </>,
                ],
              ]}
            />
            <div className={cn(cp, 'max-h-[calc(100vh-150px)] overflow-auto max-[1180px]:max-h-none')}>
              {E.tab === 'pv' && <PreviewPanel E={E} ui={ui} secName={secOf(E.sec)?.name ?? ''} auName={auOf(E.au)} />}
              {E.tab === 'pb' && <PublishPanel E={E} change={change} canPublish={canPublish} />}
              {E.tab === 'ql' && (
                <QualityPanel
                  E={E}
                  quality={quality}
                  score={score}
                  onTitle={(t) => {
                    change({ title: t })
                    toast('Titular actualizado')
                  }}
                  onSummary={() => {
                    change((x) => {
                      const bl = [...x.blocks]
                      const i = bl.findIndex((b) => b.t === 'sum')
                      if (i >= 0) bl[i] = { ...bl[i], v: genSum(x) }
                      else bl.unshift(mk('sum', { v: genSum(x) }))
                      return { blocks: bl }
                    })
                    toast('Resumen añadido al inicio de la nota')
                  }}
                  focusTitle={() => titleRef.current?.focus()}
                />
              )}
            </div>
          </Card>
        </aside>
      </div>

      <div className="fixed right-0 bottom-0 left-[15.5rem] z-30 flex items-center gap-2.5 border-t border-eg-rule bg-eg-panel/94 px-6 py-2.5 backdrop-blur-[10px] max-[900px]:left-0 max-[900px]:px-3 max-[900px]:py-2">
        <span className={cn(sub, 'max-[900px]:hidden')}>{E.status}</span>
        <span className="flex-1" />
        <B v="out" onClick={versions} aria-label="Versiones" disabled={!E.id}>
          <I n="undo" />
          <span className="max-[560px]:hidden">Versiones</span>
        </B>
        <B v="out" onClick={saveNow} aria-label="Guardar borrador">
          <I n="check" />
          <span className="max-[560px]:hidden">Guardar</span>
        </B>
        <B v="acc" onClick={publish}>
          <I n="up2" />
          {actionLabel}
        </B>
      </div>
    </>
  )
}

/* ---------- bloques ---------- */

function Blocks({
  E,
  setBlock,
  setBlocks,
  picker,
  pickMedia,
  onDelete,
  onGen,
}: {
  E: Editor
  setBlock: (i: number, p: Partial<Block>) => void
  setBlocks: (fn: (b: Block[]) => Block[]) => void
  picker: (at: number, replace: boolean) => void
  pickMedia: (cb: (m: { id: string; s: string; a: string }) => void) => void
  onDelete: () => void
  onGen: (i: number) => void
}) {
  const { media } = useAdmin()
  // Imágenes que ya no están en la biblioteca (en la papelera o borradas), p. ej. al restaurar una versión vieja.
  const gone = (b: Block) => !!b.mediaId && !media.some((m) => m.id === b.mediaId && !m.d)
  const [from, setFrom] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const add = (i: number) => (
    <button
      type="button"
      onClick={() => picker(i, false)}
      className="flex h-6 w-full items-center justify-center gap-1.5 border-0 bg-transparent text-xs text-eg-muted opacity-0 transition-opacity duration-150 group-hover/canvas:opacity-90 hover:opacity-90 focus-visible:opacity-90"
    >
      <I n="plus" />
      Añadir bloque aquí
    </button>
  )
  const field = 'h-[34px]'

  return (
    <div className="group/canvas">
      {add(0)}
      {E.blocks.map((b, i) => (
        <div key={b.id}>
          <div
            data-bid={b.id}
            draggable
            onDragStart={(e) => {
              setFrom(i)
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', String(i))
            }}
            onDragOver={(e) => {
              if (from === null) return
              e.preventDefault()
              setOver(i)
            }}
            onDrop={(e) => {
              if (from === null) return
              e.preventDefault()
              setBlocks((bl) => {
                const [x] = bl.splice(from, 1)
                bl.splice(i, 0, x)
                return bl
              })
              setFrom(null)
              setOver(null)
            }}
            onDragEnd={() => {
              setFrom(null)
              setOver(null)
            }}
            className={cn(
              'my-2.5 rounded-[10px] border border-eg-rule bg-eg-panel transition-shadow duration-150 focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--eg-accent)_35%,transparent)]',
              from === i && 'opacity-40',
              over === i && from !== i && 'border-eg-accent',
            )}
          >
            <div className="flex items-center gap-1.5 pt-1.5 pr-2 pl-2.5 text-xs text-eg-muted">
              <span className="cursor-grab px-1 py-0.5 tracking-[-2px]" title="Arrastra para mover">
                ⋮⋮
              </span>
              <I n={BI[b.t]} />
              <b className="font-semibold">{LBL[b.t]}</b>
              <span className="flex-1" />
              <B
                v="ghost"
                ic
                sm
                aria-label="Subir bloque"
                disabled={i === 0}
                onClick={() =>
                  setBlocks((bl) => {
                    ;[bl[i - 1], bl[i]] = [bl[i], bl[i - 1]]
                    return bl
                  })
                }
              >
                <I n="up" />
              </B>
              <B
                v="ghost"
                ic
                sm
                aria-label="Bajar bloque"
                disabled={i === E.blocks.length - 1}
                onClick={() =>
                  setBlocks((bl) => {
                    ;[bl[i + 1], bl[i]] = [bl[i], bl[i + 1]]
                    return bl
                  })
                }
              >
                <I n="down" />
              </B>
              <B
                v="ghost"
                ic
                sm
                aria-label="Duplicar bloque"
                onClick={() =>
                  setBlocks((bl) => {
                    const { id: _id, ...rest } = b
                    bl.splice(i + 1, 0, mk(b.t, rest))
                    return bl
                  })
                }
              >
                <I n="copy" />
              </B>
              <B
                v="ghost"
                ic
                sm
                aria-label="Eliminar bloque"
                onClick={() => {
                  setBlocks((bl) => bl.filter((_, j) => j !== i))
                  onDelete()
                }}
              >
                <I n="trash" />
              </B>
            </div>
            <div className="grid gap-2 px-3 pt-1.5 pb-3">
              {b.t === 'p' && (
                <AutoTA
                  rows={3}
                  value={b.v ?? ''}
                  aria-label="Texto"
                  placeholder="Escribe el texto. Pulsa / para cambiar el tipo de bloque"
                  onChange={(e) => {
                    setBlock(i, { v: e.target.value })
                    if (e.target.value === '/') picker(i, true)
                  }}
                  className="min-h-[60px] w-full resize-none overflow-hidden border-0 bg-transparent px-0 py-1 font-serif text-[17px] leading-[1.6] outline-0"
                />
              )}
              {b.t === 'sub' && (
                <input
                  className={cn(inp, '!h-11 font-serif !text-2xl font-semibold')}
                  placeholder="Subtítulo"
                  aria-label="Subtítulo"
                  value={b.v ?? ''}
                  onChange={(e) => setBlock(i, { v: e.target.value })}
                />
              )}
              {b.t === 'quote' && (
                <>
                  <AutoTA
                    rows={2}
                    value={b.v ?? ''}
                    placeholder="La cita textual"
                    aria-label="Cita"
                    onChange={(e) => setBlock(i, { v: e.target.value })}
                    className="min-h-[60px] w-full resize-none overflow-hidden border-0 bg-transparent px-0 py-1 font-serif text-[17px] leading-[1.6] italic outline-0"
                  />
                  <input
                    className={cn(inp, field)}
                    placeholder="¿Quién lo dijo?"
                    aria-label="Autor de la cita"
                    value={b.who ?? ''}
                    onChange={(e) => setBlock(i, { who: e.target.value })}
                  />
                </>
              )}
              {b.t === 'img' && (
                <>
                  <div className="flex items-center gap-3 max-[520px]:flex-col max-[520px]:items-stretch">
                    <Thumb className="relative h-[84px] w-[132px]">
                      {b.src && <ArtImg src={b.src} className={gone(b) ? 'opacity-30 grayscale' : undefined} />}
                      {gone(b) && (
                        <span className="absolute inset-0 grid place-items-center p-1 text-center text-[11px] leading-tight font-semibold text-eg-accent">
                          Imagen eliminada, elige otra
                        </span>
                      )}
                    </Thumb>
                    <div className="grid flex-1 gap-2">
                      <div>
                        <B
                          v="out"
                          sm
                          onClick={() => pickMedia((m) => setBlock(i, { mediaId: m.id, src: m.s, alt: b.alt || m.a }))}
                        >
                          <I n="image" />
                          {b.src ? 'Cambiar imagen' : 'Elegir imagen'}
                        </B>
                      </div>
                      <input
                        className={cn(inp, field)}
                        placeholder="Texto alternativo (obligatorio): describe la imagen"
                        aria-label="Texto alternativo"
                        aria-invalid={!!b.src && !b.alt}
                        value={b.alt ?? ''}
                        onChange={(e) => setBlock(i, { alt: e.target.value })}
                      />
                    </div>
                  </div>
                  <input
                    className={cn(inp, field)}
                    placeholder="Pie de foto (opcional)"
                    aria-label="Pie de foto"
                    value={b.cap ?? ''}
                    onChange={(e) => setBlock(i, { cap: e.target.value })}
                  />
                </>
              )}
              {b.t === 'video' && (
                <>
                  <input
                    className={cn(inp, field)}
                    placeholder="Enlace o nombre del video"
                    aria-label="Video"
                    value={b.u ?? ''}
                    onChange={(e) => setBlock(i, { u: e.target.value })}
                  />
                  <Row2 className="py-0">
                    <span>Es vertical (9:16): en el celular ocupa toda la pantalla</span>
                    <Switch checked={!!b.vert} onChange={(v) => setBlock(i, { vert: v })} />
                  </Row2>
                  <input
                    className={cn(inp, field)}
                    placeholder="Descripción del video (opcional)"
                    aria-label="Descripción"
                    value={b.cap ?? ''}
                    onChange={(e) => setBlock(i, { cap: e.target.value })}
                  />
                </>
              )}
              {b.t === 'data' && (
                <div className="grid grid-cols-[140px_1fr] gap-2 max-[520px]:grid-cols-1">
                  <input
                    className={cn(inp, '!h-11 font-serif !text-2xl font-semibold')}
                    placeholder="42 %"
                    aria-label="Cifra"
                    value={b.n ?? ''}
                    onChange={(e) => setBlock(i, { n: e.target.value })}
                  />
                  <input
                    className={cn(inp, '!h-11')}
                    placeholder="Qué significa la cifra"
                    aria-label="Descripción de la cifra"
                    value={b.l ?? ''}
                    onChange={(e) => setBlock(i, { l: e.target.value })}
                  />
                </div>
              )}
              {b.t === 'poll' && (
                <>
                  <input
                    className={cn(inp, field, 'font-serif !text-[17px] font-medium')}
                    placeholder="Pregunta, p. ej.: ¿Debe subir el salario mínimo?"
                    aria-label="Pregunta de la encuesta"
                    maxLength={200}
                    value={b.q ?? ''}
                    onChange={(e) => setBlock(i, { q: e.target.value })}
                  />
                  {(b.opts ?? []).map((o, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <span className="grid size-6 flex-none place-items-center rounded-full bg-eg-soft text-xs font-semibold">{j + 1}</span>
                      <input
                        className={cn(inp, field)}
                        placeholder={'Opción ' + (j + 1)}
                        aria-label={'Opción ' + (j + 1)}
                        maxLength={80}
                        value={o}
                        onChange={(e) => setBlock(i, { opts: (b.opts ?? []).map((x, k) => (k === j ? e.target.value : x)) })}
                      />
                      <B
                        v="ghost"
                        ic
                        sm
                        aria-label={'Quitar opción ' + (j + 1)}
                        disabled={(b.opts ?? []).length <= 2}
                        onClick={() => setBlock(i, { opts: (b.opts ?? []).filter((_, k) => k !== j) })}
                      >
                        <I n="x" />
                      </B>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-2">
                    <B v="out" sm disabled={(b.opts ?? []).length >= 6} onClick={() => setBlock(i, { opts: [...(b.opts ?? []), ''] })}>
                      <I n="plus" />
                      Añadir opción
                    </B>
                    <span className={hint}>De 2 a 6 opciones. Los resultados se ven al votar.</span>
                  </div>
                </>
              )}
              {b.t === 'sum' && (
                <>
                  <textarea
                    rows={4}
                    className={ta}
                    aria-label="Resumen"
                    placeholder="Un punto por línea"
                    value={b.v ?? ''}
                    onChange={(e) => setBlock(i, { v: e.target.value })}
                  />
                  <div>
                    <B v="out" sm onClick={() => onGen(i)}>
                      <I n="spark" />
                      Generar desde el texto
                    </B>
                  </div>
                </>
              )}
            </div>
          </div>
          {add(i + 1)}
        </div>
      ))}
      {!E.blocks.length && <Empty title="Tu nota está vacía">Añade el primer bloque con el botón de arriba.</Empty>}
    </div>
  )
}

/* ---------- panel: vista previa ---------- */

function Preview({ E, secName, auName }: { E: Editor; secName: string; auName: string }) {
  const L = layout(E)
  const mob = E.view === 'mob'
  let pi = 0
  const head = (
    <>
      <span className={cn('font-sans text-[11px] font-semibold', mob && L.hero ? 'text-[#ffb3ad]' : 'text-[#b3261e]')}>
        {secName.toUpperCase()}
      </span>
      <h2
        className={cn(
          'my-1.5 font-serif leading-[1.1] font-semibold tracking-[-.02em]',
          mob && L.hero ? 'text-2xl text-white' : 'text-[26px]',
        )}
      >
        {E.title || 'El titular aparecerá aquí'}
      </h2>
      {E.lead && (
        <p className={cn('mb-2.5 font-serif text-base leading-[1.45]', mob && L.hero ? 'text-white/85' : 'text-[#5b6470]')}>
          {E.lead}
        </p>
      )}
    </>
  )
  const by = (
    <div className="mb-3 border-y border-[#ddd5c7] py-2 font-sans text-xs text-[#5b6470]">
      Por {auName} · {readTime(E)} min de lectura
    </div>
  )
  const fig = (b: Block) => (
    <figure className="mb-3">
      <ArtImg src={b.src!} alt={b.alt ?? ''} className="aspect-video h-auto rounded-[2px]" />
      {b.cap && <figcaption className="mt-1 font-sans text-xs text-[#5b6470]">{b.cap}</figcaption>}
    </figure>
  )
  const box = 'mb-3 border-l-[3px] border-[#b3261e] bg-[#e9edec]'

  return (
    <div
      className={cn(
        'overflow-hidden bg-[#fffdf9] font-serif text-[#14202b]',
        mob ? 'text-sm' : 'rounded-[10px] border border-eg-rule',
      )}
    >
      {mob && L.hero && (
        <>
          <div className="h-[3px] w-[35%] bg-[#b3261e]" />
          <div className="relative aspect-[4/5] bg-[#0e2238]">
            <ArtImg src={L.hero.src!} className="absolute inset-0" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,12,22,.85)_8%,transparent_62%)]" />
            <div className="absolute right-3.5 bottom-3.5 left-3.5 z-[2]">{head}</div>
          </div>
        </>
      )}
      <div className="px-[18px] pt-4 pb-[22px]">
        {!(mob && L.hero) && head}
        {by}
        {!(mob && L.hero) && L.hero && fig(L.hero)}
        {L.out.map((b) => {
          if (b.t === 'gal')
            return b.im.length > 1 ? (
              <div key={b.id} className={cn('mb-3 grid gap-1.5', b.im.length > 2 ? 'grid-cols-3' : 'grid-cols-2')}>
                {b.im.map((im) => (
                  <ArtImg key={im.id} src={im.src!} alt={im.alt ?? ''} className="aspect-[4/3] h-auto rounded-[2px]" />
                ))}
              </div>
            ) : (
              <div key={b.id}>{fig(b.im[0])}</div>
            )
          if (b.t === 'p')
            return (
              <p key={b.id} className={cn('mb-3 text-[15px] leading-[1.65]', pi++ === 0 && 'eg-dropcap')}>
                {b.v}
              </p>
            )
          if (b.t === 'sub')
            return (
              <h3 key={b.id} className="mt-4 mb-1.5 text-xl leading-[1.2] font-semibold">
                {b.v}
              </h3>
            )
          if (b.t === 'quote')
            return (
              <blockquote key={b.id} className="my-4 border-t-2 border-b border-t-[#14202b] border-b-[#ddd5c7] py-2.5 text-[22px] leading-[1.25] italic">
                «{b.v}»{b.who && <cite className="mt-1.5 block font-sans text-xs text-[#5b6470] not-italic">{b.who}</cite>}
              </blockquote>
            )
          if (b.t === 'data')
            return (
              <div key={b.id} className={cn(box, 'px-3.5 py-3')}>
                <b className="block text-[38px] leading-none font-semibold text-[#b3261e]">{b.n}</b>
                <span className="font-sans text-[13px] text-[#5b6470]">{b.l}</span>
              </div>
            )
          if (b.t === 'video')
            return (
              <figure key={b.id} className="mb-3">
                <div
                  className={cn(
                    'grid w-full place-items-center rounded-[2px] bg-[linear-gradient(135deg,#1f4163,#0e2238)] font-sans text-[13px] font-semibold text-white',
                    b.vert ? 'mx-auto aspect-[9/16] max-w-[62%]' : 'aspect-video',
                  )}
                >
                  ▶ {b.u || 'Video'}
                </div>
                {b.cap && <figcaption className="mt-1 font-sans text-xs text-[#5b6470]">{b.cap}</figcaption>}
              </figure>
            )
          if (b.t === 'poll' && b.q)
            return (
              <div key={b.id} className={cn(box, 'px-3.5 py-3 font-sans')}>
                <b className="mb-2 block font-serif text-[17px]">{b.q}</b>
                {(b.opts ?? [])
                  .filter(Boolean)
                  .map((o, j) => (
                    <div key={j} className="mb-1.5 rounded border border-[#ddd5c7] bg-white px-3 py-2 text-[13px]">
                      {o}
                    </div>
                  ))}
              </div>
            )
          if (b.t === 'sum' && b.v)
            return (
              <div key={b.id} className={cn(box, 'px-3.5 py-2.5 text-sm leading-normal')}>
                <b className="block font-sans text-xs font-semibold">En 30 segundos</b>
                <ul className="mt-1 mb-0 list-disc pl-[18px]">
                  {b.v
                    .split('\n')
                    .filter(Boolean)
                    .map((x, j) => (
                      <li key={j}>{x}</li>
                    ))}
                </ul>
              </div>
            )
          return null
        })}
      </div>
    </div>
  )
}

function PreviewPanel({ E, ui, secName, auName }: { E: Editor; ui: (p: Partial<Editor>) => void; secName: string; auName: string }) {
  const f = layout(E).flags
  const F: [keyof typeof f, string][] = [
    ['hero', 'Primera imagen como portada'],
    ['gal', 'Imágenes seguidas en galería'],
    ['quote', 'Cita destacada'],
    ['data', 'Dato en llamada'],
    ['vid', 'Video vertical a pantalla completa'],
    ['drop', 'Capitular al inicio'],
  ]
  return (
    <>
      <div className="mb-2.5">
        <Seg
          label="Dispositivo"
          value={E.view}
          onChange={(v) => ui({ view: v })}
          options={[
            ['desk', 'Escritorio'],
            ['mob', 'Móvil vertical'],
          ]}
        />
      </div>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {F.map(([k, l]) => (
          <span
            key={k}
            className={cn('rounded-md px-2 py-0.5 text-xs', f[k] ? 'bg-eg-ok/16 font-semibold text-eg-ok' : 'bg-eg-soft text-eg-muted')}
          >
            {f[k] ? '✓ ' : ''}
            {l}
          </span>
        ))}
      </div>
      {E.view === 'mob' ? (
        <div className="mx-auto max-h-[640px] w-[304px] max-w-full overflow-hidden overflow-y-auto rounded-[34px] border-[9px] border-[#14202b] bg-[#fffdf9]">
          <Preview E={E} secName={secName} auName={auName} />
        </div>
      ) : (
        <Preview E={E} secName={secName} auName={auName} />
      )}
    </>
  )
}

/* ---------- panel: publicar ---------- */

function PublishPanel({
  E,
  change,
  canPublish,
}: {
  E: Editor
  change: (p: Partial<Editor> | ((e: Editor) => Partial<Editor>)) => void
  canPublish: boolean
}) {
  const { sections, authors } = useAdmin()
  const secSlug = sections.find((s) => s.id === E.sec)?.slug ?? '…'
  const [tag, setTag] = useState('')
  const sat = (() => {
    const x = D(0, 9, 0)
    x.setDate(x.getDate() + ((6 - x.getDay() + 7) % 7 || 7))
    return x
  })()
  const quick: [string, Date][] = [
    ['Mañana 7:30', D(1, 7, 30)],
    ['Hoy 18:00', D(0, 18, 0)],
    ['Sábado 9:00', sat],
  ]
  const n = E.seo.length
  const fieldCls = 'mt-3.5 flex min-w-0 flex-col gap-1.5'

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className={lab}>¿Cuándo sale?</span>
        <div>
          <Seg<Mode>
            label="Momento de publicación"
            value={E.mode}
            onChange={(m) => change({ mode: m })}
            options={
              canPublish
                ? [
                    ['now', E.est === 'pub' ? 'Publicada' : 'Publicar ahora'],
                    ['sch', 'Programar'],
                    ['draft', E.est === 'pub' || E.est === 'sch' ? 'Retirar (borrador)' : 'Borrador'],
                  ]
                : [
                    ['draft', 'Borrador'],
                    ['rev', 'Enviar a revisión'],
                  ]
            }
          />
        </div>
      </div>
      {E.mode === 'sch' && (
        <div className="mt-2.5">
          <label className={lab} htmlFor="wh">
            Fecha y hora
          </label>
          <input className={inp} type="datetime-local" id="wh" value={E.when} onChange={(e) => change({ when: e.target.value })} />
          <div className="mt-2 flex flex-wrap gap-2">
            {quick.map(([l, d]) => (
              <button
                key={l}
                type="button"
                onClick={() => change({ when: loc(d) })}
                className="inline-flex min-h-8 items-center rounded-full border border-eg-rule bg-eg-panel px-3 py-1 text-[13px] font-medium"
              >
                {l}
              </button>
            ))}
          </div>
          <div className={cn(hint, 'mt-1.5 flex gap-1')}>
            <I n="spark" /> Se publica sola a esa hora (hora de este equipo).
          </div>
        </div>
      )}
      <div className="mt-3.5 grid grid-cols-2 gap-4 max-[520px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="sc" className={lab}>
            Sección
          </label>
          <select className={inp} id="sc" value={E.sec} onChange={(e) => change({ sec: e.target.value })}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="au" className={lab}>
            Autor
          </label>
          <select className={inp} id="au" value={E.au ?? ''} onChange={(e) => change({ au: e.target.value || null })}>
            <option value="">Sin firma</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={fieldCls}>
        <label htmlFor="tg" className={lab}>
          Etiquetas
        </label>
        <div className="flex flex-wrap gap-2">
          {E.tags.length ? (
            E.tags.map((x, i) => (
              <Chip key={x}>
                #{x}
                <button
                  type="button"
                  className="border-0 bg-transparent p-0 leading-none"
                  aria-label={'Quitar etiqueta ' + x}
                  onClick={() => change((e) => ({ tags: e.tags.filter((_, j) => j !== i) }))}
                >
                  <I n="x" />
                </button>
              </Chip>
            ))
          ) : (
            <span className={hint}>Aún no hay etiquetas</span>
          )}
        </div>
        <input
          className={inp}
          id="tg"
          placeholder="Escribe una etiqueta y pulsa Enter"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ',') && tag.trim()) {
              e.preventDefault()
              const v = tag.trim().toLowerCase().replace(/,/g, '')
              change((x) => ({ tags: x.tags.includes(v) ? x.tags : [...x.tags, v] }))
              setTag('')
            }
          }}
        />
      </div>
      <div className={fieldCls}>
        <label htmlFor="slug" className={lab}>
          Dirección de la nota
        </label>
        <input className={inp} id="slug" value={E.slug} onChange={(e) => change({ slug: slugify(e.target.value), slugEd: true })} />
        <div className={cn(hint, 'break-all')}>
          elglobal.com/{secSlug}/{E.slug || '…'}
        </div>
      </div>
      <div className={fieldCls}>
        <label htmlFor="seo" className={lab}>
          Descripción para buscadores
        </label>
        <textarea className={cn(ta, 'min-h-[70px]')} id="seo" rows={3} value={E.seo} onChange={(e) => change({ seo: e.target.value })} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn(hint, n >= 90 && n <= 160 && '!text-eg-ok')}>{n} caracteres (ideal: 90 a 160)</span>
          <B v="out" sm onClick={() => change((x) => ({ seo: (x.lead || x.title).slice(0, 155) }))}>
            <I n="spark" />
            Generar desde la bajada
          </B>
        </div>
        <Card className="mt-1.5 px-3 py-2.5">
          <div className="text-xs text-eg-muted">elglobal.com › {secSlug}</div>
          <div className="font-serif text-[17px] font-medium text-eg-info">{(E.title || 'Titular de la nota').slice(0, 65)}</div>
          <div className="text-xs text-eg-muted">{(E.seo || E.lead || 'La descripción aparecerá aquí.').slice(0, 160)}</div>
        </Card>
      </div>
      <div className="mt-2.5">
        <Row2>
          <span>Permitir comentarios</span>
          <Switch checked={E.com} onChange={(v) => change({ com: v })} />
        </Row2>
        <Row2>
          <span>Enviar en el boletín de mañana</span>
          <Switch checked={E.news} onChange={(v) => change({ news: v })} />
        </Row2>
        <Row2>
          <span>Marcar como Última hora</span>
          <Switch checked={E.flash} onChange={(v) => change({ flash: v })} />
        </Row2>
        <Row2>
          <span>
            Cobertura en vivo
            <span className={cn(hint, 'block')}>Muestra «EN VIVO» y actualizaciones que aparecen solas</span>
          </span>
          <Switch checked={E.live} onChange={(v) => change({ live: v })} />
        </Row2>
        {E.live && <LiveDesk id={E.id} />}
      </div>
    </>
  )
}

/* ---------- cobertura en vivo ---------- */

/** Escribir y quitar entradas del directo. Se publican al momento, aparte del guardado de la nota. */
function LiveDesk({ id }: { id: string | null }) {
  const { call, toast } = useAdmin()
  const [list, setList] = useState<AdminLiveUpdate[] | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [important, setImportant] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!id) return
    listLiveUpdates(id).then((r) => setList(r.ok ? r.data : []))
  }, [id])
  if (!id) return <p className={cn(hint, 'mt-2')}>Escribe algo en la nota para guardarla; después podrás añadir actualizaciones.</p>
  return (
    <Card className="mt-2 grid gap-2 p-3">
      <b className="flex items-center gap-2 text-[13px]">
        <span className="size-2 animate-pulse rounded-full bg-eg-accent" />
        Actualizaciones del directo
      </b>
      <input className={inp} placeholder="Titular corto (opcional)" aria-label="Titular de la actualización" maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className={ta} rows={3} placeholder="Qué está pasando ahora" aria-label="Texto de la actualización" maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" className="size-4 accent-eg-accent" checked={important} onChange={(e) => setImportant(e.target.checked)} />
          Destacada
        </label>
        <span className="flex-1" />
        <B
          v="acc"
          sm
          disabled={busy || body.trim().length < 2}
          onClick={async () => {
            setBusy(true)
            const r = await call(addLiveUpdate(id, { title, body, important }))
            setBusy(false)
            if (!r) return
            setList((l) => [r, ...(l ?? [])])
            setTitle('')
            setBody('')
            setImportant(false)
            toast('Actualización publicada')
          }}
        >
          {busy ? 'Publicando…' : 'Publicar actualización'}
        </B>
      </div>
      <span className={hint}>Sale al instante en la nota publicada; los lectores la ven aparecer sin recargar.</span>
      {list === null ? (
        <span className={hint}>Cargando…</span>
      ) : (
        <ol className="m-0 grid max-h-[320px] list-none gap-2 overflow-auto p-0">
          {list.map((u) => (
            <li key={u.id} className={cn('rounded-lg border border-eg-rule p-2.5 text-[13px]', u.important && 'border-eg-accent')}>
              <div className="flex items-center gap-2">
                <b className="text-eg-accent">{hm(u.at)}</b>
                <span className={sub}>{u.by}</span>
                <span className="flex-1" />
                <B
                  v="ghost"
                  ic
                  sm
                  aria-label="Borrar actualización"
                  onClick={async () => {
                    if ((await call(deleteLiveUpdate(u.id))) === undefined) return
                    setList((l) => l?.filter((x) => x.id !== u.id) ?? null)
                  }}
                >
                  <I n="trash" />
                </B>
              </div>
              {u.title && <b className="block">{u.title}</b>}
              <p className="m-0 line-clamp-3 whitespace-pre-line">{u.body}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

/* ---------- panel: calidad ---------- */

function QualityPanel({
  E,
  quality,
  score,
  onTitle,
  onSummary,
  focusTitle,
}: {
  E: Editor
  quality: Check[]
  score: number
  onTitle: (t: string) => void
  onSummary: () => void
  focusTitle: () => void
}) {
  const { toast } = useAdmin()
  const [heads, setHeads] = useState<[string, string][]>([])
  const c = 2 * Math.PI * 34
  const color = score >= 80 ? 'var(--eg-ok)' : score >= 50 ? 'var(--eg-warn)' : 'var(--eg-accent)'
  return (
    <>
      <div className="mb-2 flex items-center gap-4">
        <div className="relative size-[84px] flex-none">
          <svg viewBox="0 0 84 84" width="84" height="84" aria-hidden="true">
            <circle cx="42" cy="42" r="34" fill="none" stroke="var(--eg-soft)" strokeWidth="9" />
            <circle
              cx="42"
              cy="42"
              r="34"
              fill="none"
              stroke={color}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${(c * score) / 100} ${c}`}
              transform="rotate(-90 42 42)"
            />
          </svg>
          <b className="absolute inset-0 grid place-items-center font-serif text-2xl font-semibold">{score}</b>
        </div>
        <div>
          <b className="font-serif text-lg font-semibold">
            {score >= 80 ? 'Lista para salir' : score >= 50 ? 'Casi lista' : 'Le falta trabajo'}
          </b>
          <div className={sub}>
            {quality.filter((x) => x.ok).length} de {quality.length} revisiones superadas · {readTime(E)} min de lectura
          </div>
        </div>
      </div>
      <QL>
        {quality.map((x) => (
          <li key={x.l}>
            <span className={x.ok ? 'text-eg-ok' : 'text-eg-muted'}>
              <I n={x.ok ? 'check' : 'x'} />
            </span>
            <div>
              <b>{x.l}</b>
              {!x.ok && <div className={sub}>{x.h}</div>}
            </div>
            {!x.ok && (
              <B v="out" sm className="ml-auto" onClick={x.f}>
                Corregir
              </B>
            )}
          </li>
        ))}
      </QL>
      <div className={cn(lab, 'mt-4 mb-2')}>
        Ayudas de redacción <span className={cn(sub, 'font-normal')}>(sugerencias simuladas)</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <B
          v="out"
          sm
          onClick={() => {
            if (!E.title.trim()) {
              toast('Escribe primero un titular para recibir variantes')
              focusTitle()
              return
            }
            const t = E.title.trim().replace(/[.:]$/, '')
            setHeads([
              ['Análisis', `Análisis: ${t}`],
              ['Guía', `Lo que debes saber: ${t}`],
              ['Claves', `${t}: las claves para entenderlo`],
            ])
          }}
        >
          <I n="spark" />
          Sugerir titulares
        </B>
        <B v="out" sm onClick={onSummary}>
          <I n="list" />
          Crear resumen en 30 segundos
        </B>
      </div>
      <div className="mt-2.5">
        {heads.map(([k, t]) => (
          <div key={k} className="flex items-center justify-between gap-3 border-t border-eg-rule py-2">
            <span>
              <Badge>{k}</Badge> {t}
            </span>
            <B v="out" sm onClick={() => onTitle(t)}>
              Usar
            </B>
          </div>
        ))}
      </div>
    </>
  )
}
