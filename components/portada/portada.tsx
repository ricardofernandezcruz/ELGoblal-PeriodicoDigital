'use client'

import Link from 'next/link'
import { useState } from 'react'
import { subscribe } from '@/app/actions'
import { ArtFrame } from '@/components/eg/art'
import { Chip, Chips } from '@/components/eg/chip'
import { useToast } from '@/components/eg/toast'
import { SiteChrome } from '@/components/site/chrome'
import { TimeAgo } from '@/components/site/time-ago'
import type { Card } from '@/lib/queries'
import { formatTime } from '@/lib/site'
import { cn } from '@/lib/utils'
import type { MenuItem } from './site-header'

/* Clases tipográficas del prototipo */
export const tag = 'mt-3.5 mb-1.5 block text-xs font-semibold text-eg-accent'
const hover = 'group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4'
const h2 = cn('mb-2 font-serif text-[26px] leading-[1.14] font-medium', hover)
export const h3 = cn('mb-1.5 font-serif text-xl leading-[1.2] font-medium', hover)
export const lead = 'mb-3 font-serif text-lg leading-normal text-eg-muted'
export const meta = 'flex flex-wrap items-center gap-x-2.5 text-xs text-eg-muted'
const card = 'relative mb-5 border-b border-eg-rule pb-5 last:border-0'
const btn = 'rounded border-0 bg-eg-ink px-4 py-2.5 text-sm font-semibold text-eg-bg hover:opacity-[.88] disabled:opacity-60'
export const secH = 'mb-[22px] flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-eg-ink pb-2.5'
export const secTitle = 'm-0 font-serif text-[30px] font-medium'

export type FrontPage = {
  breaking: { on: boolean; text: string }
  menu: MenuItem[]
  hero: Card | null
  secondary: Card[]
  mostRead: { hoy: Card[]; sem: Card[] }
  latest: Card[]
  updatedAt: string | null
}

export function Portada({ data }: { data: FrontPage }) {
  return (
    <SiteChrome menu={data.menu} breaking={data.breaking}>
      <main className="mx-auto max-w-[1240px] px-5 pt-7">
        <LiveStrip updatedAt={data.updatedAt} />
        {data.hero ? (
          <>
            <Hero hero={data.hero} secondary={data.secondary} mostRead={data.mostRead} />
            <Latest cards={data.latest} />
            <Opinion cards={data.latest.filter((c) => c.secSlug === 'opinion')} />
          </>
        ) : (
          <div className="py-24 text-center">
            <h1 className="mb-2 font-serif text-[34px] font-medium">Muy pronto, las primeras noticias</h1>
            <p className={cn(lead, 'mx-auto max-w-[46ch]')}>Todavía no hay notas publicadas. La redacción las publica desde el panel.</p>
            <Link href="/redaccion" className={btn}>
              Ir al panel de redacción
            </Link>
          </div>
        )}
        <Newsletter />
      </main>
    </SiteChrome>
  )
}

export function Img({ c, className, children }: { c: Card; className?: string; children?: React.ReactNode }) {
  return c.img ? (
    <ArtFrame src={c.img} alt={c.alt} className={className}>
      {children}
    </ArtFrame>
  ) : (
    <div className={cn('relative aspect-video rounded-[2px] bg-eg-surface', className)}>{children}</div>
  )
}

function LiveStrip({ updatedAt }: { updatedAt: string | null }) {
  return (
    <div className="flex items-center gap-3.5 border-b border-eg-rule pb-3.5 text-[13px] text-eg-muted">
      <span className="eg-dot" />
      <b className="text-eg-ink">Al día</b>
      <span>Las noticias más importantes, a medida que se publican</span>
      {updatedAt && <span className="ml-auto max-[900px]:hidden">Actualizado {formatTime(updatedAt)}</span>}
    </div>
  )
}

function Hero({ hero, secondary, mostRead }: { hero: Card; secondary: Card[]; mostRead: FrontPage['mostRead'] }) {
  const [range, setRange] = useState<'hoy' | 'sem'>(mostRead.hoy.length ? 'hoy' : 'sem')
  const col = 'border-l border-eg-rule px-6 first:border-0 first:pl-0 last:pr-0 max-[900px]:border-0 max-[900px]:px-0 max-[900px]:pb-6'
  return (
    <section className="mt-7 grid grid-cols-[1.6fr_1fr_0.85fr] max-[900px]:grid-cols-1" aria-label="Destacados">
      <article className={cn(card, col, 'border-b-0')}>
        <Link href={hero.href} className="group">
          <Img c={hero} className="aspect-[16/10]" />
          <span className={tag}>{hero.sec}</span>
          <h1 className={cn('mb-3.5 font-serif text-[clamp(34px,4.6vw,60px)] leading-[1.04] font-medium tracking-[-.02em]', hover)}>{hero.title}</h1>
          {hero.lead && <p className={lead}>{hero.lead}</p>}
        </Link>
        <div className={meta}>
          {hero.au && <span>{hero.au}</span>}
          <TimeAgo date={hero.date} />
        </div>
      </article>

      <div className={col}>
        {secondary.map((c) => (
          <article key={c.id} className={card}>
            <Link href={c.href} className="group">
              <Img c={c} className="mb-1.5" />
              <span className={tag}>{c.sec}</span>
              <h2 className={h2}>{c.title}</h2>
              {c.lead && <p className={cn(lead, 'text-base')}>{c.lead}</p>}
            </Link>
            <div className={meta}>
              <TimeAgo date={c.date} />
            </div>
          </article>
        ))}
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
        {mostRead[range].length ? (
          mostRead[range].map((c, i) => (
            <Link key={c.id} href={c.href} className="flex gap-3.5 border-t border-eg-rule py-3">
              <i className="min-w-7 font-serif text-[28px] leading-none text-eg-accent not-italic">{i + 1}</i>
              <span className="font-serif text-[17px] leading-[1.25] font-medium">{c.title}</span>
            </Link>
          ))
        ) : (
          <p className="border-t border-eg-rule pt-3 text-sm text-eg-muted">Aún no hay lecturas en este periodo.</p>
        )}
      </aside>
    </section>
  )
}

