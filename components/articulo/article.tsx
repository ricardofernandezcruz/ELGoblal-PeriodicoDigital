'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArtFrame } from '@/components/eg/art'
import { Icon } from '@/components/eg/icon'
import { ToastProvider, useToast } from '@/components/eg/toast'
import { cn } from '@/lib/utils'
import { ArticleHeader, MiniFooter } from './article-header'

const tag = 'text-xs font-semibold text-eg-accent'
const btn = 'rounded border-0 bg-eg-ink px-4 py-2.5 text-sm font-semibold text-eg-bg hover:opacity-[.88]'
const btnAlt = 'rounded border border-eg-rule bg-transparent px-4 py-2.5 text-sm font-semibold text-eg-ink'
const h3 = 'my-1.5 font-serif text-xl leading-[1.2] font-medium'
const secH = 'mb-5 border-b-2 border-eg-ink pb-2 font-serif text-[26px] font-medium'
const SIZES = [18, 20, 22],
  NAMES = ['pequeña', 'media', 'grande']

type Comment = { id: number; who: string; when: string; text: string; reply?: boolean; likes?: number }

export function Article() {
  return (
    <ToastProvider>
      <ArticleInner />
    </ToastProvider>
  )
}

function ArticleInner() {
  const toast = useToast()
  const article = useRef<HTMLElement>(null)
  const txt = useRef<HTMLDivElement>(null)
  const [prog, setProg] = useState(0)
  const [saved, setSaved] = useState(false)
  const [listening, setListening] = useState(false)
  const [si, setSi] = useState(1)
  const [focus, setFocus] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  // Barra de progreso de lectura
  useEffect(() => {
    const on = () => {
      const r = article.current!.getBoundingClientRect(),
        h = r.height - innerHeight * 0.6
      setProg(Math.max(0, Math.min(100, ((-r.top + innerHeight * 0.3) / h) * 100)))
    }
    on()
    addEventListener('scroll', on, { passive: true })
    return () => {
      removeEventListener('scroll', on)
      if ('speechSynthesis' in window) speechSynthesis.cancel()
    }
  }, [])

  const listen = () => {
    if (!('speechSynthesis' in window)) return toast('Tu navegador no admite lectura en voz alta')
    speechSynthesis.cancel()
    if (listening) return setListening(false)
    const u = new SpeechSynthesisUtterance((txt.current?.innerText ?? '').slice(0, 1500))
    u.lang = 'es-ES'
    u.onend = () => setListening(false)
    setListening(true)
    speechSynthesis.speak(u)
  }

  const tool = 'grid size-10 place-items-center rounded-md border-0 bg-transparent text-sm font-semibold hover:bg-eg-surface aria-pressed:bg-eg-ink aria-pressed:text-eg-bg'

  return (
    <div className={cn(focus && 'eg-focus')} style={{ '--fs': SIZES[si] + 'px' } as React.CSSProperties}>
      <div className="fixed top-0 left-0 z-50 h-[3px] bg-eg-accent" style={{ width: prog + '%' }} />
      <ArticleHeader className="eg-dim" />

      <aside
        aria-label="Herramientas de lectura"
        className="fixed top-1/2 left-[max(12px,calc(50%-520px))] z-[15] flex -translate-y-1/2 flex-col gap-1.5 rounded-lg border border-eg-rule bg-eg-card p-1.5 max-[1180px]:top-auto max-[1180px]:bottom-3 max-[1180px]:left-1/2 max-[1180px]:-translate-x-1/2 max-[1180px]:translate-y-0 max-[1180px]:flex-row"
      >
        <button
          className={tool}
          aria-pressed={saved}
          aria-label="Guardar"
          onClick={() => {
            setSaved(!saved)
            toast(!saved ? 'Nota guardada' : 'Quitada de guardados')
          }}
        >
          <Icon name="bookmark" size={18} round={false} />
        </button>
        <button
          className={tool}
          aria-label="Copiar enlace"
          onClick={() => {
            try {
              navigator.clipboard.writeText(location.href).then(
                () => toast('Enlace copiado'),
                () => toast('No se pudo copiar el enlace'),
              )
            } catch {
              toast('No se pudo copiar el enlace')
            }
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

      <article ref={article} className="mx-auto max-w-[700px] px-5 pt-10">
        <span className={tag}>Geopolítica y análisis</span>
        <h1 className="mt-2.5 mb-3.5 font-serif text-[clamp(34px,5vw,52px)] leading-[1.08] font-medium tracking-[-.02em]">
          El mundo reordena sus prioridades ante una nueva era de incertidumbre
        </h1>
        <p className="mb-5 font-serif text-[22px] leading-[1.45] text-eg-muted">
          Las grandes potencias abren una etapa de diálogo para afrontar los desafíos que definirán la próxima década.
        </p>
        <div className="flex items-center gap-3 border-y border-eg-rule py-3.5 text-sm text-eg-muted">
          <div className="size-[42px] flex-none rounded-full bg-[linear-gradient(135deg,#8aa0ad,#5b6e7c)]" />
          <div>
            <b className="block text-eg-ink">Redacción Global</b>13 de octubre de 2026 · 8 min de lectura
          </div>
        </div>
        <figure className="m-0">
          <ArtFrame src="skyline" alt="Vista aérea nocturna de una ciudad" className="mt-7 mb-2" />
          <figcaption className="mb-7 text-[13px] text-eg-muted">Una ciudad al anochecer. Imagen de ilustración.</figcaption>
        </figure>
        <section className="mb-7 border-l-[3px] border-eg-accent bg-eg-surface px-[22px] py-5" aria-labelledby="s30">
          <h2 id="s30" className="mb-2 text-sm font-semibold">
            En 30 segundos
          </h2>
          <ul className="m-0 list-disc pl-[18px] font-serif text-[17px] leading-normal [&>li]:my-1">
            <li>Las potencias acuerdan una hoja de ruta de diálogo.</li>
            <li>Clima, energía y tecnología encabezan la agenda.</li>
            <li>Los primeros resultados se esperan en seis meses.</li>
          </ul>
        </section>

        <div
          ref={txt}
          className="[&_p]:mb-[1.1em] [&_p]:font-serif [&_p]:text-[length:var(--fs)] [&_p]:leading-[1.65]"
        >
          <p>
            Durante años, la agenda internacional se movió por impulsos: una crisis desplazaba a la anterior y casi nunca
            quedaba tiempo para planificar. Esta semana, por primera vez en mucho tiempo, las principales delegaciones
            coincidieron en que el método tiene que cambiar.
          </p>
          <p>
            El acuerdo no resuelve ninguna disputa concreta, pero fija un calendario de reuniones técnicas y una lista de
            temas comunes. Para los analistas consultados, ese orden previo es más importante que cualquier declaración.
          </p>
          <h2 className="mt-[1.6em] mb-[.5em] font-serif text-[28px] leading-[1.2] font-medium">Tres prioridades sobre la mesa</h2>
          <p>
            La primera es la energía: cómo asegurar el suministro sin frenar la transición hacia fuentes limpias. La
            segunda es la tecnología, con la inteligencia artificial como el tema que más divide. La tercera es la
            cooperación financiera para los países con menos margen.
          </p>
          <blockquote className="my-[1.4em] border-t-2 border-b border-t-eg-ink border-b-eg-rule py-[18px] font-serif text-[30px] leading-[1.25] italic">
            «El orden previo importa más que cualquier declaración.»
          </blockquote>
          <p>
            Quedan dudas sobre su cumplimiento. Los compromisos no son vinculantes, y varios gobiernos ya anunciaron que
            revisarán sus términos tras las elecciones del próximo año.
          </p>
          {!unlocked ? (
            <>
              <div className="relative">
                <div className="pointer-events-none absolute right-0 bottom-full left-0 h-[140px] bg-gradient-to-t from-eg-bg to-transparent" />
              </div>
              <div className="mb-8 rounded border border-eg-rule bg-eg-card p-7 text-center">
                <h2 className="mb-1.5 font-serif text-[26px] font-medium">Sigue leyendo con una suscripción</h2>
                <p className="!mb-4 !font-sans !text-base text-eg-muted">Accede a todas las notas, sin límite, desde 1 US$ al mes.</p>
                <div className="flex flex-wrap justify-center gap-1">
                  <button
                    className={btn}
                    onClick={() => {
                      setUnlocked(true)
                      toast('Suscripción simulada: artículo completo')
                    }}
                  >
                    Suscribirme
                  </button>
                  <button className={btnAlt} onClick={() => toast('Aquí iría el inicio de sesión')}>
                    Ya tengo cuenta
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div>
              <p>
                Para los países más pequeños, el desafío es otro: llegar a la mesa con propuestas propias y no solo como
                espectadores de decisiones tomadas por otros.
              </p>
              <p>
                Los próximos seis meses dirán si el diálogo se convierte en acuerdos medibles o queda en una buena intención
                más.
              </p>
            </div>
          )}
        </div>

        <div className="mt-10 border-t-2 border-eg-ink pt-4">
          <span className={tag}>Siguiente lectura</span>
          <Link href="/articulo" className="hover:underline hover:underline-offset-4">
            <div className={cn(h3, 'text-[26px]')}>El mapa de las nuevas alianzas que redefinen el tablero mundial</div>
          </Link>
          <div className="text-xs text-eg-muted">6 min de lectura</div>
        </div>
      </article>

      <Comments />

      <section className="eg-dim mx-auto mt-10 max-w-[1100px] px-5">
        <h2 className={secH}>Relacionados</h2>
        <div className="grid grid-cols-3 gap-6 max-[800px]:grid-cols-1">
          {[
            ['mercados', 'Los mercados miran a Europa ante un nuevo ciclo de inversión', 'Hace 42 min'],
            ['ia', 'La inteligencia artificial cambia la forma de leer las noticias', 'Hace 1 h'],
            ['energia', 'Qué hay detrás del auge de las energías limpias', 'Hace 3 h'],
          ].map(([a, t, m]) => (
            <Link key={t} href="/articulo" className="group">
              <ArtFrame src={a} />
              <div className={cn(h3, 'group-hover:underline group-hover:underline-offset-4')}>{t}</div>
              <div className="text-xs text-eg-muted">{m}</div>
            </Link>
          ))}
        </div>
      </section>

      <MiniFooter className="eg-dim max-[1180px]:pb-[90px]" />
    </div>
  )
}

function Comments() {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [list, setList] = useState<Comment[]>([
    { id: 1, who: 'Carla M.', when: 'hace 2 h', text: 'Buen resumen. Lo más relevante es el calendario de reuniones técnicas.', likes: 3 },
    { id: 2, who: 'Redacción', when: 'hace 1 h', text: 'Gracias, Carla. Lo ampliaremos en la próxima actualización.', reply: true },
  ])
  const [liked, setLiked] = useState<number[]>([])
  const [val, setVal] = useState('')

  return (
    <section className="mx-auto mt-10 max-w-[700px] px-5" aria-labelledby="tc">
      <h2 id="tc" className={secH}>
        Comentarios <span className="text-xs text-eg-muted">({list.length})</span>
      </h2>
      <div>
        {list.map((c) => (
          <div key={c.id} className={cn('flex gap-3 border-t border-eg-rule py-4', c.reply && 'ml-12')}>
            <div className="size-9 flex-none rounded-full bg-[linear-gradient(135deg,#8aa0ad,#5b6e7c)]" />
            <div>
              <b>{c.who}</b> <span className="text-xs text-eg-muted">{c.when}</span>
              <p className="mt-1 mb-1.5 text-[15px]">{c.text}</p>
              {c.likes !== undefined && (
                <>
                  <button
                    className="mr-3 border-0 bg-transparent py-0.5 text-[13px] text-eg-muted"
                    onClick={() => {
                      setVal('@Carla ')
                      input.current?.focus()
                    }}
                  >
                    Responder
                  </button>
                  <button
                    className="mr-3 border-0 bg-transparent py-0.5 text-[13px] text-eg-muted"
                    disabled={liked.includes(c.id)}
                    onClick={() => setLiked([...liked, c.id])}
                  >
                    Útil · {c.likes + (liked.includes(c.id) ? 1 : 0)}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const v = val.trim()
          if (!v) return
          setList([...list, { id: Date.now(), who: 'Tú', when: 'ahora', text: v }])
          setVal('')
          toast('Comentario publicado')
        }}
      >
        <label htmlFor="ci" className="sr-only">
          Escribe un comentario
        </label>
        <input
          ref={input}
          id="ci"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Escribe un comentario respetuoso"
          required
          className="min-w-0 flex-1 rounded border border-eg-rule bg-eg-bg px-3.5 py-[11px] text-eg-ink"
        />
        <button className={btn}>Publicar</button>
      </form>
    </section>
  )
}

