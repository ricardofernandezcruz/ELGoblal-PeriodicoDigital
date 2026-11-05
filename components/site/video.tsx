'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { registerVideoView } from '@/app/actions'
import { Icon } from '@/components/eg/icon'
import { useToast } from '@/components/eg/toast'
import type { MenuItem } from '@/components/portada/site-header'
import { Marquee } from '@/components/shadcn-space/animations/marquee'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { ChannelFeed, Clip } from '@/lib/video'
import { cn } from '@/lib/utils'
import { SiteChrome } from './chrome'
import { TimeAgo } from './time-ago'

export type VideoHubData = {
  featured: Clip | null
  latest: Clip[]
  own: Clip[]
  sections: { label: string; slug: string | null; items: Clip[] }[]
  channels: ChannelFeed[]
}

const views = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' mil' : String(n))

function Meta({ clip, className }: { clip: Clip; className?: string }) {
  return (
    <span className={cn('block text-xs text-eg-muted', className)}>
      {clip.by && <>{clip.by} · </>}
      <TimeAgo date={clip.published} />
      {clip.views > 0 && ` · ${views(clip.views)} ${clip.kind === 'newsroom' ? 'reproducciones' : 'vistas'}`}
    </span>
  )
}

/** «Nuevo» si salió hace menos de 48 h. Se calcula en el navegador para no desincronizar el HTML. */
function Fresh({ date, className }: { date: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => setNow(Date.now()), [])
  if (now === null || now - +new Date(date) > 48 * 36e5) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-eg-accent px-2 py-0.5 text-[11px] font-semibold tracking-[.04em] text-white uppercase', className)}>
      <span className="size-1.5 animate-pulse rounded-full bg-white" />
      Nuevo
    </span>
  )
}

