'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArtImg } from '@/components/eg/art'
import { Icon } from '@/components/eg/icon'
import type { Card } from '@/lib/queries'
import type { Clip } from '@/lib/video'
import { cn } from '@/lib/utils'

/* Historias: lo más importante del día en formato vertical, como en Instagram o WhatsApp.
   Una fila de círculos en la portada; al tocar uno se abre a pantalla completa y avanza solo.
   Anillo de color = no vista; gris = ya vista (se recuerda en este navegador). */

export type Story = { key: string; label: string; title: string; lead?: string; img: string | null; href: string | null; clip?: Clip; live?: boolean }

const SEEN = 'eg-stories-seen'
const DURATION = 7000

export function buildStories(cards: Card[], clips: Clip[]): Story[] {
  const day = Date.now() - 2 * 864e5
  const fresh = cards.filter((c) => c.img && +new Date(c.date) >= day)
  const list = (fresh.length >= 4 ? fresh : cards.filter((c) => c.img)).slice(0, 8)
  const stories: Story[] = list.map((c) => ({ key: c.id, label: c.sec, title: c.title, lead: c.lead, img: c.img, href: c.href, live: c.live }))
  // Hasta 3 clips de video en medio de la fila.
  clips.slice(0, 3).forEach((c, i) =>
    stories.splice(Math.min(2 + i * 3, stories.length), 0, { key: c.key, label: 'Video', title: c.title, img: c.poster, href: c.href, clip: c }),
  )
  return stories
}

function useSeen() {
  const [seen, setSeen] = useState<Set<string>>(new Set())
  useEffect(() => {
    try {
      setSeen(new Set(JSON.parse(localStorage.getItem(SEEN) ?? '[]')))
    } catch {}
  }, [])
  const mark = useCallback((k: string) => {
    setSeen((s) => {
      if (s.has(k)) return s
      const n = new Set(s).add(k)
      try {
        localStorage.setItem(SEEN, JSON.stringify([...n].slice(-200)))
      } catch {}
      return n
    })
  }, [])
  return { seen, mark }
}

export function Stories({ stories }: { stories: Story[] }) {
  const { seen, mark } = useSeen()
  const [open, setOpen] = useState<number | null>(null)
  if (stories.length < 3) return null
  // Las no vistas primero, manteniendo su orden.
  const order = [...stories.filter((s) => !seen.has(s.key)), ...stories.filter((s) => seen.has(s.key))]
  return (
    <>
      <nav aria-label="Historias del día" className="scrollbar-none -mx-5 mt-4 flex gap-4 overflow-x-auto px-5 pb-1">
        {order.map((s, i) => (
          <button key={s.key} onClick={() => setOpen(i)} className="group flex w-[76px] flex-none flex-col items-center gap-1.5 border-0 bg-transparent p-0">
            <span
              className={cn(
                'rounded-full p-[2.5px] transition-transform group-hover:scale-105',
                seen.has(s.key) ? 'bg-eg-rule' : 'bg-[conic-gradient(from_200deg,var(--color-eg-accent),#f59e0b,var(--color-eg-accent))]',
              )}
            >
              <span className="block rounded-full bg-eg-bg p-[2.5px]">
                <span className="relative block size-[64px] overflow-hidden rounded-full bg-eg-surface">
                  {s.img && <ArtImg src={s.img} alt="" />}
                  {s.clip && (
                    <span className="absolute inset-0 grid place-items-center bg-black/25 text-white">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  )}
                </span>
              </span>
            </span>
            <span className={cn('line-clamp-1 w-full text-center text-[11px] leading-tight', s.live ? 'font-bold text-eg-accent' : 'text-eg-ink')}>{s.live ? 'En vivo' : s.label}</span>
          </button>
        ))}
      </nav>
      {open !== null && <Viewer stories={order} start={open} onSeen={mark} onClose={() => setOpen(null)} />}
    </>
  )
}

