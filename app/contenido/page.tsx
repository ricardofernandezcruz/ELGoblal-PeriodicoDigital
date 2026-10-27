'use client'

import { useEffect, useRef, useState } from 'react'
import { Chip, Chips } from '@/components/eg/chip'
import { LineChart } from '@/components/eg/line-chart'
import { OutlineBtn } from '@/components/eg/proto-header'
import { ToastProvider } from '@/components/eg/toast'
import { ContenidoHeader } from '@/components/contenido/contenido-header'
import { box, btn,  h2, meta, secH, sub } from '@/components/contenido/styles'
import { Timeline } from '@/components/portada/portada'
import { nowHM } from '@/lib/portada-data'
import { cn } from '@/lib/utils'

type Entry = { time: string; text: string; topic: string }
const INITIAL: Entry[] = [
  { time: '14:32', text: 'Se abre la sesión plenaria con 24 delegaciones.', topic: 'Política' },
  { time: '13:58', text: 'Los equipos técnicos presentan el borrador de la hoja de ruta.', topic: 'Política' },
  { time: '13:20', text: 'Los mercados europeos abren con subidas moderadas.', topic: 'Mercados' },
  { time: '12:40', text: 'Llegan las primeras delegaciones.', topic: 'Política' },
]
const NEXT = [
  ['Los delegados confirman una segunda ronda de conversaciones.', 'Política'],
  ['El euro se aprecia frente al dólar tras el anuncio.', 'Mercados'],
  ['Se publica el comunicado conjunto.', 'Política'],
]
const SERIES = [98, 99, 97, 100, 102, 101, 104, 103, 105, 104, 107, 108, 106, 110]
const h3 = 'mt-2.5 mb-1 font-serif text-xl leading-[1.2] font-medium'

export default function Page() {
  return (
    <ToastProvider duration={2000}>
      <ContenidoHeader />
      <main className="mx-auto max-w-[1000px] px-5 py-8">
        <h2 className={h2}>Contenido enriquecido</h2>
        <p className={sub}>Las piezas que faltaban: en directo, multimedia, datos y newsletter, todas con sus estados.</p>
        <Live />
        <Media />
        <Data />
        <Newsletter />
      </main>
    </ToastProvider>
  )
}

function Live() {
  const [entries, setEntries] = useState(INITIAL)
  const [filter, setFilter] = useState('Todo')
  const [pending, setPending] = useState<Entry[]>([])
  const [auto, setAuto] = useState(false)
  const ni = useRef(0)

  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => {
      const n = NEXT[ni.current++ % 3]
      setPending((p) => [...p, { time: nowHM(), text: n[0], topic: n[1] }])
    }, 3500)
    return () => clearInterval(t)
  }, [auto])

  const list = entries.filter((e) => filter === 'Todo' || e.topic === filter)
  return (
    <>
      <div className={secH}>
        <span className="flex items-center">
          <span className="eg-dot mr-1.5" />
          En directo
        </span>
        <Chips>
          {['Todo', 'Política', 'Mercados'].map((c) => (
            <Chip key={c} className="min-h-[34px]" pressed={filter === c} onClick={() => setFilter(c)}>
              {c}
            </Chip>
          ))}
        </Chips>
      </div>
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <OutlineBtn aria-pressed={auto} onClick={() => setAuto(!auto)}>
          Simular actualizaciones automáticas
        </OutlineBtn>
        <span className={meta}>Con el scroll abajo, las nuevas entradas no empujan el contenido: aparece un aviso.</span>
      </div>
      {pending.length > 0 && (
        <button
          className="mx-auto mb-3.5 block rounded-full border-0 bg-eg-accent px-4 py-2 text-[13px] font-semibold text-white"
          onClick={() => {
            setEntries([...[...pending].reverse(), ...entries])
            setPending([])
          }}
        >
          {pending.length} {pending.length > 1 ? 'nuevas actualizaciones' : 'nueva actualización'}
        </button>
      )}
      {list.length ? (
        <Timeline items={list} />
      ) : (
        <p className="font-serif text-[19px]">No hay entradas en este tema. Prueba con Todo.</p>
      )}
    </>
  )
}

