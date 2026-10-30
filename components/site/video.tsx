'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { registerVideoView } from '@/app/actions'
import { Icon } from '@/components/eg/icon'
import { useToast } from '@/components/eg/toast'
import type { MenuItem } from '@/components/portada/site-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
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

const PlayDot = ({ big }: { big?: boolean }) => (
  <span className={cn('grid place-items-center rounded-full bg-black/65 text-white backdrop-blur-sm', big ? 'size-16 max-[640px]:size-12' : 'size-9')}>
    <svg width={big ? 26 : 14} height={big ? 26 : 14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  </span>
)

/* ---------- Reproductor ---------- */

/** Archivo propio con <video>, o YouTube sin cookies que solo se carga al pulsar reproducir. */
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

  if (clip.fileUrl)
    return (
      <div className={box}>
        <video
          key={clip.key}
          src={clip.fileUrl}
          poster={clip.poster ?? undefined}
          controls
          playsInline
          preload="none"
          autoPlay={autoplay}
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
        <img src={clip.poster} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      )}
      <span className="absolute inset-0 grid place-items-center">
        <PlayDot big />
      </span>
    </button>
  )
}

/* ---------- Tarjetas ---------- */

function Poster({ clip, className }: { clip: Clip; className?: string }) {
  return (
    <span className={cn('relative block overflow-hidden rounded-lg bg-eg-surface', clip.vertical ? 'aspect-[9/16]' : 'aspect-video', className)}>
      {clip.poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={clip.poster} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      )}
      <span className="absolute bottom-2 left-2">
        <PlayDot />
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
        <Badge variant="secondary" className="mb-1.5 h-5 rounded-full px-2 text-[11px]">
          {clip.label}
        </Badge>
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

/** Fila deslizable (con flechas en escritorio, con el dedo en el teléfono). */
function Row({ title, href, clips, onPick, vertical }: { title: string; href?: string; clips: Clip[]; onPick?: (c: Clip) => void; vertical?: boolean }) {
  if (!clips.length) return null
  return (
    <section className="mt-10">
      <Carousel opts={{ align: 'start', dragFree: true }}>
        <div className="mb-4 flex items-end justify-between gap-3 border-b border-eg-rule pb-2">
          <h3 className="m-0 font-serif text-[22px] leading-none font-medium">{title}</h3>
          <div className="flex items-center gap-3">
            {href && (
              <Link href={href} className="text-sm font-semibold hover:underline hover:underline-offset-4">
                Ver todo
              </Link>
            )}
            <div className="flex gap-1.5 max-[640px]:hidden">
              <CarouselPrevious className="static my-0" />
              <CarouselNext className="static my-0" />
            </div>
          </div>
        </div>
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

function Featured({ clip, autoplay }: { clip: Clip; autoplay?: boolean }) {
  const title = <h2 className="m-0 font-serif text-[clamp(24px,3vw,36px)] leading-[1.1] font-medium tracking-[-.01em]">{clip.title}</h2>
  return (
    <div className="min-w-0">
      <Player clip={clip} autoplay={autoplay} />
      <div className="mt-4">
        <Badge className="mb-2 rounded-full">{clip.label}</Badge>
        {clip.href ? (
          <Link href={clip.href} className="hover:underline hover:underline-offset-4">
            {title}
          </Link>
        ) : (
          title
        )}
        {clip.description && <p className="mt-2 mb-0 line-clamp-3 max-w-[68ch] font-serif text-[17px] leading-normal text-eg-muted">{clip.description}</p>}
        <Meta clip={clip} className="mt-2" />
      </div>
    </div>
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
          <h2 id="t-video" className="m-0 font-serif text-[30px] leading-none font-medium">
            <Link href="/video" className="hover:underline hover:underline-offset-4">
              Video
            </Link>
          </h2>
          <Link href="/video" className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold hover:underline hover:underline-offset-4">
            Ver todo <Icon name="right" size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-[1.7fr_1fr] gap-8 max-[900px]:grid-cols-1 max-[900px]:gap-6">
          <Featured key={featured.key} clip={featured} autoplay={!!cur} />
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

function ChannelCard({ ch }: { ch: ChannelFeed }) {
  const [cur, setCur] = useState<Clip | null>(null)
  const first = ch.latest[0] ?? ch.lives[0]
  if (!first) return null
  const main = cur ?? first
  const more = ch.latest.filter((c) => c.key !== main.key).slice(0, 3)
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center gap-3 border-b border-eg-rule py-3.5">
        <Avatar className="size-10">
          {ch.byImage && <AvatarImage src={ch.byImage} alt="" />}
          <AvatarFallback>{ch.label.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate font-serif text-[19px] font-medium">{ch.name}</CardTitle>
          <CardDescription className="truncate">
            {ch.label}
            {ch.by && ` · con ${ch.by}`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="py-4">
        <Player key={main.key} clip={main} autoplay={!!cur} />
        <p className="mt-2.5 mb-0 line-clamp-2 font-serif text-[17px] leading-[1.25] font-medium">{main.title}</p>
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

export function VideoHub({ hub, menu }: { hub: VideoHubData; menu: MenuItem[] }) {
  const top = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState<Clip | null>(null)
  const featured = cur ?? hub.featured
  const side = [...(hub.featured ? [hub.featured] : []), ...hub.latest].filter((c) => c.key !== featured?.key).slice(0, 5)
  const pick = (c: Clip) => {
    setCur(c)
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const channels = hub.channels.filter((c) => c.latest.length || c.lives.length)

  return (
    <SiteChrome menu={menu} active="video">
      <main className="mx-auto max-w-[1240px] px-5 pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-eg-ink pb-3">
          <div>
            <h1 className="m-0 font-serif text-[clamp(38px,5vw,60px)] leading-none font-medium tracking-[-.02em]">Video</h1>
            <p className="mt-2 mb-0 text-sm text-eg-muted">Las noticias en video de la redacción y los programas de nuestros redactores.</p>
          </div>
          <nav className="scrollbar-none flex max-w-full gap-2 overflow-x-auto" aria-label="Ir a">
            {hub.sections.map((s) => (
              <a key={s.label} href={'#cat-' + (s.slug ?? 'video')} className="flex-none">
                <Badge variant="outline" className="h-8 rounded-full px-3 text-[13px]">
                  {s.label}
                </Badge>
              </a>
            ))}
            {channels.length > 0 && (
              <a href="#redactores" className="flex-none">
                <Badge variant="outline" className="h-8 rounded-full px-3 text-[13px]">
                  Redactores
                </Badge>
              </a>
            )}
          </nav>
        </div>

        {featured ? (
          <div ref={top} className="grid scroll-mt-28 grid-cols-[1.7fr_1fr] gap-8 max-[900px]:grid-cols-1">
            <Featured key={featured.key} clip={featured} autoplay={!!cur} />
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

        {hub.sections.map((s) => (
          <div key={s.label} id={'cat-' + (s.slug ?? 'video')} className="scroll-mt-28">
            <Row title={s.label} clips={s.items} />
          </div>
        ))}

        {channels.length > 0 && (
          <section id="redactores" className="mt-14 scroll-mt-28">
            <div className="mb-5 border-b-2 border-eg-ink pb-2.5">
              <h2 className="m-0 font-serif text-[30px] leading-none font-medium">De nuestros redactores</h2>
              <p className="mt-1.5 mb-0 text-sm text-eg-muted">Programas propios de la redacción. Se actualizan solos desde sus canales.</p>
            </div>
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
          <Badge className="mb-2 rounded-full">{video.label}</Badge>
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
          <Avatar className="size-14">
            {ch.byImage && <AvatarImage src={ch.byImage} alt="" />}
            <AvatarFallback className="text-lg">{ch.label.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Badge variant="secondary" className="mb-1 rounded-full">
              {ch.label}
            </Badge>
            <h1 className="m-0 font-serif text-[clamp(28px,4vw,44px)] leading-none font-medium">{ch.name}</h1>
            {ch.by && <p className="mt-1 mb-0 text-sm text-eg-muted">Con {ch.by}</p>}
          </div>
          <a href={ch.url} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-eg-rule px-3.5 text-sm font-semibold hover:bg-eg-surface">
            Suscribirse en YouTube
          </a>
        </div>
        {main && (
          <div ref={top} className={cn('grid scroll-mt-28 gap-8', ch.spotifyShowId ? 'grid-cols-[1.7fr_1fr] max-[900px]:grid-cols-1' : 'grid-cols-1')}>
            <div className={cn(main.vertical ? 'mx-auto w-full max-w-[380px]' : 'min-w-0')}>
              <Featured key={main.key} clip={main} autoplay={!!cur} />
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
