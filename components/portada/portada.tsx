'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArtFrame, ArtImg } from '@/components/eg/art'
import { Chip, Chips } from '@/components/eg/chip'
import { Icon } from '@/components/eg/icon'
import { ToastProvider, useToast } from '@/components/eg/toast'
import { FOR_YOU, LIVE_INITIAL, LIVE_NEXT, OPINION, RANKS, TOPICS, nowHM } from '@/lib/portada-data'
import { cn } from '@/lib/utils'
import { BreakingBar, SearchPalette, SiteHeader } from './site-header'

/* Clases tipográficas del prototipo */
const tag = 'mt-3.5 mb-1.5 block text-xs font-semibold text-eg-accent'
const hover = 'group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4'
const h2 = cn('mb-2 font-serif text-[26px] leading-[1.14] font-medium', hover)
const h3 = cn('mb-1.5 font-serif text-xl leading-[1.2] font-medium', hover)
const lead = 'mb-3 font-serif text-lg leading-normal text-eg-muted'
const meta = 'flex items-center gap-2.5 text-xs text-eg-muted'
const card = 'relative mb-5 border-b border-eg-rule pb-5 last:border-0'
const btn = 'rounded border-0 bg-eg-ink px-4 py-2.5 text-sm font-semibold text-eg-bg hover:opacity-[.88]'
const secH = 'mb-[22px] flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-eg-ink pb-2.5'
const secTitle = 'm-0 font-serif text-[30px] font-medium'

export function Portada() {
  return (
    <ToastProvider className="bottom-[84px]">
      <PortadaInner />
    </ToastProvider>
  )
}

function PortadaInner() {
  const [megaOpen, setMegaOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchBtn = useRef<HTMLButtonElement>(null)

  const openSearch = () => setSearchOpen(true)
  const closeSearch = () => {
    setSearchOpen(false)
    searchBtn.current?.focus()
  }

  // Atajos: / o Ctrl/Cmd+K abren el buscador; Esc cierra buscador y megamenú
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement | null)?.tagName ?? '')
      if (e.key === 'Escape') {
        setSearchOpen((o) => {
          if (o) searchBtn.current?.focus()
          return false
        })
        setMegaOpen(false)
      } else if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        openSearch()
      }
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [])

  return (
    <>
      <BreakingBar />
      <SiteHeader megaOpen={megaOpen} setMegaOpen={setMegaOpen} onSearch={openSearch} searchBtnRef={searchBtn} />
      <main className="mx-auto max-w-[1240px] px-5 pt-7">
        <LiveStrip />
        <Hero />
        <ForYouSection />
        <LiveSection />
        <OpinionSection />
        <Newsletter />
      </main>
      <SiteFooter />
      <BottomNav
        onSections={() => {
          scrollTo({ top: 0 })
          setMegaOpen(!megaOpen)
        }}
        onSearch={openSearch}
      />
      <SearchPalette open={searchOpen} onClose={closeSearch} />
    </>
  )
}

function SaveButton({ title }: { title: string }) {
  const toast = useToast()
  const [on, setOn] = useState(false)
  return (
    <button
      aria-pressed={on}
      aria-label="Guardar nota"
      onClick={() => {
        setOn(!on)
        toast(!on ? 'Guardado: ' + title : 'Quitado de guardados')
      }}
      className="absolute top-2 right-2 z-[2] grid size-[34px] place-items-center rounded-full border-0 bg-eg-bg opacity-[.92] aria-pressed:bg-eg-accent aria-pressed:text-white"
    >
      <Icon name="bookmark" size={16} round={false} />
    </button>
  )
}

function LiveStrip() {
  return (
    <div className="flex items-center gap-3.5 border-b border-eg-rule pb-3.5 text-[13px] text-eg-muted">
      <span className="eg-dot" />
      <b className="text-eg-ink">En directo</b>
      <span>Las noticias más importantes del día, minuto a minuto</span>
      <span className="ml-auto max-[900px]:hidden">Actualizado 14:32 GMT</span>
    </div>
  )
}

