'use client'

import Link from 'next/link'
import type { MenuItem } from '@/components/portada/site-header'
import { PeelBook } from '@/components/shadcn-space/animations/peel-book'
import type { ReviewData } from '@/db/schema'
import type { ReviewCard } from '@/lib/queries'
import { ratingText, REVIEW_KINDS, type ReviewKind } from '@/lib/review-shared'
import { cn } from '@/lib/utils'
import { SiteChrome } from './chrome'
import { TimeAgo } from './time-ago'

/* ---------- Estrellas ---------- */

const STAR = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z'

/** Valoración de 0,5 a 5 con medias estrellas. */
export function Stars({ value, size = 18, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`Valoración: ${ratingText(value)}`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i))
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <svg viewBox="0 0 24 24" width={size} height={size} className="absolute inset-0 text-eg-rule" aria-hidden="true">
              <path d={STAR} fill="currentColor" />
            </svg>
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <svg viewBox="0 0 24 24" width={size} height={size} className="text-[#e0a526]" aria-hidden="true">
                <path d={STAR} fill="currentColor" />
              </svg>
            </span>
          </span>
        )
      })}
    </span>
  )
}

/* ---------- Libro en 3D ---------- */

export function Book3D({ review, width = 140, enter, className }: { review: Pick<ReviewData, 'cover' | 'work' | 'author'>; width?: number; enter?: boolean; className?: string }) {
  return (
    <span className={cn('eg-book block', enter && 'eg-book-enter', className)} style={{ '--w': `${width}px` } as React.CSSProperties} aria-hidden="true">
      <span className="eg-book-in block">
        <span className="eg-book-back block" />
        <span className="eg-book-pages block" />
        <span className="eg-book-front block">
          {review.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.cover} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <span className="flex size-full flex-col justify-end gap-1.5 p-[12%]">
              <span className="block h-0.5 w-6 bg-[#b3261e]" />
              <span className="font-serif text-[length:calc(var(--w)*.12)] leading-tight font-semibold text-[#f7f3ec]">{review.work || 'Sin título'}</span>
              <span className="text-[length:calc(var(--w)*.06)] tracking-widest text-white/60 uppercase">{review.author}</span>
            </span>
          )}
        </span>
      </span>
    </span>
  )
}

/* ---------- Cabecera de una reseña (en la nota) ---------- */