/** Botón de reproducir (shadcnspace aspect-ratio-04): círculo claro que crece al pasar el ratón. */
const PlayButton = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => (
  <span
    className={cn(
      'grid place-items-center rounded-full bg-white/92 text-black shadow-[0_6px_20px_rgba(0,0,0,.35)] transition-transform duration-200 group-hover:scale-110',
      size === 'lg' ? 'size-[72px] max-[640px]:size-14' : size === 'md' ? 'size-12' : 'size-9',
    )}
  >
    <svg width={size === 'lg' ? 28 : size === 'md' ? 20 : 14} height={size === 'lg' ? 28 : size === 'md' ? 20 : 14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="ml-[8%]">
      <path d="M8 5v14l11-7z" />
    </svg>
  </span>
)

/* ---------- Reproductor ---------- */

/** Archivo propio con <video>, o YouTube sin cookies. Los dos muestran primero su portada y solo
    cargan el video al pulsar reproducir (la página no descarga nada que el lector no pidió). */
export function Player({ clip, autoplay, className }: { clip: Clip; autoplay?: boolean; className?: string }) {
  const [on, setOn] = useState(!!autoplay)
  const counted = useRef(false)
  useEffect(() => setOn(!!autoplay), [clip.key, autoplay])
  const count = () => {
    if (clip.kind !== 'newsroom' || counted.current) return
    counted.current = true
    try {
      const k = 'eg-vid:' + clip.key
      if (sessionStorage.getItem(k)) return
      sessionStorage.setItem(k, '1')
    } catch {}
    registerVideoView(clip.key)
  }
  const box = cn('relative w-full overflow-hidden rounded-xl bg-black', clip.vertical ? 'mx-auto aspect-[9/16] max-h-[80vh]' : 'aspect-video', className)

  if (on && clip.fileUrl)
    return (
      <div className={box}>
        <video
          key={clip.key}
          src={clip.fileUrl}
          poster={clip.poster ?? undefined}
          controls
          playsInline
          autoPlay
          onPlay={count}
          className="absolute inset-0 size-full bg-black object-contain"
        />
      </div>
    )
  if (on && clip.youtubeId)
    return (
      <div className={box}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${clip.youtubeId}?autoplay=1&rel=0&playsinline=1`}
          title={clip.title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={count}
          className="absolute inset-0 size-full border-0"
        />
      </div>
    )
  return (
    <button type="button" onClick={() => setOn(true)} className={cn(box, 'group block border-0 p-0')} aria-label={'Reproducir: ' + clip.title}>
      {clip.poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={clip.poster} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      )}
      <span className="absolute inset-0 bg-black/15 transition-colors group-hover:bg-black/30" />
      <span className="absolute inset-0 grid place-items-center">
        <PlayButton size="lg" />
      </span>
    </button>
  )
}

/* ---------- Escenario: el video principal, con el titular sobre la imagen ---------- */

function Stage({ clip, autoplay, kicker }: { clip: Clip; autoplay?: boolean; kicker?: string }) {
  const [on, setOn] = useState(!!autoplay)
  useEffect(() => setOn(!!autoplay), [clip.key, autoplay])
  const title = (cls: string) =>
    clip.href ? (
      <Link href={clip.href} className="hover:underline hover:underline-offset-4">
        <h2 className={cls}>{clip.title}</h2>
      </Link>
    ) : (
      <h2 className={cls}>{clip.title}</h2>
    )

  return (
    <div className="min-w-0">
      {on ? (
        <Player clip={clip} autoplay />
      ) : (
        <button
          type="button"
          onClick={() => setOn(true)}
          aria-label={'Reproducir: ' + clip.title}
          className="group relative block aspect-video w-full overflow-hidden rounded-xl border-0 bg-black p-0 text-left"
        >
          {clip.poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clip.poster} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          )}
          <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.88),rgba(0,0,0,.35)_45%,rgba(0,0,0,0)_75%)] transition-opacity group-hover:opacity-90" />
          <span className="absolute inset-0 grid place-items-center min-[640px]:place-items-start min-[640px]:p-6">
            <PlayButton size="lg" />
          </span>
          <span className="absolute inset-x-0 bottom-0 grid gap-2 p-6 text-white max-[640px]:hidden">
            <span className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-eg-accent px-2.5 py-1 text-[11px] font-semibold tracking-[.08em] uppercase">{kicker ?? clip.label}</span>
              <Fresh date={clip.published} className="bg-white/18 backdrop-blur-sm" />
            </span>
            <span className="line-clamp-3 max-w-[30ch] font-serif text-[clamp(26px,3vw,40px)] leading-[1.06] font-medium tracking-[-.01em] [text-shadow:0_2px_16px_rgba(0,0,0,.4)]">
              {clip.title}
            </span>
            <span className="text-xs text-white/75">
              {clip.by && <>{clip.by} · </>}
              <TimeAgo date={clip.published} />
            </span>
          </span>
        </button>
      )}
      {/* Debajo de la imagen: siempre en el teléfono, y en escritorio cuando ya se está reproduciendo. */}
      <div className={cn('mt-4', !on && 'min-[640px]:hidden')}>
        <span className="mb-2 flex flex-wrap items-center gap-2">
          <Badge className="rounded-full">{kicker ?? clip.label}</Badge>
          <Fresh date={clip.published} />
        </span>
        {title('m-0 font-serif text-[clamp(24px,3vw,34px)] leading-[1.1] font-medium tracking-[-.01em]')}
        {clip.description && <p className="mt-2 mb-0 line-clamp-3 max-w-[68ch] font-serif text-[17px] leading-normal text-eg-muted">{clip.description}</p>}
        <Meta clip={clip} className="mt-2" />
      </div>
    </div>
  )
}

/* ---------- Tarjetas ---------- */

function Poster({ clip, className }: { clip: Clip; className?: string }) {
  return (
    <span className={cn('relative block overflow-hidden rounded-lg bg-eg-surface', clip.vertical ? 'aspect-[9/16]' : 'aspect-video', className)}>
      {clip.poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={clip.poster} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
      )}
      <span className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/25" />
      <span className="absolute bottom-2 left-2">
        <PlayButton size="sm" />
      </span>
    </span>
  )
}

/** Tarjeta de video: abre su página si es de la redacción, o lo reproduce donde se indique. */
export function ClipCard({ clip, onPick, row, className }: { clip: Clip; onPick?: (c: Clip) => void; row?: boolean; className?: string }) {
  const body = (
    <>
      <Poster clip={clip} className={row ? 'w-36 flex-none max-[400px]:w-28' : undefined} />
      <span className={cn('block min-w-0', !row && 'mt-2.5')}>
        <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px]">
            {clip.label}
          </Badge>
          <Fresh date={clip.published} className="py-px text-[10px]" />
        </span>
        <span className={cn('block font-serif leading-[1.2] font-medium group-hover:underline group-hover:underline-offset-4', row ? 'line-clamp-2 text-[15px]' : 'line-clamp-3 text-[17px]')}>
          {clip.title}
        </span>
        <Meta clip={clip} className="mt-1" />
      </span>
    </>
  )
  const cls = cn('group block w-full text-left text-inherit', row && 'flex items-start gap-3', className)
  if (onPick)
    return (
      <button type="button" onClick={() => onPick(clip)} className={cn(cls, 'border-0 bg-transparent p-0')}>
        {body}
      </button>
    )
  return clip.href ? (
    <Link href={clip.href} className={cls}>
      {body}
    </Link>
  ) : (
    <a href={`https://www.youtube.com/watch?v=${clip.youtubeId}`} target="_blank" rel="noopener" className={cls}>
      {body}
    </a>
  )
}

/** Encabezado de bloque: titular con filete grueso, al estilo de las secciones del periódico. */
function Head({ id, title, note, href, children }: { id?: string; title: string; note?: string; href?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-2 border-eg-ink pb-2.5">
      <div className="min-w-0">
        <h2 id={id} className="m-0 font-serif text-[clamp(24px,3vw,30px)] leading-none font-medium">
          {title}
        </h2>
        {note && <p className="mt-1.5 mb-0 text-sm text-eg-muted">{note}</p>}
      </div>
      <div className="flex items-center gap-3">
        {href && (
          <Link href={href} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold hover:underline hover:underline-offset-4">
            Ver todo <Icon name="right" size={14} />
          </Link>
        )}
        {children}
      </div>
    </div>
  )
}

/** Fila deslizable (con flechas en escritorio, con el dedo en el teléfono). */
function Row({
  title,
  href,
  clips,
  onPick,
  vertical,
  className,
}: {
  title: string
  href?: string
  clips: Clip[]
  onPick?: (c: Clip) => void
  vertical?: boolean
  className?: string
}) {
  if (!clips.length) return null
  return (
    <section className={cn('mt-12', className)}>
      <Carousel opts={{ align: 'start', dragFree: true }}>
        <Head title={title} href={href}>
          <div className="flex gap-1.5 max-[640px]:hidden">
            <CarouselPrevious className="static my-0 translate-y-0" />
            <CarouselNext className="static my-0 translate-y-0" />
          </div>
        </Head>
        <CarouselContent className="-ml-4">
          {clips.map((c) => (
            <CarouselItem key={c.key} className={cn('pl-4', vertical ? 'basis-[42%] sm:basis-1/4 lg:basis-1/6' : 'basis-[80%] sm:basis-1/2 lg:basis-1/4')}>
              <ClipCard clip={c} onPick={onPick} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  )
}

/** Lo más visto de la redacción, con números grandes. */
function Ranking({ clips }: { clips: Clip[] }) {
  return (
    <ol className="m-0 grid list-none gap-0 p-0">
      {clips.map((c, i) => (
        <li key={c.key} className="border-b border-eg-rule last:border-0">
          <Link href={c.href ?? '/video'} className="group flex items-center gap-4 py-3">
            <span className="w-8 flex-none text-center font-serif text-[40px] leading-none font-medium text-eg-accent tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 font-serif text-[16px] leading-[1.2] font-medium group-hover:underline group-hover:underline-offset-4">{c.title}</span>
              <span className="mt-1 block text-xs text-eg-muted">{views(c.views)} reproducciones</span>
            </span>
            <Poster clip={{ ...c, vertical: false }} className="w-24 flex-none max-[400px]:w-20" />
          </Link>
        </li>
      ))}
    </ol>
  )
}

/* ---------- Clips verticales en movimiento (shadcnspace marquee-04) ---------- */

function ShortsReel({ clips }: { clips: Clip[] }) {
  const [open, setOpen] = useState<Clip | null>(null)
  if (clips.length < 3) return null
  return (
    <section className="mt-12" aria-labelledby="t-clips">
      <Head id="t-clips" title="Clips" note="Lo más corto de nuestros redactores. Toca uno para verlo." />
      <div className="relative -mx-5 [mask-image:linear-gradient(to_right,transparent,#000_5%,#000_95%,transparent)] max-[640px]:[mask-image:none]">
        <Marquee pauseOnHover className="px-5 py-1 [--duration:60s] [--gap:.875rem]">
          {clips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setOpen(c)}
              aria-label={'Ver clip: ' + c.title}
              className="group relative aspect-[9/16] w-[160px] flex-none overflow-hidden rounded-xl border-0 bg-black p-0 text-left shadow-[0_8px_24px_rgba(0,0,0,.12)] sm:w-[190px]"
            >
              {c.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.poster} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
              )}
              <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.85),rgba(0,0,0,0)_55%)]" />
              <span className="absolute top-2.5 left-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold tracking-[.06em] text-white uppercase backdrop-blur-sm">
                {c.label}
              </span>
              <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <PlayButton size="md" />
              </span>
              <span className="absolute inset-x-0 bottom-0 p-3 text-white">
                <span className="line-clamp-3 font-serif text-[15px] leading-[1.2] font-medium">{c.title}</span>
              </span>
            </button>
          ))}
        </Marquee>
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="w-[min(380px,calc(100vw-2rem))] gap-3 bg-eg-bg p-3 text-eg-ink sm:max-w-[380px]">
          {open && (
            <>
              <DialogTitle className="pr-8 font-serif text-base leading-tight font-medium">{open.title}</DialogTitle>
              <Player clip={open} autoplay className="max-h-[72vh]" />
              <Meta clip={open} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

/* ---------- Franja de video en la portada ---------- */

export function VideoBand({ hub }: { hub: VideoHubData }) {
  const [cur, setCur] = useState<Clip | null>(null)
  if (!hub.featured) return null
  const featured = cur ?? hub.featured
  const list = [hub.featured, ...hub.latest].filter((c) => c.key !== featured.key).slice(0, 4)

  return (
    <section className="mt-14 border-y border-eg-rule bg-eg-surface" aria-labelledby="t-video">
      <div className="mx-auto max-w-[1240px] px-5 py-9 max-[640px]:py-7">
        <div className="mb-6 flex items-end justify-between gap-3 border-b-2 border-eg-ink pb-2.5">
          <h2 id="t-video" className="m-0 flex items-center gap-2.5 font-serif text-[30px] leading-none font-medium">
            <span className="grid size-7 place-items-center rounded-full bg-eg-accent text-white" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="ml-px">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <Link href="/video" className="hover:underline hover:underline-offset-4">
              Video
            </Link>
          </h2>
          <Link href="/video" className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold hover:underline hover:underline-offset-4">
            Ver todo <Icon name="right" size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-[1.7fr_1fr] gap-8 max-[900px]:grid-cols-1 max-[900px]:gap-6">
          <Stage key={featured.key} clip={featured} autoplay={!!cur} />
          <div className="min-w-0">
            <h3 className="mb-3 text-xs font-semibold tracking-[.08em] text-eg-muted uppercase">Lo último</h3>
            {/* Escritorio: lista vertical. Teléfono: carrusel horizontal. */}
            <div className="grid gap-4 max-[900px]:hidden">
              {list.map((c) => (
                <ClipCard key={c.key} clip={c} row onPick={setCur} />
              ))}
            </div>
            <Carousel opts={{ align: 'start', dragFree: true }} className="hidden max-[900px]:block">
              <CarouselContent className="-ml-3">
                {list.map((c) => (
                  <CarouselItem key={c.key} className="basis-[72%] pl-3 sm:basis-[45%]">
                    <ClipCard clip={c} onPick={setCur} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Canales de redactores ---------- */

/** Foto del redactor con anillo de color, como las historias de las redes (shadcnspace avatar-12). */
function RingAvatar({ ch, size = 'md' }: { ch: ChannelFeed; size?: 'md' | 'lg' }) {
  return (
    <span className="flex-none rounded-full bg-[conic-gradient(from_210deg,var(--color-eg-accent),#f59e0b,var(--color-eg-accent))] p-[2.5px]">
      <span className="block rounded-full bg-eg-bg p-[2px]">
        <Avatar className={size === 'lg' ? 'size-16' : 'size-11'}>
          {ch.byImage && <AvatarImage src={ch.byImage} alt="" />}
          <AvatarFallback className={size === 'lg' ? 'text-xl' : undefined}>{ch.label.slice(0, 1)}</AvatarFallback>
        </Avatar>
      </span>
    </span>
  )
}

function ChannelCard({ ch }: { ch: ChannelFeed }) {
  const [cur, setCur] = useState<Clip | null>(null)
  const first = ch.latest[0] ?? ch.lives[0]
  if (!first) return null
  const main = cur ?? first
  const more = ch.latest.filter((c) => c.key !== main.key).slice(0, 3)
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="relative isolate flex flex-row items-center gap-3 overflow-hidden border-b border-eg-rule py-4">
        {/* Fondo: la portada del último video, desenfocada y fundida con la tarjeta. */}
        {first.poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={first.poster} alt="" className="absolute inset-0 -z-10 size-full scale-125 object-cover opacity-35 blur-2xl" />
        )}
        <span className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--color-card),transparent)]" />
        <RingAvatar ch={ch} />
        <div className="min-w-0 flex-1">
          <CardTitle className="line-clamp-2 font-serif text-[20px] leading-tight font-medium">{ch.name}</CardTitle>
          <CardDescription className="flex items-center gap-2 truncate">
            <span className="font-semibold text-eg-accent">{ch.label}</span>
            {ch.by && <span className="truncate">con {ch.by}</span>}
          </CardDescription>
        </div>
        <Fresh date={first.published} />
      </CardHeader>
      <CardContent className="py-4">
        <Player key={main.key} clip={main} autoplay={!!cur} />
        <p className="mt-2.5 mb-0 line-clamp-2 font-serif text-[18px] leading-[1.25] font-medium">{main.title}</p>
        <Meta clip={main} className="mt-1" />
        {more.length > 0 && (
          <div className="mt-4 grid gap-3 border-t border-eg-rule pt-4">
            {more.map((c) => (
              <ClipCard key={c.key} clip={c} row onPick={setCur} />
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-x-4 gap-y-1 border-t border-eg-rule py-2.5">
        <Link href={`/video/canal/${ch.slug}`} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold hover:underline hover:underline-offset-4">
          Ver el canal <Icon name="right" size={14} />
        </Link>
        {ch.spotifyShowId && (
          <a href={`https://open.spotify.com/show/${ch.spotifyShowId}`} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center text-sm text-eg-muted hover:text-eg-ink">
            Escuchar en Spotify
          </a>
        )}
        <a href={ch.url} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center text-sm text-eg-muted hover:text-eg-ink">
          YouTube
        </a>
      </CardFooter>
    </Card>
  )
}

/* ---------- Página /video ---------- */

/** Intercala los clips de cada canal para que ninguno acapare la fila. */
const interleave = (lists: Clip[][]) => {
  const out: Clip[] = []
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) for (const l of lists) if (l[i]) out.push(l[i])
  return out
}

export function VideoHub({ hub, menu }: { hub: VideoHubData; menu: MenuItem[] }) {
  const top = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState<Clip | null>(null)
  const featured = cur ?? hub.featured
  const side = [...(hub.featured ? [hub.featured] : []), ...hub.latest].filter((c) => c.key !== featured?.key).slice(0, 4)
  const pick = (c: Clip) => {
    setCur(c)
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const channels = hub.channels.filter((c) => c.latest.length || c.lives.length)
  const shorts = interleave([hub.own.filter((c) => c.vertical), ...hub.channels.map((c) => c.shorts.slice(0, 8))]).slice(0, 18)
  const popular = [...hub.own].filter((c) => c.views > 0).sort((a, b) => b.views - a.views).slice(0, 5)

  return (
    <SiteChrome menu={menu} active="video">
      <main className="mx-auto max-w-[1240px] px-5 pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-eg-ink pb-3">
          <div>
            <h1 className="m-0 flex items-center gap-3 font-serif text-[clamp(38px,5vw,60px)] leading-none font-medium tracking-[-.02em]">
              <span className="grid size-[.8em] place-items-center rounded-full bg-eg-accent text-white" aria-hidden="true">
                <svg width="40%" height="40%" viewBox="0 0 24 24" fill="currentColor" className="ml-[6%]">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              Video
            </h1>
            <p className="mt-2 mb-0 text-sm text-eg-muted">Las noticias en video de la redacción y los programas de nuestros redactores.</p>
          </div>
          <nav className="scrollbar-none flex max-w-full gap-2 overflow-x-auto" aria-label="Ir a">
            {hub.sections.map((s) => (
              <a key={s.label} href={'#cat-' + (s.slug ?? 'video')} className="flex-none">
                <Badge variant="outline" className="h-8 rounded-full px-3 text-[13px] hover:bg-eg-surface">
                  {s.label}
                </Badge>
              </a>
            ))}
            {shorts.length >= 3 && (
              <a href="#t-clips" className="flex-none">
                <Badge variant="outline" className="h-8 rounded-full px-3 text-[13px] hover:bg-eg-surface">
                  Clips
                </Badge>
              </a>
            )}
            {channels.length > 0 && (
              <a href="#redactores" className="flex-none">
                <Badge variant="outline" className="h-8 rounded-full px-3 text-[13px] hover:bg-eg-surface">
                  Redactores
                </Badge>
              </a>
            )}
          </nav>
        </div>

        {featured ? (
          <div ref={top} className="grid scroll-mt-28 grid-cols-[1.7fr_1fr] gap-8 max-[900px]:grid-cols-1">
            <Stage key={featured.key} clip={featured} autoplay={!!cur} kicker={cur ? undefined : 'En portada'} />
            {side.length > 0 && (
              <div className="min-w-0">
                <h2 className="mb-3 text-xs font-semibold tracking-[.08em] text-eg-muted uppercase">Lo último</h2>
                <div className="grid gap-4">
                  {side.map((c) => (
                    <ClipCard key={c.key} clip={c} row onPick={pick} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="py-20 text-center text-eg-muted">Pronto publicaremos aquí nuestros videos.</p>
        )}

        <ShortsReel clips={shorts} />

        {popular.length >= 3 ? (
          <div className="mt-12 grid grid-cols-[1fr_340px] gap-8 max-[900px]:grid-cols-1">
            <div className="min-w-0">
              {hub.sections.map((s, i) => (
                <div key={s.label} id={'cat-' + (s.slug ?? 'video')} className="scroll-mt-28">
                  <Row title={s.label} clips={s.items} className={i === 0 ? 'mt-0' : undefined} />
                </div>
              ))}
            </div>
            <aside>
              <Head title="Lo más visto" />
              <Ranking clips={popular} />
            </aside>
          </div>
        ) : (
          hub.sections.map((s) => (
            <div key={s.label} id={'cat-' + (s.slug ?? 'video')} className="scroll-mt-28">
              <Row title={s.label} clips={s.items} />
            </div>
          ))
        )}

        {channels.length > 0 && (
          <section id="redactores" className="mt-14 scroll-mt-28">
            <Head title="De nuestros redactores" note="Programas propios de la redacción. Se actualizan solos desde sus canales." />
            <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
              {channels.map((c) => (
                <ChannelCard key={c.slug} ch={c} />
              ))}
            </div>
          </section>
        )}
      </main>
    </SiteChrome>
  )
}

/* ---------- Página de un video de la redacción ---------- */

export function VideoPage({ video, more, menu }: { video: Clip; more: Clip[]; menu: MenuItem[] }) {
  const toast = useToast()
  return (
    <SiteChrome menu={menu} active="video">
      <main className="mx-auto max-w-[1100px] px-5 pt-6">
        <Link href="/video" className="mb-4 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-eg-muted hover:text-eg-ink">
          <Icon name="left" size={14} /> Video
        </Link>
        <div className={cn(video.vertical && 'mx-auto max-w-[420px]')}>
          <Player clip={video} />
        </div>
        <div className="mx-auto mt-5 max-w-[760px]">
          <span className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="rounded-full">{video.label}</Badge>
            <Fresh date={video.published} />
          </span>
          <h1 className="m-0 font-serif text-[clamp(28px,4vw,44px)] leading-[1.08] font-medium tracking-[-.02em]">{video.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-y border-eg-rule py-3">
            <Meta clip={video} className="flex-1 text-sm" />
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-eg-rule bg-transparent px-3 text-sm font-medium hover:bg-eg-surface"
              onClick={() => {
                if (navigator.share && matchMedia('(pointer: coarse)').matches) return void navigator.share({ title: video.title, url: location.href }).catch(() => {})
                navigator.clipboard.writeText(location.href).then(
                  () => toast('Enlace copiado'),
                  () => toast('No se pudo copiar el enlace'),
                )
              }}
            >
              <Icon name="share" size={15} /> Compartir
            </button>
          </div>
          {video.description && <p className="mt-4 font-serif text-[19px] leading-[1.6] whitespace-pre-line">{video.description}</p>}
        </div>
        <Row title="Más videos" href="/video" clips={more} />
      </main>
    </SiteChrome>
  )
}

/* ---------- Página de un canal de redactor ---------- */

export function ChannelPage({ ch, menu }: { ch: ChannelFeed; menu: MenuItem[] }) {
  const top = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState<Clip | null>(null)
  const main = cur ?? ch.latest[0] ?? ch.lives[0] ?? ch.shorts[0]
  const pick = (c: Clip) => {
    setCur(c)
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <SiteChrome menu={menu} active="video">
      <main className="mx-auto max-w-[1240px] px-5 pt-6">
        <Link href="/video#redactores" className="mb-4 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-eg-muted hover:text-eg-ink">
          <Icon name="left" size={14} /> Video
        </Link>
        <div className="mb-6 flex flex-wrap items-center gap-4 border-b-2 border-eg-ink pb-4">
          <RingAvatar ch={ch} size="lg" />
          <div className="min-w-0 flex-1">
            <span className="mb-1 block text-xs font-semibold tracking-[.08em] text-eg-accent uppercase">{ch.label}</span>
            <h1 className="m-0 font-serif text-[clamp(28px,4vw,44px)] leading-none font-medium">{ch.name}</h1>
            {ch.by && <p className="mt-1 mb-0 text-sm text-eg-muted">Con {ch.by}</p>}
          </div>
          <a href={ch.url} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-eg-accent px-3.5 text-sm font-semibold text-white hover:brightness-110">
            Suscribirse en YouTube
          </a>
        </div>
        {main && (
          <div ref={top} className={cn('grid scroll-mt-28 gap-8', ch.spotifyShowId ? 'grid-cols-[1.7fr_1fr] max-[900px]:grid-cols-1' : 'grid-cols-1')}>
            <div className={cn(main.vertical ? 'mx-auto w-full max-w-[380px]' : 'min-w-0')}>
              {main.vertical ? <Player key={main.key} clip={main} autoplay={!!cur} /> : <Stage key={main.key} clip={main} autoplay={!!cur} />}
            </div>
            {ch.spotifyShowId && (
              <Card className="h-fit gap-3">
                <CardHeader>
                  <CardTitle className="font-serif text-lg font-medium">Escúchalo en audio</CardTitle>
                  <CardDescription>También en Spotify</CardDescription>
                </CardHeader>
                <CardContent>
                  <iframe
                    src={`https://open.spotify.com/embed/show/${ch.spotifyShowId}?utm_source=generator`}
                    title={`${ch.name} en Spotify`}
                    loading="lazy"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    className="h-[352px] w-full rounded-xl border-0"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}
        <Row title={ch.spotifyShowId ? 'Episodios' : 'Más videos'} clips={ch.latest.filter((c) => c.key !== main?.key).slice(0, 12)} onPick={pick} />
        <Row title="Directos" clips={ch.lives.slice(0, 10)} onPick={pick} />
        <Row title="Clips" clips={ch.shorts.slice(0, 15)} onPick={pick} vertical />
      </main>
    </SiteChrome>
  )
}