const fm = (s: number) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0')
const TOT = 1440

function Media() {
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [play, setPlay] = useState(false)
  const [spd, setSpd] = useState(1)

  useEffect(() => {
    if (!play) return
    const t = setInterval(() => {
      setPos((p) => {
        const n = Math.min(TOT, p + spd)
        if (n >= TOT) setPlay(false)
        return n
      })
    }, 1000)
    return () => clearInterval(t)
  }, [play, spd])

  const ctl = 'size-11 rounded-full border border-eg-rule bg-transparent text-xs font-semibold'
  return (
    <>
      <div className={secH}>
        <span>Multimedia y pódcast</span>
        <span className={meta}>Reproducción simulada, sin audio real</span>
      </div>
      <div className="grid grid-cols-2 gap-6 max-[820px]:grid-cols-1">
        <div>
          <div
            className={cn(
              'relative grid aspect-video place-items-center overflow-hidden rounded',
              playing ? 'bg-[linear-gradient(135deg,#2c5b88,#14304c)]' : 'bg-[linear-gradient(135deg,#1f4163,#0e2238)]',
            )}
          >
            <button
              className="grid size-16 place-items-center rounded-full border-0 bg-white/[.92] text-[#14202B]"
              aria-label={playing ? 'Pausar video' : 'Reproducir video'}
              onClick={() => setPlaying(!playing)}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d={playing ? 'M6 5h4v14H6zM14 5h4v14h-4z' : 'M8 5v14l11-7z'} />
              </svg>
            </button>
            <span className="absolute right-2.5 bottom-2.5 rounded-[3px] bg-black/70 px-2 py-0.5 text-xs text-white">4:32</span>
          </div>
          <div className={h3}>Cinco minutos para entender la cumbre</div>
          <div className={meta}>Video · Redacción Global</div>
        </div>
        <div className={cn(box, 'grid gap-3')}>
          <div>
            <div className={meta}>Pódcast · Episodio 42</div>
            <div className={cn(h3, 'my-0.5')}>Leer despacio en la era de la prisa</div>
          </div>
          <div className="flex items-center gap-2.5">
            <div
              className="h-1.5 flex-1 cursor-pointer overflow-hidden rounded-[3px] bg-eg-surface"
              role="slider"
              tabIndex={0}
              aria-label="Progreso"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((pos / TOT) * 100)}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                setPos(Math.round(((e.clientX - r.left) / r.width) * TOT))
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') setPos(Math.min(TOT, pos + 15))
                if (e.key === 'ArrowLeft') setPos(Math.max(0, pos - 15))
              }}
            >
              <i className="block h-full bg-eg-accent" style={{ width: (pos / TOT) * 100 + '%' }} />
            </div>
            <span className={meta}>{fm(pos)} / 24:00</span>
          </div>
          <div className="flex items-center justify-center gap-2.5">
            <button className={ctl} aria-label="Retroceder 15 segundos" onClick={() => setPos(Math.max(0, pos - 15))}>
              −15
            </button>
            <button
              className={cn(ctl, 'border-eg-ink bg-eg-ink text-eg-bg')}
              aria-label={play ? 'Pausar' : 'Reproducir'}
              onClick={() => setPlay(!play)}
            >
              {play ? '❚❚' : '▶'}
            </button>
            <button className={ctl} aria-label="Avanzar 15 segundos" onClick={() => setPos(Math.min(TOT, pos + 15))}>
              +15
            </button>
            <button className={ctl} aria-label="Velocidad" onClick={() => setSpd(spd === 1 ? 1.5 : spd === 1.5 ? 2 : 1)}>
              {spd}x
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Data() {
  const [rn, setRn] = useState(14)
  const d = SERIES.slice(-rn)
  return (
    <>
      <div className={secH}>
        <span>Datos del día</span>
        <Chips>
          {[7, 14].map((n) => (
            <Chip key={n} className="min-h-[34px]" pressed={rn === n} onClick={() => setRn(n)}>
              {n} días
            </Chip>
          ))}
        </Chips>
      </div>
      <div className={box}>
        <div className={cn(h3, 'mt-0')}>Índice de confianza del consumidor</div>
        <div className={cn(meta, 'mb-2')}>Puntos, últimas dos semanas. Datos de ejemplo.</div>
        <LineChart
          data={d}
          left={36}
          domain={(x) => [Math.min(...x) - 2, Math.max(...x) + 2]}
          xLabel={(i) => String(i + 1)}
          showX={(i) => i % (rn > 7 ? 3 : 1) === 0}
          tip={(i) => `Día ${i + 1}: ${d[i]} puntos`}
          ariaLabel="Gráfico de línea del índice de confianza, con tendencia al alza"
        />
        <details>
          <summary className="cursor-pointer py-2 text-sm font-medium">Ver como tabla</summary>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-eg-rule px-2.5 py-2 text-left font-medium text-eg-muted">Día</th>
                <th className="border-b border-eg-rule px-2.5 py-2 text-left font-medium text-eg-muted">Valor</th>
              </tr>
            </thead>
            <tbody>
              {d.map((v, i) => (
                <tr key={i}>
                  <td className="border-b border-eg-rule px-2.5 py-2">Día {i + 1}</td>
                  <td className="border-b border-eg-rule px-2.5 py-2">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </>
  )
}

function Newsletter() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'ok'>('idle')
  const input = useRef<HTMLInputElement>(null)

  return (
    <>
      <div className={secH}>
        <span>Newsletter</span>
        <span className={meta}>Idle, error, cargando y éxito</span>
      </div>
      <div className="rounded bg-eg-surface p-8 max-[820px]:p-5">
        <div className={cn(h3, 'mt-0')}>El resumen del día, en tu correo</div>
        <p className={cn(meta, 'mb-3.5 text-sm')}>Cinco historias cada mañana. Puedes darte de baja cuando quieras.</p>
        {state === 'ok' ? (
          <div className="grid max-w-[480px] gap-3">
            <p className="m-0 font-semibold text-[#1f7a46]" role="status">
              Listo: recibirás el resumen mañana a primera hora.
            </p>
            <button
              type="button"
              className={cn(btn, 'justify-self-start border border-eg-rule bg-transparent text-eg-ink')}
              onClick={() => {
                setState('idle')
                setEmail('')
              }}
            >
              Probar de nuevo
            </button>
          </div>
        ) : (
          <form
            noValidate
            className="grid max-w-[480px] gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
              if (!ok) {
                setErr(email ? 'Escribe un correo válido, por ejemplo tu@correo.com' : 'Escribe tu correo para recibir el resumen')
                input.current?.focus()
                return
              }
              setErr('')
              setState('sending')
              setTimeout(() => setState('ok'), 1400)
            }}
          >
            <div className="flex flex-wrap gap-2">
              {[
                ['Mundo', true],
                ['Economía', true],
                ['Cultura', false],
              ].map(([t, c]) => (
                <label key={t as string} className="flex min-h-8 items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked={c as boolean} className="size-[18px] accent-eg-accent" /> {t}
                </label>
              ))}
            </div>
            <div>
              <label htmlFor="em" className="sr-only">
                Correo electrónico
              </label>
              <input
                ref={input}
                id="em"
                type="email"
                placeholder="tu@correo.com"
                aria-describedby="er"
                aria-invalid={!!err}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErr('')
                }}
                className={cn(
                  'w-full rounded border bg-eg-bg px-3.5 py-3 text-eg-ink',
                  err ? 'border-eg-accent' : 'border-eg-rule',
                )}
              />
              <div className="min-h-[18px] text-[13px] text-eg-accent" id="er" role="alert">
                {err}
              </div>
            </div>
            <button className={btn} disabled={state === 'sending'}>
              {state === 'sending' ? 'Enviando…' : 'Recibir resumen'}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
