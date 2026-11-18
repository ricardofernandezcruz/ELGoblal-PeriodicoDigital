'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/* Bienvenida de temporada: un regalo que se abre y deja ver el periódico (El Global es el regalo).
   - Solo en la portada, una vez al día por visitante. El script del tema (app/layout.tsx) marca
     html[data-gift] antes de pintar, así la portada no asoma antes de la animación.
   - Se salta tocando en cualquier parte, con Esc o con «Saltar».
   - Con «reducir movimiento» no se muestra.
   - Para verla de nuevo: /?regalo=1 */

type Phase = 'in' | 'shake' | 'open' | 'reveal' | 'done'

const T = { shake: 900, open: 1750, reveal: 2250, done: 4300 }

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' })

export function GiftIntro({ from, to }: { from: string; to: string }) {
  const [phase, setPhase] = useState<Phase | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const burst = useRef<(() => void) | null>(null)

  const finish = useCallback(() => {
    timers.current.forEach(clearTimeout)
    setPhase('done')
    delete document.documentElement.dataset.gift
    try {
      localStorage.setItem('eg-gift', today())
    } catch {}
  }, [])

  // Arranque: solo si el script marcó la página y estamos en temporada.
  useEffect(() => {
    const d = document.documentElement.dataset.gift
    if (!d) return
    if (d < from || d > to) {
      delete document.documentElement.dataset.gift
      return
    }
    setPhase('in')
    const at = (ms: number, p: Phase) => timers.current.push(setTimeout(() => setPhase(p), ms))
    at(T.shake, 'shake')
    at(T.open, 'open')
    at(T.reveal, 'reveal')
    timers.current.push(setTimeout(finish, T.done))
    return () => timers.current.forEach(clearTimeout)
  }, [from, to, finish])

  // Saltar: abre ya y revela enseguida.
  const skip = useCallback(() => {
    if (!phase || phase === 'reveal' || phase === 'done') return
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPhase('open')
    timers.current.push(setTimeout(() => setPhase('reveal'), 280))
    timers.current.push(setTimeout(finish, 280 + 2000))
  }, [phase, finish])

  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && skip()
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [skip])

  // Al revelar, la página ya se puede usar aunque el confeti siga cayendo.
  useEffect(() => {
    if (phase === 'reveal') delete document.documentElement.dataset.gift
    if (phase === 'open') burst.current?.()
  }, [phase])

  // Nieve todo el rato y confeti al abrir, en un solo canvas.
  useEffect(() => {
    const c = canvas.current
    if (!c || !phase || phase === 'done') return
    const ctx = c.getContext('2d')!
    const dpr = Math.min(devicePixelRatio || 1, 2)
    const resize = () => {
      c.width = innerWidth * dpr
      c.height = innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    addEventListener('resize', resize)
    const W = () => innerWidth,
      H = () => innerHeight
    const snow = Array.from({ length: Math.round(Math.min(110, W() / 9)) }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      r: 0.8 + Math.random() * 2.2,
      v: 0.3 + Math.random() * 0.9,
      w: Math.random() * Math.PI * 2,
    }))
    type Bit = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number; c: string; life: number }
    const bits: Bit[] = []
    const COLORS = ['#F2D27A', '#E8B54A', '#C62D24', '#FFFFFF', '#2E8B57', '#F7F3EC']
    burst.current = () => {
      const r = box.current?.getBoundingClientRect()
      const ox = r ? r.left + r.width / 2 : W() / 2
      const oy = r ? r.top + r.height * 0.25 : H() / 2
      for (let i = 0; i < 170; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15
        const sp = 6 + Math.random() * 10
        bits.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, w: 5 + Math.random() * 6, h: 3 + Math.random() * 5, c: COLORS[i % COLORS.length], life: 1 })
      }
    }
    let raf = 0
    let fade = 1
    const loop = () => {
      ctx.clearRect(0, 0, W(), H())
      if (root.current?.dataset.phase === 'reveal') fade = Math.max(0, fade - 0.012)
      ctx.globalAlpha = 0.85 * fade
      ctx.fillStyle = '#fff'
      for (const s of snow) {
        s.y += s.v
        s.w += 0.01
        s.x += Math.sin(s.w) * 0.4
        if (s.y > H() + 4) {
          s.y = -4
          s.x = Math.random() * W()
        }
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      for (const b of bits) {
        b.vy += 0.22
        b.vx *= 0.985
        b.vy *= 0.985
        b.x += b.vx
        b.y += b.vy
        b.rot += b.vr
        if (b.y > H() * 0.55) b.life -= 0.012
        ctx.globalAlpha = Math.max(0, Math.min(1, b.life))
        ctx.save()
        ctx.translate(b.x, b.y)
        ctx.rotate(b.rot)
        ctx.fillStyle = b.c
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.rot * 2)) + 1)
        ctx.restore()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
    }
    // El canvas vive mientras dure la animación; no hay que reiniciarlo en cada fase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === null || phase === 'done'])

  if (phase === 'done') return null
  return (
    <div ref={root} className={phase ? 'eg-gift is-on' : 'eg-gift'} data-phase={phase ?? 'in'} onClick={skip} role="presentation">
      <div className="eg-gift-veil" />
      <canvas ref={canvas} className="eg-gift-fx" aria-hidden="true" />
      <div className="eg-gift-stage" aria-hidden="true">
        <p className="eg-gift-kicker">Feliz Navidad</p>
        <p className="eg-gift-title">Tenemos un regalo para ti</p>
        <div ref={box} className="eg-gift-box">
          <div className="eg-gift-rays" />
          <div className="eg-gift-light" />
          <div className="eg-gift-body" />
          <div className="eg-gift-lid">
            <div className="eg-gift-bow">
              <span />
              <span />
              <i />
            </div>
          </div>
          <div className="eg-gift-tag">
            <small>Para ti</small>
            <b>El Global</b>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="eg-gift-skip"
        onClick={(e) => {
          e.stopPropagation()
          skip()
        }}
      >
        Saltar
      </button>
    </div>
  )
}