function Hero() {
  const [range, setRange] = useState<'hoy' | 'sem'>('hoy')
  const col = 'border-l border-eg-rule px-6 first:border-0 first:pl-0 last:pr-0 max-[900px]:border-0 max-[900px]:px-0 max-[900px]:pb-6'
  return (
    <section className="mt-7 grid grid-cols-[1.6fr_1fr_0.85fr] max-[900px]:grid-cols-1" aria-label="Destacados">
      <article className={cn(card, col, 'border-b-0')}>
        <Link href="/articulo" className="group">
          <ArtFrame
            src="skyline"
            alt="Ilustración: vista nocturna de una ciudad con rascacielos iluminados junto a un río"
            className="aspect-[16/10]"
          >
            <span className="absolute bottom-3.5 left-3.5 z-[1] rounded-[2px] bg-eg-accent px-2.5 py-1 text-[11px] font-semibold text-white">
              Última hora
            </span>
            <span className="absolute right-2.5 bottom-2.5 z-[1] text-[10px] font-medium text-white opacity-80 [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">
              Ilustración
            </span>
          </ArtFrame>
          <span className={tag}>Geopolítica y análisis</span>
          <h1
            className={cn(
              'mb-3.5 font-serif text-[clamp(34px,4.6vw,60px)] leading-[1.04] font-medium tracking-[-.02em]',
              hover,
            )}
          >
            El mundo reordena sus prioridades ante una nueva era de incertidumbre
          </h1>
          <p className={lead}>
            Las grandes potencias abren una etapa de diálogo para afrontar los desafíos que definirán la próxima década.
          </p>
        </Link>
        <div className={meta}>
          Redacción Global <span>8 min de lectura</span>
        </div>
        <SaveButton title="El mundo reordena sus prioridades" />
      </article>

      <div className={col}>
        <article className={card}>
          <Link href="/articulo" className="group">
            <ArtFrame src="ciudades" alt="Ilustración: ciudad con azoteas verdes y un tranvía rojo" className="mb-1.5" />
            <span className={tag}>Mundo</span>
            <h2 className={h2}>Una conversación pendiente: las ciudades que buscan reinventarse</h2>
            <p className={cn(lead, 'text-base')}>Nuevas ideas para vivir mejor en un planeta que cambia a velocidad inédita.</p>
          </Link>
          <div className={meta}>Hace 18 min</div>
        </article>
        <article className={card}>
          <Link href="/articulo" className="group">
            <ArtFrame
              src="trabajo"
              alt="Ilustración: escritorio con laptop, calendario, planta y una taza de café"
              className="mb-1.5"
            />
            <span className={tag}>Sociedad</span>
            <h2 className={h2}>La generación que está cambiando las reglas del trabajo</h2>
          </Link>
          <div className={meta}>Hace 31 min</div>
          <SaveButton title="La generación que cambia las reglas del trabajo" />
        </article>
      </div>

      <aside className={cn(col, 'self-start bg-eg-surface !p-5 max-[900px]:!border-0')} aria-label="Lo más leído">
        <h3 className="mb-1.5 text-sm font-semibold">Lo más leído</h3>
        <Chips className="mt-2.5 mb-1.5" role="group" aria-label="Periodo">
          <Chip pressed={range === 'hoy'} onClick={() => setRange('hoy')}>
            Hoy
          </Chip>
          <Chip pressed={range === 'sem'} onClick={() => setRange('sem')}>
            Esta semana
          </Chip>
        </Chips>
        <div>
          {RANKS[range].map((t, i) => (
            <Link key={t} href="/articulo" className="flex gap-3.5 border-t border-eg-rule py-3">
              <i className="min-w-7 font-serif text-[28px] leading-none text-eg-accent not-italic">{i + 1}</i>
              <span className="font-serif text-[17px] leading-[1.25] font-medium">{t}</span>
            </Link>
          ))}
        </div>
      </aside>
    </section>
  )
}