function Viewer({ stories, start, onSeen, onClose }: { stories: Story[]; start: number; onSeen: (k: string) => void; onClose: () => void }) {
  const [i, setI] = useState(start)
  const [t, setT] = useState(0)
  const [paused, setPaused] = useState(false)
  const touch = useRef<{ x: number; y: number; at: number } | null>(null)
  const s = stories[i]
  const isVideo = !!s.clip
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  const next = useCallback(() => setI((n) => (n + 1 < stories.length ? n + 1 : (onClose(), n))), [stories.length, onClose])
  const prev = useCallback(() => setI((n) => Math.max(0, n - 1)), [])

  useEffect(() => {
    onSeen(s.key)
    setT(0)
  }, [s.key, onSeen])

  // Avance automático (las fotos; los videos avanzan al terminar o al tocar).
  useEffect(() => {
    if (paused || isVideo || reduce) return
    const startAt = Date.now() - t * DURATION
    const id = setInterval(() => {
      const p = (Date.now() - startAt) / DURATION
      if (p >= 1) {
        clearInterval(id)
        next()
      } else setT(p)
    }, 50)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, paused, isVideo, reduce, next])

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === ' ') setPaused((p) => !p)
    }
    addEventListener('keydown', on)
    const o = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      removeEventListener('keydown', on)
      document.body.style.overflow = o
    }
  }, [next, prev, onClose])

  const yt = s.clip?.youtubeId
  return (
    <div role="dialog" aria-modal="true" aria-label="Historias" className="fixed inset-0 z-[60] grid place-items-center bg-black/90">
      <div
        className="relative h-full max-h-[min(100dvh,900px)] w-full max-w-[min(100vw,calc(min(100dvh,900px)*9/16))] overflow-hidden bg-black text-white min-[560px]:rounded-xl"
        onPointerDown={(e) => {
          touch.current = { x: e.clientX, y: e.clientY, at: Date.now() }
          setPaused(true)
        }}
        onPointerUp={(e) => {
          const st = touch.current
          touch.current = null
          setPaused(false)
          if (!st || (e.target as HTMLElement).closest('a,button,iframe,video')) return
          const dx = e.clientX - st.x,
            dy = e.clientY - st.y
          if (dy > 80 && Math.abs(dx) < 60) return onClose()
          if (Math.abs(dx) > 50) return dx < 0 ? next() : prev()
          if (Date.now() - st.at > 350) return // se mantuvo pulsado: solo pausa
          const r = e.currentTarget.getBoundingClientRect()
          if (e.clientX - r.left < r.width * 0.3) prev()
          else next()
        }}
      >
        {/* Fondo: foto o video */}
        {isVideo && s.clip!.fileUrl ? (
          <video key={s.key} src={s.clip!.fileUrl} poster={s.img ?? undefined} autoPlay muted playsInline onEnded={next} className="absolute inset-0 size-full object-cover" />
        ) : isVideo && yt ? (
          <iframe
            key={s.key}
            src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&playsinline=1&rel=0&controls=0`}
            title={s.title}
            allow="autoplay; encrypted-media"
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          s.img && (
            <span key={s.key} className="absolute inset-0 animate-[eg-ken_8s_ease-out_both]">
              <ArtImg src={s.img} alt="" />
            </span>
          )
        )}
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,.55),transparent_22%,transparent_45%,rgba(0,0,0,.9))]" />

        {/* Barras de progreso */}
        <div className="absolute inset-x-3 top-3 flex gap-1">
          {stories.map((x, j) => (
            <span key={x.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              <span className="block h-full bg-white" style={{ width: j < i ? '100%' : j === i ? (isVideo ? '100%' : (reduce ? 100 : t * 100) + '%') : '0%' }} />
            </span>
          ))}
        </div>
        <div className="absolute inset-x-3 top-6 flex items-center gap-2 text-[13px]">
          <b className="font-serif text-[17px]">El Global</b>
          <span className="opacity-80">· {s.live ? 'En vivo' : s.label}</span>
          <span className="flex-1" />
          <button aria-label={paused ? 'Reanudar' : 'Pausar'} onClick={() => setPaused((p) => !p)} className="grid size-10 place-items-center rounded-full hover:bg-white/10">
            {paused ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
              </svg>
            )}
          </button>
          <button aria-label="Cerrar" onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-white/10">
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Texto y enlace */}
        <div className="absolute inset-x-0 bottom-0 p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          {s.live && <span className="mb-2 inline-block rounded bg-eg-accent px-2 py-1 text-[11px] font-bold tracking-[.08em] uppercase">En vivo</span>}
          <h2 className="m-0 font-serif text-[clamp(24px,7vw,32px)] leading-[1.12] font-medium [text-shadow:0_2px_14px_rgba(0,0,0,.5)]">{s.title}</h2>
          {s.lead && !isVideo && <p className="mt-2 mb-0 line-clamp-3 font-serif text-[16px] leading-snug opacity-90">{s.lead}</p>}
          {s.href && (
            <Link href={s.href} onClick={onClose} className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-black">
              {isVideo ? 'Ver el video' : 'Leer la nota'} <Icon name="right" size={15} />
            </Link>
          )}
        </div>
      </div>
      {/* Flechas en escritorio */}
      <button aria-label="Anterior" disabled={i === 0} onClick={prev} className="absolute left-[calc(50%-min(50vw,calc(min(100dvh,900px)*9/32))-64px)] hidden size-12 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-30 min-[760px]:grid">
        <Icon name="left" size={22} />
      </button>
      <button aria-label="Siguiente" onClick={next} className="absolute right-[calc(50%-min(50vw,calc(min(100dvh,900px)*9/32))-64px)] hidden size-12 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 min-[760px]:grid">
        <Icon name="right" size={22} />
      </button>
    </div>
  )
}
