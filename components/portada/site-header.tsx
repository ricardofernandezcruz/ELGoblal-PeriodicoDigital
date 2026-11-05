'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { search } from '@/app/actions'
import { Icon } from '@/components/eg/icon'
import { toggleTheme } from '@/components/eg/theme'
import { useToast } from '@/components/eg/toast'
import type { Card } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { PushButton } from '@/components/site/pwa'

const iconBtn = 'grid size-10 place-items-center rounded border border-transparent bg-transparent hover:border-eg-rule'

export type MenuItem = { name: string; slug: string }

export function BreakingBar({ text }: { text: string }) {
  const key = 'eg-breaking:' + text
  const [open, setOpen] = useState(true)
  useEffect(() => {
    try {
      if (sessionStorage.getItem(key) === '0') setOpen(false)
    } catch {}
  }, [key])
  if (!open || !text) return null
  return (
    <div className="bg-eg-accent text-sm text-white">
      <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-5 py-2">
        <b className="font-semibold whitespace-nowrap">Última hora</b>
        <span>{text}</span>
        <button
          aria-label="Cerrar aviso"
          className="ml-auto border-0 bg-transparent px-1.5 text-xl leading-none text-white"
          onClick={() => {
            setOpen(false)
            try {
              sessionStorage.setItem(key, '0')
            } catch {}
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

export function SiteHeader({
  menu,
  active,
  megaOpen,
  setMegaOpen,
  onSearch,
  searchBtnRef,
}: {
  menu: MenuItem[]
  active: string
  megaOpen: boolean
  setMegaOpen: (o: boolean) => void
  onSearch: () => void
  searchBtnRef: React.RefObject<HTMLButtonElement | null>
}) {
  const toast = useToast()
  const [small, setSmall] = useState(false)
  const title = useRef<HTMLSpanElement>(null)
  const slogan = useRef<HTMLSpanElement>(null)

  // Header compacto al bajar. Dos umbrales separados (histéresis): al encogerse, la página sube
  // unos 60 px; con un solo umbral eso devolvía el scroll por debajo y el header parpadeaba.
  useEffect(() => {
    const on = () => setSmall((s) => (s ? window.scrollY > 20 : window.scrollY > 140))
    on()
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])

  // Eslogan con el mismo ancho que el título (simétrico)
  useEffect(() => {
    const fit = () => {
      const t = title.current,
        g = slogan.current
      if (!t || !g) return
      g.style.letterSpacing = '0px'
      g.style.marginRight = '0px'
      const T = t.getBoundingClientRect().width,
        N = g.getBoundingClientRect().width,
        fs = parseFloat(getComputedStyle(g).fontSize),
        n = (g.textContent ?? '').length
      if (T > N && fs) {
        const ls = (T - N) / (n - 1) / fs
        g.style.letterSpacing = ls + 'em'
        g.style.marginRight = -ls + 'em'
      }
    }
    fit()
    addEventListener('resize', fit)
    document.fonts?.ready.then(fit)
    return () => removeEventListener('resize', fit)
  }, [])

  const nav = [{ name: 'Portada', slug: '' }, ...menu, { name: 'Video', slug: 'video' }]
  const half = Math.ceil(menu.length / 2)

  return (
    <header className="sticky top-0 z-20 border-b border-eg-rule bg-eg-bg">
      <div className="mx-auto max-w-[1240px] px-5">
        <div className={cn('flex items-center justify-between transition-[height] duration-200', small ? 'h-14' : 'h-[108px] max-[900px]:h-[84px]')}>
          <button
            className="flex h-10 items-center gap-2 border-0 bg-transparent px-2 text-sm font-semibold"
            aria-expanded={megaOpen}
            aria-controls="mega"
            onClick={() => setMegaOpen(!megaOpen)}
          >
            <Icon name="menu" size={20} strokeWidth={1.8} round={false} />
            <span className="max-[900px]:hidden">Menú</span>
          </button>

          <Link
            href="/"
            aria-label="El Global, el mundo en una sola mirada"
            className={cn(
              'inline-flex flex-col items-center leading-none transition-[font-size] duration-200',
              small ? 'text-[28px]' : 'text-[54px] max-[900px]:text-[38px]',
            )}
          >
            <span ref={title} className="font-serif text-[1em] leading-none font-semibold tracking-[-.02em]">
              El Global
            </span>
            <span
              ref={slogan}
              aria-hidden="true"
              className={cn(
                'overflow-hidden font-sans text-[length:max(.17em,8px)] leading-none font-medium whitespace-nowrap text-eg-muted uppercase transition-[opacity,max-height,margin] duration-200',
                small ? 'mt-0 max-h-0 opacity-0' : 'mt-[.7em] max-h-[1.4em]',
              )}
            >
              El mundo en una sola mirada
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button ref={searchBtnRef} className={iconBtn} aria-label="Buscar (atajo /)" onClick={onSearch}>
              <Icon name="search" size={20} strokeWidth={1.8} round={false} />
            </button>
            <PushButton className={cn(iconBtn, 'aria-pressed:text-eg-accent')} />
            <button className={iconBtn} aria-label="Cambiar tema" onClick={() => toast(toggleTheme() === 'dark' ? 'Modo oscuro' : 'Modo claro')}>
              <Icon name="moon" size={20} strokeWidth={1.8} round={false} />
            </button>
            <a
              href="#t-news"
              className="rounded border-0 bg-eg-ink px-4 py-2.5 text-sm font-semibold text-eg-bg hover:opacity-[.88] max-[900px]:hidden"
            >
              Suscribirse
            </a>
          </div>
        </div>

        <nav className="scrollbar-none flex gap-1 overflow-x-auto border-t border-eg-rule" aria-label="Secciones">
          {nav.map((s) => (
            <Link
              key={s.slug}
              href={'/' + s.slug}
              aria-current={s.slug === active ? 'page' : undefined}
              className="border-b-2 border-transparent px-3.5 py-3 text-sm font-medium whitespace-nowrap text-eg-muted hover:text-eg-ink aria-[current=page]:border-eg-accent aria-[current=page]:text-eg-ink"
            >
              {s.name}
            </Link>
          ))}
        </nav>
      </div>

      <div id="mega" className={cn('absolute top-full right-0 left-0 border-b border-eg-rule bg-eg-bg pt-7 pb-9', megaOpen ? 'block' : 'hidden')}>
        <div className="mx-auto grid max-w-[1240px] grid-cols-4 gap-6 px-5 max-[900px]:grid-cols-2">
          {[menu.slice(0, half), menu.slice(half)].map((col, i) => (
            <div key={i}>
              <h4 className="mb-2.5 text-[13px] font-semibold text-eg-muted">{i === 0 ? 'Secciones' : ' '}</h4>
              {col.map((l) => (
                <Link
                  key={l.slug}
                  href={'/' + l.slug}
                  onClick={() => setMegaOpen(false)}
                  className="block py-[5px] font-serif text-xl leading-[1.2] font-medium hover:text-eg-accent"
                >
                  {l.name}
                </Link>
              ))}
            </div>
          ))}
          <div>
            <h4 className="mb-2.5 text-[13px] font-semibold text-eg-muted">El Global</h4>
            {[
              ['Portada', '/'],
              ['Video', '/video'],
              ['Boletín diario', '/#t-news'],
              ['Guardadas', '/guardadas'],
            ].map(([l, h]) => (
              <Link key={h} href={h} onClick={() => setMegaOpen(false)} className="block py-[5px] font-serif text-xl leading-[1.2] font-medium hover:text-eg-accent">
                {l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<Card[] | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (open) {
      setQ('')
      setRes(null)
      input.current?.focus()
    }
  }, [open])
  // Busca 250 ms después de la última tecla
  useEffect(() => {
    if (q.trim().length < 2) return setRes(null)
    let live = true
    const t = setTimeout(() => search(q).then((r) => live && setRes(r)), 250)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [q])
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(10,16,23,.55)] pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[min(620px,92vw)] overflow-hidden rounded-lg bg-eg-bg shadow-[0_20px_50px_rgba(0,0,0,.35)]">
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar notas, secciones o autores"
          aria-label="Buscar notas, secciones o autores"
          autoComplete="off"
          className="w-full border-0 border-b border-eg-rule bg-transparent px-5 py-[18px] font-serif text-xl text-eg-ink outline-0"
        />
        <ul className="m-0 max-h-[50vh] list-none overflow-auto p-2" aria-live="polite">
          {res === null ? (
            <li className="p-3.5 text-sm text-eg-muted">Escribe al menos dos letras.</li>
          ) : res.length ? (
            res.map((c) => (
              <li key={c.id}>
                <Link
                  href={c.href}
                  onClick={onClose}
                  className="flex justify-between gap-3 rounded px-3 py-2.5 font-serif text-[17px] font-medium hover:bg-eg-surface focus:bg-eg-surface"
                >
                  {c.title}
                  <small className="font-sans text-xs whitespace-nowrap text-eg-muted">{c.sec}</small>
                </Link>
              </li>
            ))
          ) : (
            <li className="p-3.5 text-eg-muted">Sin resultados. Prueba con otra palabra o una sección.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
