'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getLiveUpdates, getPoll, votePoll, type PollResult } from '@/app/actions'
import { Icon } from '@/components/eg/icon'
import { useToast } from '@/components/eg/toast'
import type { LiveUpdate } from '@/lib/queries'
import { SITE_TZ } from '@/lib/site'
import { cn } from '@/lib/utils'
import { TimeAgo } from './time-ago'

/* ---------- WhatsApp ---------- */

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`

export const WhatsAppIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.1 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
  </svg>
)

/* ---------- Cobertura en vivo ---------- */

const clock = (iso: string) => new Date(iso).toLocaleTimeString('es-DO', { timeZone: SITE_TZ, hour: 'numeric', minute: '2-digit' })

/** Entradas del directo. Consulta cada 30 s mientras la pestaña está visible; las nuevas se
    insertan solas si el lector aún no llegó al directo, o esperan tras un botón para no mover lo que lee. */
export function LiveFeed({ articleId, initial }: { articleId: string; initial: LiveUpdate[] }) {
  const [list, setList] = useState(initial)
  const [pending, setPending] = useState<LiveUpdate[]>([])
  const box = useRef<HTMLElement>(null)
  const latest = useRef(initial[0]?.at ?? new Date(0).toISOString())

  const check = useCallback(async () => {
    if (document.visibilityState !== 'visible') return
    const fresh = await getLiveUpdates(articleId, latest.current).catch(() => [])
    if (!fresh.length) return
    latest.current = fresh[0].at
    const reading = (box.current?.getBoundingClientRect().top ?? 1e9) < innerHeight
    if (reading) setPending((p) => [...fresh, ...p])
    else setList((l) => [...fresh, ...l])
  }, [articleId])

  useEffect(() => {
    check()
    const t = setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', check)
    }
  }, [check])

  const showPending = () => {
    setList((l) => [...pending, ...l])
    setPending([])
    box.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section ref={box} id="en-vivo" className="mt-10 scroll-mt-28" aria-labelledby="t-live">
      <div className="mb-2 flex items-center gap-2.5 border-b-2 border-eg-ink pb-2.5">
        <LiveBadge />
        <h2 id="t-live" className="m-0 font-serif text-[24px] leading-none font-medium">
          Actualizaciones
        </h2>
        <span className="ml-auto text-xs text-eg-muted" aria-live="polite">
          {list.length} {list.length === 1 ? 'entrada' : 'entradas'}
        </span>
      </div>
      {pending.length > 0 && (
        <div className="sticky top-[72px] z-10 flex justify-center py-2">
          <button onClick={showPending} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-eg-accent px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,.2)]">
            <Icon name="up" size={15} />
            {pending.length === 1 ? '1 actualización nueva' : `${pending.length} actualizaciones nuevas`}
          </button>
        </div>
      )}
      {list.length ? (
        <ol className="m-0 list-none p-0">
          {list.map((u) => (
            <li key={u.id} className={cn('grid grid-cols-[64px_1fr] gap-4 border-b border-eg-rule py-5 max-[480px]:grid-cols-1 max-[480px]:gap-1.5', u.important && 'border-l-[3px] border-l-eg-accent pl-4')}>
              <div className="text-sm">
                <b className="block font-semibold text-eg-accent">{clock(u.at)}</b>
                <span className="text-xs text-eg-muted max-[480px]:hidden">
                  <TimeAgo date={u.at} />
                </span>
              </div>
              <div className="min-w-0">
                {u.important && <span className="mb-1 inline-block rounded bg-eg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-[.08em] text-white uppercase">Destacado</span>}
                {u.title && <h3 className="m-0 mb-1.5 font-serif text-[21px] leading-[1.2] font-medium">{u.title}</h3>}
                <p className="m-0 font-serif text-[length:var(--fs,18px)] leading-[1.6] break-words whitespace-pre-line">{u.body}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-6 text-sm text-eg-muted">La cobertura acaba de empezar. Las actualizaciones aparecerán aquí solas.</p>
      )}
    </section>
  )
}

export const LiveBadge = ({ className }: { className?: string }) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded bg-eg-accent px-2 py-1 text-[11px] leading-none font-bold tracking-[.08em] text-white uppercase', className)}>
    <span className="size-1.5 animate-pulse rounded-full bg-white" />
    En vivo
  </span>
)

/* ---------- Encuestas ---------- */

function voterId() {
  try {
    let v = localStorage.getItem('eg-voter')
    if (!v) localStorage.setItem('eg-voter', (v = crypto.randomUUID()))
    return v
  } catch {
    return crypto.randomUUID()
  }
}

export function Poll({ articleId, block }: { articleId: string; block: { id: string; q: string; opts: string[] } }) {
  const toast = useToast()
  const [res, setRes] = useState<PollResult | null>(null)
  const [busy, setBusy] = useState(false)
  const opts = block.opts.map((o, i) => [o, i] as const).filter(([o]) => o.trim())

  useEffect(() => {
    getPoll({ articleId, blockId: block.id, voter: voterId() }).then((r) => r && r.mine !== null && setRes(r))
  }, [articleId, block.id])

  if (!block.q.trim() || opts.length < 2) return null
  const vote = async (i: number) => {
    setBusy(true)
    const r = await votePoll({ articleId, blockId: block.id, voter: voterId(), option: i }).catch(() => null)
    setBusy(false)
    if (!r) return toast('No se pudo registrar tu voto. Inténtalo de nuevo.')
    setRes(r)
  }
  return (
    <section className="my-8 rounded-lg border border-eg-rule bg-eg-card p-5" aria-label="Encuesta">
      <span className="text-[11px] font-bold tracking-[.1em] text-eg-accent uppercase">Encuesta</span>
      <h3 className="mt-1.5 mb-4 font-serif text-[23px] leading-[1.2] font-medium">{block.q}</h3>
      <div className="grid gap-2" aria-live="polite">
        {opts.map(([o, i]) => {
          if (!res)
            return (
              <button
                key={i}
                disabled={busy}
                onClick={() => vote(i)}
                className="min-h-12 rounded-md border border-eg-rule bg-eg-bg px-4 py-2.5 text-left text-[15px] font-medium transition-colors hover:border-eg-ink disabled:opacity-60"
              >
                {o}
              </button>
            )
          const pct = res.total ? Math.round((res.counts[i] / res.total) * 100) : 0
          const mine = res.mine === i
          return (
            <div key={i} className={cn('relative overflow-hidden rounded-md border px-4 py-2.5 text-[15px]', mine ? 'border-eg-accent' : 'border-eg-rule')}>
              <span className={cn('absolute inset-y-0 left-0 transition-[width] duration-700', mine ? 'bg-eg-accent/16' : 'bg-eg-surface')} style={{ width: pct + '%' }} />
              <span className="relative flex items-center gap-3">
                <span className="min-w-0 flex-1 font-medium">
                  {o}
                  {mine && <span className="ml-2 text-xs text-eg-accent">Tu voto</span>}
                </span>
                <b className="tabular-nums">{pct} %</b>
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 mb-0 text-xs text-eg-muted">
        {res ? `${res.total.toLocaleString('es-DO')} ${res.total === 1 ? 'voto' : 'votos'} · ` : 'Vota para ver los resultados · '}
        Sondeo informal entre lectores, no es una encuesta científica.
      </p>
    </section>
  )
}

/* ---------- Compartir una frase ---------- */

/** Dibuja la frase como imagen 1080×1350 (formato de historias y estados de WhatsApp). */
async function quoteImage(quote: string, title: string, host: string): Promise<Blob | null> {
  const fam = getComputedStyle(document.documentElement).getPropertyValue('--font-newsreader').trim() || 'Georgia, serif'
  await document.fonts.load(`500 64px ${fam}`).catch(() => null)
  const W = 1080,
    H = 1350,
    P = 96
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')!
  x.fillStyle = '#F7F3EC'
  x.fillRect(0, 0, W, H)
  x.fillStyle = '#B3261E'
  x.fillRect(P, P, 120, 10)
  x.fillStyle = '#14181F'
  x.font = `600 56px ${fam}`
  x.fillText('El Global', P, P + 96)

  // Parte un texto en líneas que quepan en el ancho, con la fuente indicada.
  const wrap = (text: string, font: string) => {
    x.font = font
    const lines: string[] = []
    let line = ''
    for (const w of text.split(/\s+/)) {
      const t = line ? line + ' ' + w : w
      if (x.measureText(t).width > W - P * 2 && line) {
        lines.push(line)
        line = w
      } else line = t
    }
    if (line) lines.push(line)
    return lines
  }
  // Se reduce la letra de la frase hasta que quepa.
  let size = 78
  let lines = wrap(`«${quote}»`, `italic 500 ${size}px ${fam}`)
  while (lines.length * size * 1.25 > H - 560 && size > 38) lines = wrap(`«${quote}»`, `italic 500 ${(size -= 4)}px ${fam}`)
  lines.forEach((l, i) => x.fillText(l, P, P + 220 + i * size * 1.25))

  x.fillStyle = '#5B6470'
  wrap(title, `500 34px ${fam}`)
    .slice(0, 2)
    .forEach((l, i) => x.fillText(l, P, H - P - 110 + i * 46))
  x.fillStyle = '#B3261E'
  x.font = `600 30px ${fam}`
  x.fillText(host, P, H - P)
  return new Promise((r) => c.toBlob(r, 'image/png'))
}

/** Al seleccionar texto en la nota aparece una barra para compartir esa frase por WhatsApp o como imagen. */
export function QuoteShare({ container, title }: { container: React.RefObject<HTMLElement | null>; title: string }) {
  const toast = useToast()
  const [sel, setSel] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null)

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const on = () => {
      clearTimeout(t)
      t = setTimeout(() => {
        const s = getSelection()
        const text = s?.toString().replace(/\s+/g, ' ').trim() ?? ''
        if (!s || s.rangeCount === 0 || text.length < 12 || text.length > 400 || !container.current?.contains(s.anchorNode)) return setSel(null)
        const r = s.getRangeAt(0).getBoundingClientRect()
        // En pantallas táctiles el menú del sistema sale arriba: la barra va debajo.
        const below = matchMedia('(pointer: coarse)').matches
        setSel({ text, x: Math.min(Math.max(r.left + r.width / 2, 120), innerWidth - 120), y: below ? r.bottom + 12 : r.top - 12, below })
      }, 180)
    }
    const hide = () => setSel(null)
    document.addEventListener('selectionchange', on)
    addEventListener('scroll', hide, { passive: true })
    return () => {
      clearTimeout(t)
      document.removeEventListener('selectionchange', on)
      removeEventListener('scroll', hide)
    }
  }, [container])

  if (!sel) return null
  const link = location.href.split('#')[0]
  const asImage = async () => {
    const blob = await quoteImage(sel.text, title, location.host)
    if (!blob) return toast('No se pudo crear la imagen')
    const file = new File([blob], 'el-global-cita.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file], text: `${title} ${link}` }).catch(() => {})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    toast('Imagen descargada')
  }
  return (
    <div
      role="toolbar"
      aria-label="Compartir la frase seleccionada"
      className="fixed z-50 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-eg-ink p-1 text-eg-bg shadow-[0_10px_28px_rgba(0,0,0,.3)]"
      style={{ left: sel.x, top: sel.y, transform: `translate(-50%, ${sel.below ? '0' : '-100%'})` }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <a
        href={whatsappUrl(`«${sel.text}»\n\n${title}\n${link}`)}
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold hover:bg-white/10"
      >
        <WhatsAppIcon size={16} /> WhatsApp
      </a>
      <button onClick={asImage} className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold hover:bg-white/10">
        <Icon name="image" size={16} /> Como imagen
      </button>
    </div>
  )
}
