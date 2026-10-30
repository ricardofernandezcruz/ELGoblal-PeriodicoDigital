'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { addComment, markHelpful, registerRead } from '@/app/actions'
import { ArtFrame, ArtImg } from '@/components/eg/art'
import { Icon } from '@/components/eg/icon'
import { useToast } from '@/components/eg/toast'
import { CardMedium, secH } from '@/components/portada/portada'
import type { MenuItem } from '@/components/portada/site-header'
import type { ArticleBlock } from '@/db/schema'
import type { Card, FullArticle } from '@/lib/queries'
import { formatDate } from '@/lib/site'
import { cn } from '@/lib/utils'
import { SiteChrome } from './chrome'
import { TimeAgo } from './time-ago'

const SIZES = [18, 20, 22],
  NAMES = ['pequeña', 'media', 'grande']
const btn = 'rounded border-0 bg-eg-ink px-4 py-2.5 text-sm font-semibold text-eg-bg hover:opacity-[.88] disabled:opacity-60'

export type ArticlePageData = {
  article: FullArticle
  next: Card | null
  related: Card[]
  comments: { id: string; parentId: string | null; who: string; body: string; at: string; helpful: number }[]
  minutes: number
  menu: MenuItem[]
}

export function ArticleView(props: ArticlePageData) {
  return (
    <SiteChrome menu={props.menu} active={props.article.secSlug}>
      <ArticleInner {...props} />
    </SiteChrome>
  )
}

/** Solo se incrustan videos de YouTube y Vimeo, con su ID validado. */
function embed(u: string): string | null {
  try {
    const url = new URL(u)
    const h = url.hostname.replace(/^www\./, '')
    let id: string | null = null
    if (h === 'youtu.be') id = url.pathname.slice(1)
    else if (h.endsWith('youtube.com')) id = url.searchParams.get('v') ?? url.pathname.match(/\/(?:shorts|embed)\/([\w-]+)/)?.[1] ?? null
    if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`
    if (h === 'vimeo.com') {
      const v = url.pathname.match(/^\/(\d+)/)?.[1]
      if (v) return `https://player.vimeo.com/video/${v}`
    }
  } catch {}
  return null
}

type Group = ArticleBlock | { t: 'gal'; id: string; im: Extract<ArticleBlock, { t: 'img' }>[] }