export function CardMedium({ c }: { c: Card }) {
  return (
    <article className={cn(card, 'border-0')}>
      <Link href={c.href} className="group">
        <Img c={c} />
        <span className={tag}>{c.sec}</span>
        <h3 className={h3}>{c.title}</h3>
      </Link>
      <div className={meta}>
        <TimeAgo date={c.date} />
      </div>
    </article>
  )
}

function Latest({ cards }: { cards: Card[] }) {
  const secs = [...new Map(cards.map((c) => [c.secSlug, c.sec])).entries()]
  const [off, setOff] = useState<string[]>([])
  if (!cards.length) return null
  const list = cards.filter((c) => !off.includes(c.secSlug)).slice(0, 12)
  return (
    <section className="mt-14" aria-labelledby="t-ultimas">
      <div className={secH}>
        <h2 id="t-ultimas" className={secTitle}>
          Últimas noticias
        </h2>
        {secs.length > 1 && (
          <Chips>
            {secs.map(([slug, name]) => (
              <Chip key={slug} pressed={!off.includes(slug)} onClick={() => setOff(off.includes(slug) ? off.filter((x) => x !== slug) : [...off, slug])}>
                {name}
              </Chip>
            ))}
          </Chips>
        )}
      </div>
      <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-1">
        {list.length ? list.map((c) => <CardMedium key={c.id} c={c} />) : <p className={lead}>Elige al menos una sección para ver las notas aquí.</p>}
      </div>
    </section>
  )
}

function Opinion({ cards }: { cards: Card[] }) {
  if (!cards.length) return null
  return (
    <section className="mt-14" aria-labelledby="t-op">
      <div className={secH}>
        <h2 id="t-op" className={secTitle}>
          Opinión
        </h2>
        <Link href="/opinion" className={meta}>
          Ver todas
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-1">
        {cards.slice(0, 3).map((c) => (
          <Link key={c.id} href={c.href} className="group rounded-[2px] border border-eg-rule bg-eg-card p-[22px]">
            <q className={cn('mb-3 block font-serif text-[21px] leading-[1.3] italic [quotes:none]', hover)}>{c.title}</q>
            {c.au && <b>{c.au}</b>}
            <div className={meta}>
              <TimeAgo date={c.date} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function Newsletter() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <section id="t-news" className="mt-14 flex scroll-mt-24 flex-wrap items-center justify-between gap-8 bg-eg-surface p-9 max-[900px]:p-6" aria-labelledby="t-news-h">
      <div>
        <h2 id="t-news-h" className="mb-1 font-serif text-[26px] leading-[1.14] font-medium">
          El resumen del día, en tu correo
        </h2>
        <div className={cn(meta, 'text-sm')}>Cinco historias, cada mañana. Sin spam.</div>
      </div>
      <form
        noValidate
        className="flex max-w-[460px] min-w-[260px] flex-1 flex-wrap gap-2 max-[480px]:min-w-0 max-[480px]:flex-col"
        onSubmit={async (e) => {
          e.preventDefault()
          const f = e.currentTarget
          setBusy(true)
          const r = await subscribe(String(new FormData(f).get('email') ?? ''))
          setBusy(false)
          if (!r.ok) return setErr(r.error)
          setErr('')
          toast(r.message)
          f.reset()
        }}
      >
        <label htmlFor="em" className="sr-only">
          Correo electrónico
        </label>
        <input
          id="em"
          name="email"
          type="email"
          placeholder="tu@correo.com"
          aria-invalid={!!err}
          aria-describedby="em-err"
          onChange={() => setErr('')}
          className={cn('min-w-0 flex-1 rounded border bg-eg-bg px-3.5 py-[11px] text-eg-ink', err ? 'border-eg-accent' : 'border-eg-rule')}
        />
        <button className={btn} disabled={busy}>
          {busy ? 'Enviando…' : 'Recibir resumen'}
        </button>
        <div id="em-err" role="alert" className="w-full text-[13px] text-eg-accent empty:hidden">
          {err}
        </div>
      </form>
    </section>
  )
}