function ForYouSection() {
  const [on, setOn] = useState<string[]>(['Economía', 'Tecnología'])
  const list = FOR_YOU.filter((f) => on.includes(f.topic))
  return (
    <section className="mt-14" aria-labelledby="t-para-ti">
      <div className={secH}>
        <h2 id="t-para-ti" className={secTitle}>
          Para ti
        </h2>
        <Chips>
          {TOPICS.map((t) => (
            <Chip
              key={t}
              pressed={on.includes(t)}
              onClick={() => setOn(on.includes(t) ? on.filter((x) => x !== t) : [...on, t])}
            >
              {t}
            </Chip>
          ))}
        </Chips>
      </div>
      <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-1">
        {list.length ? (
          list.map((f) => (
            <article key={f.title} className={cn(card, 'border-0')}>
              <Link href="/articulo" className="group">
                <ArtFrame src={f.art} alt={f.alt} />
                <span className={tag}>{f.topic}</span>
                <h3 className={h3}>{f.title}</h3>
              </Link>
              <div className={meta}>{f.time}</div>
              <SaveButton title={f.title.slice(0, 40) + '…'} />
            </article>
          ))
        ) : (
          <p className={lead}>Elige al menos un tema para ver tus notas aquí.</p>
        )}
      </div>
    </section>
  )
}

function LiveSection() {
  const toast = useToast()
  const [items, setItems] = useState(LIVE_INITIAL)
  const n = useRef(0)
  return (
    <section className="mt-14" aria-labelledby="t-live">
      <div className={secH}>
        <h2 id="t-live" className={secTitle}>
          En directo
        </h2>
        <span className={meta}>
          <span className="eg-dot" />
          Se actualiza solo
        </span>
      </div>
      <div className="grid grid-cols-[1fr_1.2fr] gap-10 max-[900px]:grid-cols-1">
        <div>
          <span className={cn(tag, 'mt-0')}>Cumbre global</span>
          <h3 className="mb-2 font-serif text-[26px] leading-[1.14] font-medium">Qué se decide hoy y por qué importa</h3>
          <p className={lead}>Seguimiento de los acuerdos, con la hora de cada actualización.</p>
          <button
            className={btn}
            onClick={() => {
              setItems([{ time: nowHM(), text: LIVE_NEXT[n.current++ % LIVE_NEXT.length] }, ...items])
              toast('Nueva actualización publicada')
            }}
          >
            Simular nueva actualización
          </button>
        </div>
        <Timeline items={items} />
      </div>
    </section>
  )
}

export function Timeline({ items }: { items: { time: string; text: string; topic?: string }[] }) {
  return (
    <ol className="m-0 list-none border-l-2 border-eg-rule p-0 pl-[18px]">
      {items.map((it, i) => (
        <li
          key={it.time + it.text + i}
          className="relative pb-[22px] pl-[18px] before:absolute before:top-1.5 before:-left-[25px] before:size-2.5 before:rounded-full before:border-2 before:border-eg-accent before:bg-eg-bg before:content-[''] first:before:bg-eg-accent"
        >
          <time className="text-xs font-semibold text-eg-accent">{it.time}</time>
          <p className="mt-0.5 font-serif text-[19px] leading-[1.3] font-medium">{it.text}</p>
          {it.topic && <small className="text-xs text-eg-muted">{it.topic}</small>}
        </li>
      ))}
    </ol>
  )
}