function Body({ blocks, heroSrc }: { blocks: ArticleBlock[]; heroSrc: string | null }) {
  // La primera imagen ya se muestra como portada; las imágenes seguidas forman galería.
  let skipped = false
  const groups: Group[] = []
  for (const b of blocks) {
    if (b.t === 'img') {
      if (!b.src) continue
      if (!skipped && b.src === heroSrc) {
        skipped = true
        continue
      }
      const last = groups[groups.length - 1]
      if (last?.t === 'gal') last.im.push(b)
      else groups.push({ t: 'gal', id: 'g' + b.id, im: [b] })
    } else if (!(b.t === 'p' && !b.v.trim())) groups.push(b)
  }
  return (
    <>
      {groups.map((b) => {
        switch (b.t) {
          case 'p':
            return <p key={b.id}>{b.v}</p>
          case 'sub':
            return b.v.trim() ? (
              <h2 key={b.id} className="mt-[1.6em] mb-[.5em] font-serif text-[28px] leading-[1.2] font-medium">
                {b.v}
              </h2>
            ) : null
          case 'quote':
            return b.v.trim() ? (
              <blockquote key={b.id} className="my-[1.4em] border-t-2 border-b border-t-eg-ink border-b-eg-rule py-[18px] font-serif text-[30px] leading-[1.25] italic max-[600px]:text-2xl">
                «{b.v}»{b.who && <cite className="mt-2 block font-sans text-[13px] text-eg-muted not-italic">{b.who}</cite>}
              </blockquote>
            ) : null
          case 'data':
            return b.n.trim() ? (
              <div key={b.id} className="mb-[1.1em] border-l-[3px] border-eg-accent bg-eg-surface px-5 py-4">
                <b className="block font-serif text-[44px] leading-none font-semibold text-eg-accent">{b.n}</b>
                <span className="text-sm text-eg-muted">{b.l}</span>
              </div>
            ) : null
          case 'sum': {
            const items = b.v.split('\n').filter((x) => x.trim())
            return items.length ? (
              <section key={b.id} className="mb-7 border-l-[3px] border-eg-accent bg-eg-surface px-[22px] py-5">
                <h2 className="mb-2 font-sans text-sm font-semibold">En 30 segundos</h2>
                <ul className="m-0 list-disc pl-[18px] font-serif text-[17px] leading-normal [&>li]:my-1">
                  {items.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </section>
            ) : null
          }
          case 'video': {
            const src = embed(b.u)
            return (
              <figure key={b.id} className="mx-0 mb-[1.1em]">
                {src ? (
                  <iframe
                    src={src}
                    title={b.cap || 'Video'}
                    loading="lazy"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                    className={cn('w-full rounded-[2px] border-0 bg-black', b.vert ? 'mx-auto aspect-[9/16] max-w-[360px]' : 'aspect-video')}
                  />
                ) : b.u ? (
                  <a href={b.u} target="_blank" rel="noopener nofollow" className="flex aspect-video items-center justify-center rounded-[2px] bg-[linear-gradient(135deg,#1f4163,#0e2238)] font-semibold text-white">
                    ▶ Ver video
                  </a>
                ) : null}
                {b.cap && <figcaption className="mt-2 text-[13px] text-eg-muted">{b.cap}</figcaption>}
              </figure>
            )
          }
          case 'gal':
            return b.im.length > 1 ? (
              <div key={b.id} className={cn('mb-[1.1em] grid gap-1.5', b.im.length > 2 ? 'grid-cols-3 max-[600px]:grid-cols-2' : 'grid-cols-2')}>
                {b.im.map((im) => (
                  <div key={im.id} className="eg-photo aspect-[4/3] overflow-hidden rounded-[2px] bg-eg-surface">
                    <ArtImg src={im.src} alt={im.alt} />
                  </div>
                ))}
              </div>
            ) : (
              <figure key={b.id} className="mx-0 mb-[1.1em]">
                <ArtFrame src={b.im[0].src} alt={b.im[0].alt} />
                {b.im[0].cap && <figcaption className="mt-2 text-[13px] text-eg-muted">{b.im[0].cap}</figcaption>}
              </figure>
            )
          default:
            return null
        }
      })}
    </>
  )
}

function ArticleInner({ article: a, next, related, comments, minutes }: ArticlePageData) {
  const toast = useToast()
  const ref = useRef<HTMLElement>(null)
  const txt = useRef<HTMLDivElement>(null)
  const [prog, setProg] = useState(0)
  const [listening, setListening] = useState(false)
  const [si, setSi] = useState(1)
  const [focus, setFocus] = useState(false)

  useEffect(() => {
    const on = () => {
      const r = ref.current!.getBoundingClientRect(),
        h = r.height - innerHeight * 0.6
      setProg(Math.max(0, Math.min(100, ((-r.top + innerHeight * 0.3) / h) * 100)))
    }
    on()
    addEventListener('scroll', on, { passive: true })
    // Una lectura por nota y sesión
    try {
      const k = 'eg-read:' + a.id
      if (!sessionStorage.getItem(k)) {
        sessionStorage.setItem(k, '1')
        registerRead(a.id)
      }
    } catch {}
    return () => {
      removeEventListener('scroll', on)
      if ('speechSynthesis' in window) speechSynthesis.cancel()
    }
  }, [a.id])

  useEffect(() => {
    document.body.classList.toggle('eg-focus', focus)
    return () => document.body.classList.remove('eg-focus')
  }, [focus])

  const listen = () => {
    if (!('speechSynthesis' in window)) return toast('Tu navegador no admite lectura en voz alta')
    speechSynthesis.cancel()
    if (listening) return setListening(false)
    const u = new SpeechSynthesisUtterance([a.title, a.lead, txt.current?.innerText ?? ''].join('. ').slice(0, 4000))
    u.lang = 'es-ES'
    u.onend = () => setListening(false)
    setListening(true)
    speechSynthesis.speak(u)
  }

  const tool =
    'grid size-10 place-items-center rounded-md border-0 bg-transparent text-sm font-semibold hover:bg-eg-surface aria-pressed:bg-eg-ink aria-pressed:text-eg-bg'

  return (
    <div style={{ '--fs': SIZES[si] + 'px' } as React.CSSProperties}>
      <div className="fixed top-0 left-0 z-50 h-[3px] bg-eg-accent" style={{ width: prog + '%' }} />

      <aside
        aria-label="Herramientas de lectura"
        className="fixed top-1/2 left-[max(12px,calc(50%-520px))] z-[15] flex -translate-y-1/2 flex-col gap-1.5 rounded-lg border border-eg-rule bg-eg-card p-1.5 max-[1180px]:top-auto max-[1180px]:bottom-3 max-[1180px]:left-1/2 max-[1180px]:-translate-x-1/2 max-[1180px]:translate-y-0 max-[1180px]:flex-row max-[900px]:bottom-[64px]"
      >
        <button
          className={tool}
          aria-label="Copiar enlace"
          onClick={() => {
            const share = navigator.share?.bind(navigator)
            if (share && matchMedia('(pointer: coarse)').matches) return share({ title: a.title, url: location.href }).catch(() => {})
            navigator.clipboard.writeText(location.href).then(
              () => toast('Enlace copiado'),
              () => toast('No se pudo copiar el enlace'),
            )
          }}
        >
          <Icon name="share" size={18} round={false} />
        </button>
        <button className={tool} aria-pressed={listening} aria-label="Escuchar" onClick={listen}>
          <Icon name="volume" size={18} round={false} />
        </button>
        <button
          className={tool}
          aria-label="Cambiar tamaño de letra"
          onClick={() => {
            const n = (si + 1) % 3
            setSi(n)
            toast('Letra ' + NAMES[n])
          }}
        >
          Aa
        </button>
        <button className={tool} aria-pressed={focus} aria-label="Modo lectura" onClick={() => setFocus(!focus)}>
          <Icon name="lines" size={18} round={false} />
        </button>
      </aside>

      <article ref={ref} className="mx-auto max-w-[700px] px-5 pt-10">
        <Link href={'/' + a.secSlug} className="text-xs font-semibold text-eg-accent">
          {a.sec}
        </Link>
        <h1 className="mt-2.5 mb-3.5 font-serif text-[clamp(34px,5vw,52px)] leading-[1.08] font-medium tracking-[-.02em] break-words">{a.title}</h1>
        {a.lead && <p className="mb-5 font-serif text-[22px] leading-[1.45] text-eg-muted max-[600px]:text-[19px]">{a.lead}</p>}
        <div className="flex items-center gap-3 border-y border-eg-rule py-3.5 text-sm text-eg-muted">
          <div className="grid size-[42px] flex-none place-items-center rounded-full bg-eg-surface font-serif text-lg text-eg-ink">
            {(a.au ?? 'E').slice(0, 1)}
          </div>
          <div>
            <b className="block text-eg-ink">{a.au ?? 'Redacción'}</b>
            {formatDate(a.date, true)} · {minutes} min de lectura
          </div>
        </div>
        {a.hero && (
          <figure className="m-0">
            <ArtFrame src={a.hero.src} alt={a.hero.alt} className="mt-7 mb-2" />
            {(() => {
              const cap = a.blocks.find((b): b is Extract<ArticleBlock, { t: 'img' }> => b.t === 'img' && b.src === a.hero!.src)?.cap
              return cap ? <figcaption className="mb-7 text-[13px] text-eg-muted">{cap}</figcaption> : <div className="mb-7" />
            })()}
          </figure>
        )}
        {!a.hero && <div className="mb-7" />}

        <div ref={txt} className="[&>p]:mb-[1.1em] [&>p]:font-serif [&>p]:text-[length:var(--fs)] [&>p]:leading-[1.65] [&>p]:break-words [&>p]:whitespace-pre-line">
          <Body blocks={a.blocks} heroSrc={a.hero?.src ?? null} />
        </div>

        {a.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {a.tags.map((t) => (
              <span key={t} className="rounded-full border border-eg-rule px-3 py-1 text-[13px] text-eg-muted">
                #{t}
              </span>
            ))}
          </div>
        )}

        {next && (
          <div className="eg-dim mt-10 border-t-2 border-eg-ink pt-4">
            <span className="text-xs font-semibold text-eg-accent">Siguiente lectura</span>
            <Link href={next.href} className="hover:underline hover:underline-offset-4">
              <div className="my-1.5 font-serif text-[26px] leading-[1.2] font-medium">{next.title}</div>
            </Link>
            <div className="text-xs text-eg-muted">
              <TimeAgo date={next.date} />
            </div>
          </div>
        )}
      </article>

      {a.allowComments && <Comments articleId={a.id} list={comments} />}

      {related.length > 0 && (
        <section className="eg-dim mx-auto mt-10 max-w-[1100px] px-5">
          <div className={secH}>
            <h2 className="m-0 font-serif text-[26px] font-medium">Relacionados</h2>
          </div>
          <div className="grid grid-cols-3 gap-6 max-[800px]:grid-cols-1">
            {related.map((c) => (
              <CardMedium key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Comments({ articleId, list }: { articleId: string; list: ArticlePageData['comments'] }) {
  const toast = useToast()
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [reply, setReply] = useState<{ id: string; who: string } | null>(null)
  const [liked, setLiked] = useState<string[]>([])
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const roots = list.filter((c) => !c.parentId)
  const kids = (id: string) => list.filter((c) => c.parentId === id)

  const item = (c: ArticlePageData['comments'][number], child = false) => (
    <div key={c.id} className={cn('flex gap-3 border-t border-eg-rule py-4', child && 'ml-12 max-[600px]:ml-6')}>
      <div className="grid size-9 flex-none place-items-center rounded-full bg-eg-surface font-semibold text-eg-muted">{c.who.slice(0, 1).toUpperCase()}</div>
      <div className="min-w-0">
        <b>{c.who}</b>{' '}
        <span className="text-xs text-eg-muted">
          <TimeAgo date={c.at} />
        </span>
        <p className="mt-1 mb-1.5 text-[15px] break-words whitespace-pre-line">{c.body}</p>
        {!child && (
          <button
            className="mr-3 border-0 bg-transparent py-0.5 text-[13px] text-eg-muted"
            onClick={() => {
              setReply({ id: c.id, who: c.who })
              bodyRef.current?.focus()
            }}
          >
            Responder
          </button>
        )}
        <button
          className="mr-3 border-0 bg-transparent py-0.5 text-[13px] text-eg-muted"
          disabled={liked.includes(c.id)}
          onClick={() => {
            setLiked([...liked, c.id])
            markHelpful(c.id)
          }}
        >
          Útil · {c.helpful + (liked.includes(c.id) ? 1 : 0)}
        </button>
      </div>
    </div>
  )

  return (
    <section className="eg-dim mx-auto mt-10 max-w-[700px] px-5" aria-labelledby="tc">
      <h2 id="tc" className="mb-5 border-b-2 border-eg-ink pb-2 font-serif text-[26px] font-medium">
        Comentarios <span className="text-xs text-eg-muted">({list.length})</span>
      </h2>
      {roots.length ? (
        roots.map((c) => (
          <div key={c.id}>
            {item(c)}
            {kids(c.id).map((k) => item(k, true))}
          </div>
        ))
      ) : (
        <p className="text-sm text-eg-muted">Todavía no hay comentarios. Sé la primera persona en opinar.</p>
      )}
      <form
        className="mt-4 grid gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          const website = String(new FormData(e.currentTarget).get('website') ?? '')
          const r = await addComment({ articleId, name, body, parentId: reply?.id ?? null, website })
          setBusy(false)
          if (!r.ok) return setMsg({ ok: false, t: r.error })
          setMsg({ ok: true, t: r.message })
          setBody('')
          setReply(null)
          toast('Comentario enviado')
        }}
      >
        {reply && (
          <div className="flex items-center gap-2 text-[13px] text-eg-muted">
            Respondiendo a <b className="text-eg-ink">{reply.who}</b>
            <button type="button" className="border-0 bg-transparent text-eg-accent" onClick={() => setReply(null)}>
              Cancelar
            </button>
          </div>
        )}
        {/* Campo trampa para bots: oculto a personas y lectores de pantalla */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
        <label htmlFor="cn" className="sr-only">
          Tu nombre
        </label>
        <input
          id="cn"
          value={name}
          maxLength={60}
          onChange={(e) => (setName(e.target.value), setMsg(null))}
          placeholder="Tu nombre"
          className="rounded border border-eg-rule bg-eg-bg px-3.5 py-[11px] text-eg-ink"
        />
        <label htmlFor="ci" className="sr-only">
          Escribe un comentario
        </label>
        <textarea
          ref={bodyRef}
          id="ci"
          value={body}
          maxLength={2000}
          rows={3}
          onChange={(e) => (setBody(e.target.value), setMsg(null))}
          placeholder="Escribe un comentario respetuoso"
          className="resize-y rounded border border-eg-rule bg-eg-bg px-3.5 py-[11px] text-eg-ink"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button className={btn} disabled={busy || !name.trim() || !body.trim()}>
            {busy ? 'Enviando…' : 'Publicar comentario'}
          </button>
          <span role="status" className={cn('text-[13px]', msg?.ok ? 'text-eg-ok' : 'text-eg-accent')}>
            {msg?.t}
          </span>
        </div>
        <p className="m-0 text-xs text-eg-muted">Los comentarios se publican después de que la redacción los revisa.</p>
      </form>
    </section>
  )
}