/** Ficha del libro: arriba el libro centrado, que se puede abrir; abajo, la valoración y los datos. */
export function ReviewHero({ review }: { review: ReviewData }) {
  const rows = [
    ['Autor', review.author],
    ['Editorial', review.publisher],
    ['Año', review.year],
    ['Páginas', review.pages],
    ['ISBN', review.isbn],
  ].filter(([, v]) => v)
  return (
    <section aria-label="Ficha del libro" className="mt-7 mb-9 overflow-hidden rounded-lg border border-eg-rule bg-eg-surface">
      <div className="grid justify-items-center bg-[radial-gradient(60%_80%_at_50%_45%,color-mix(in_srgb,var(--color-eg-accent)_10%,transparent),transparent)] px-4 pt-7 pb-4">
        <PeelBook
          book={{ work: review.work, author: review.author, cover: review.cover, quote: review.quote, footer: <Stars value={review.rating} size={13} /> }}
          sizeClass="[--s:.68] min-[420px]:[--s:.8] sm:[--s:.92]"
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(180px,220px)] gap-x-8 gap-y-5 border-t border-eg-rule bg-eg-card p-6 max-[640px]:grid-cols-1 max-[640px]:p-5">
        <div className="min-w-0">
          <span className="font-sans text-[11px] font-bold tracking-[.14em] text-eg-accent uppercase">Reseña · {REVIEW_KINDS[review.kind].one}</span>
          <h2 className="mt-1.5 mb-1 font-serif text-[clamp(24px,3vw,30px)] leading-[1.1] font-medium">{review.work}</h2>
          {review.author && <p className="m-0 font-sans text-sm text-eg-muted">de {review.author}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stars value={review.rating} size={22} />
            <b className="font-sans text-sm">{ratingText(review.rating)}</b>
          </div>
          {review.verdict && <p className="mt-4 mb-0 border-l-[3px] border-eg-accent pl-4 font-serif text-[19px] leading-snug italic">{review.verdict}</p>}
        </div>
        {(rows.length > 0 || review.buyUrl) && (
          <div className="min-w-0 border-l border-eg-rule pl-6 font-sans max-[640px]:border-t max-[640px]:border-l-0 max-[640px]:pt-5 max-[640px]:pl-0">
            {rows.length > 0 && (
              <dl className="m-0 grid gap-2.5 text-[13px]">
                {rows.map(([k, v]) => (
                  <div key={k as string}>
                    <dt className="text-[11px] font-semibold tracking-[.08em] text-eg-muted uppercase">{k}</dt>
                    <dd className="m-0 leading-snug break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {review.buyUrl && (
              <a href={review.buyUrl} target="_blank" rel="nofollow noopener" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-eg-rule bg-eg-bg px-4 text-sm font-semibold no-underline hover:border-eg-ink">
                Dónde conseguirlo ↗
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/* ---------- Portada de Reseñas ---------- */

function ReviewItem({ r }: { r: ReviewCard }) {
  return (
    <article className="group grid grid-cols-[auto_1fr] gap-5 border-b border-eg-rule pb-6">
      <Link href={r.href} tabIndex={-1} aria-hidden="true" className="pt-1 pl-1">
        <Book3D review={r.review} width={96} />
      </Link>
      <div className="min-w-0">
        <Stars value={r.review.rating} size={15} />
        <p className="mt-1.5 mb-0 font-sans text-[13px] text-eg-muted">
          <b className="text-eg-ink">{r.review.work}</b>
          {r.review.author && <> · {r.review.author}</>}
        </p>
        <Link href={r.href} className="hover:underline hover:underline-offset-4">
          <h3 className="mt-1.5 mb-1.5 font-serif text-[21px] leading-[1.15] font-medium">{r.title}</h3>
        </Link>
        {r.review.verdict && <p className="m-0 line-clamp-3 font-serif text-[16px] leading-normal text-eg-muted italic">{r.review.verdict}</p>}
        <p className="mt-2 mb-0 font-sans text-xs text-eg-muted">
          {r.au && <>{r.au} · </>}
          <TimeAgo date={r.date} />
        </p>
      </div>
    </article>
  )
}

export function ReviewsHub({ reviews, kind, menu }: { reviews: ReviewCard[]; kind?: ReviewKind; menu: MenuItem[] }) {
  const [top, ...rest] = reviews
  const tabs: [string, string, boolean][] = [['Todas', '/resenas', !kind], ...Object.entries(REVIEW_KINDS).map(([k, v]) => [v.label, `/resenas/${v.path}`, kind === k] as [string, string, boolean])]
  return (
    <SiteChrome menu={menu} active="resenas">
      <main className="mx-auto max-w-[1240px] px-5 pt-9">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-eg-ink pb-4">
          <div>
            <h1 className="m-0 font-serif text-[clamp(40px,6vw,64px)] leading-none font-medium tracking-[-.02em]">
              Reseñas{kind && <span className="text-eg-muted"> · {REVIEW_KINDS[kind].label}</span>}
            </h1>
            <p className="mt-2 mb-0 max-w-[60ch] font-serif text-[18px] text-eg-muted">Los libros que vale la pena leer, y los que no, contados por nuestra redacción.</p>
          </div>
          <nav aria-label="Tipos de reseña" className="flex gap-2">
            {tabs.map(([l, h, on]) => (
              <Link
                key={h}
                href={h}
                aria-current={on ? 'page' : undefined}
                className="inline-flex min-h-9 items-center rounded-full border border-eg-rule px-4 text-sm font-medium hover:border-eg-ink aria-[current=page]:border-eg-ink aria-[current=page]:bg-eg-ink aria-[current=page]:text-eg-bg"
              >
                {l}
              </Link>
            ))}
          </nav>
        </header>

        {!top ? (
          <div className="grid justify-items-center gap-6 py-16 text-center">
            <Book3D review={{ cover: '', work: 'Muy pronto', author: 'El Global' }} width={150} enter />
            <div>
              <h2 className="m-0 font-serif text-[28px] font-medium">La estantería está por llenarse</h2>
              <p className="mt-2 text-eg-muted">Muy pronto publicaremos aquí nuestras primeras reseñas de libros.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Reseña destacada: el libro se abre arrastrando la esquina */}
            <section aria-label="Reseña destacada" className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-12 overflow-hidden rounded-xl bg-eg-surface p-8 max-[1023px]:grid-cols-1 max-[1023px]:justify-items-center max-[1023px]:gap-6 max-[640px]:px-4 max-[640px]:pt-6">
              <PeelBook
                book={{ work: top.review.work, author: top.review.author, cover: top.review.cover, quote: top.review.quote, footer: <Stars value={top.review.rating} size={13} /> }}
                sizeClass="[--s:.68] min-[420px]:[--s:.8] sm:[--s:.92] lg:[--s:1]"
              />
              <div className="w-full max-w-[560px] min-w-0">
                <span className="text-[11px] font-bold tracking-[.14em] text-eg-accent uppercase">Reseña destacada · {REVIEW_KINDS[top.review.kind].one}</span>
                <Link href={top.href} className="hover:underline hover:underline-offset-4">
                  <h2 className="mt-2 mb-2 font-serif text-[clamp(28px,3.4vw,42px)] leading-[1.08] font-medium tracking-[-.01em]">{top.title}</h2>
                </Link>
                <p className="m-0 font-sans text-sm text-eg-muted">
                  <b className="text-eg-ink">{top.review.work}</b>
                  {top.review.author && <> · {top.review.author}</>}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Stars value={top.review.rating} size={22} />
                  <b className="font-sans text-sm">{ratingText(top.review.rating)}</b>
                </div>
                {top.review.verdict && <p className="mt-4 mb-0 max-w-[52ch] border-l-[3px] border-eg-accent pl-4 font-serif text-[20px] leading-snug italic">{top.review.verdict}</p>}
                <Link href={top.href} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-eg-ink px-5 font-sans text-sm font-semibold text-eg-bg hover:opacity-90">
                  Leer la reseña
                </Link>
              </div>
            </section>

            {/* Estantería con todas las portadas */}
            <section aria-label="Estantería" className="mt-12">
              <h2 className="mb-1 text-xs font-semibold tracking-[.1em] text-eg-muted uppercase">En la estantería</h2>
              <div className="scrollbar-none -mx-5 flex snap-x gap-7 overflow-x-auto px-7 pt-6 pb-0">
                {reviews.map((r, i) => (
                  <Link key={r.id} href={r.href} className="group snap-start" style={{ '--d': `${Math.min(i, 10) * 90}ms` } as React.CSSProperties} aria-label={`${r.review.work}: ${r.title}`}>
                    <Book3D review={r.review} width={112} enter />
                  </Link>
                ))}
              </div>
              <div className="-mx-1 h-3 rounded-sm bg-linear-to-b from-[#8b6a4a] to-[#5e452f] shadow-[0_10px_18px_-8px_rgba(0,0,0,.5)]" aria-hidden="true" />
            </section>

            {rest.length > 0 && (
              <section aria-label="Todas las reseñas" className="mt-12">
                <h2 className="mb-6 border-b-2 border-eg-ink pb-2.5 font-serif text-[28px] font-medium">Más reseñas</h2>
                <div className="grid grid-cols-2 gap-x-10 gap-y-6 max-[900px]:grid-cols-1">
                  {rest.map((r) => (
                    <ReviewItem key={r.id} r={r} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </SiteChrome>
  )
}