function OpinionSection() {
  return (
    <section className="mt-14" aria-labelledby="t-op">
      <div className={secH}>
        <h2 id="t-op" className={secTitle}>
          Opinión
        </h2>
        <a href="#" className={meta}>
          Ver columnistas
        </a>
      </div>
      <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-1">
        {OPINION.map((o) => (
          <article key={o.name} className="rounded-[2px] border border-eg-rule bg-eg-card p-[22px]">
            <div className="mb-3 size-12 overflow-hidden rounded-full bg-eg-surface">
              <ArtImg src={o.art} />
            </div>
            <q className="mb-3 block font-serif text-[21px] leading-[1.3] italic [quotes:none]">{o.quote}</q>
            <b>{o.name}</b>
            <div className={meta}>{o.topic}</div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Newsletter() {
  const toast = useToast()
  return (
    <section
      className="mt-14 flex flex-wrap items-center justify-between gap-8 bg-eg-surface p-9 max-[900px]:p-6"
      aria-labelledby="t-news"
    >
      <div>
        <h2 id="t-news" className="mb-1 font-serif text-[26px] leading-[1.14] font-medium">
          El resumen del día, en tu correo
        </h2>
        <div className={cn(meta, 'text-sm')}>Cinco historias, cada mañana. Sin spam.</div>
      </div>
      <form
        className="flex max-w-[460px] min-w-[260px] flex-1 gap-2 max-[480px]:min-w-0 max-[480px]:flex-col"
        onSubmit={(e) => {
          e.preventDefault()
          toast('Listo: recibirás el resumen mañana')
          e.currentTarget.reset()
        }}
      >
        <label htmlFor="em" className="sr-only">
          Correo electrónico
        </label>
        <input
          id="em"
          type="email"
          placeholder="tu@correo.com"
          required
          className="min-w-0 flex-1 rounded border border-eg-rule bg-eg-bg px-3.5 py-[11px] text-eg-ink"
        />
        <button className={btn}>Recibir resumen</button>
      </form>
    </section>
  )
}

export function SiteFooter() {
  const cols = [
    { t: 'Secciones', l: [['Mundo', '#'], ['Economía', '#'], ['Cultura', '#']] },
    { t: 'Compañía', l: [['Nosotros', '#'], ['Contacto', '#'], ['Redacción', '/redaccion']] },
    { t: 'Legal', l: [['Privacidad', '#'], ['Cookies', '#'], ['Guía de diseño', '/guia']] },
  ]
  return (
    <footer className="mt-16 bg-eg-foot pt-10 pb-[100px] text-[#E8E4DC]">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[2fr_repeat(3,1fr)] gap-6 px-5 text-sm max-[900px]:grid-cols-1">
        <div>
          <div className="font-serif text-[30px] leading-none font-semibold tracking-[-.02em]">El Global</div>
          <p className="max-w-[34ch] opacity-70">Periodismo para entender el mundo.</p>
        </div>
        {cols.map((c) => (
          <div key={c.t}>
            <h4 className="mb-2.5 text-[13px] font-semibold opacity-60">{c.t}</h4>
            {c.l.map(([label, href]) => (
              <Link key={label} href={href} className="block py-[3px] opacity-[.88]">
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </footer>
  )
}

function BottomNav({ onSections, onSearch }: { onSections: () => void; onSearch: () => void }) {
  const item = 'min-h-12 flex-1 border-0 bg-transparent py-2.5 text-center text-[11px] text-eg-muted'
  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed right-0 bottom-0 left-0 z-30 hidden border-t border-eg-rule bg-eg-bg pb-[env(safe-area-inset-bottom,0px)] max-[900px]:flex"
    >
      <Link href="/" className={cn(item, 'text-eg-accent')} aria-current="page">
        <Icon name="house" size={20} strokeWidth={1.8} round={false} className="mx-auto mb-0.5 block" />
        Inicio
      </Link>
      <button className={item} onClick={onSections}>
        <Icon name="menu" size={20} strokeWidth={1.8} round={false} className="mx-auto mb-0.5 block" />
        Secciones
      </button>
      <button className={item} onClick={onSearch}>
        <Icon name="search" size={20} strokeWidth={1.8} round={false} className="mx-auto mb-0.5 block" />
        Buscar
      </button>
      <a href="#" className={item}>
        <Icon name="bookmark" size={20} strokeWidth={1.8} round={false} className="mx-auto mb-0.5 block" />
        Guardados
      </a>
      <a href="#" className={item}>
        <Icon name="user" size={20} strokeWidth={1.8} round={false} className="mx-auto mb-0.5 block" />
        Perfil
      </a>
    </nav>
  )
}
