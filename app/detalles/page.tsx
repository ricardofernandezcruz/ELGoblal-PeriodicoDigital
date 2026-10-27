'use client'

import { useState } from 'react'
import { box, h2, sub } from '@/components/contenido/styles'
import { Chip } from '@/components/eg/chip'
import { OutlineBtn } from '@/components/eg/proto-header'
import { MovilHeader } from '@/components/movil/movil-header'
import { cn } from '@/lib/utils'

const lab = 'mb-2 text-[13px] font-semibold text-eg-muted'
const btn = 'rounded border-0 bg-eg-ink px-4 py-2.5 text-sm font-semibold text-eg-bg'
const PRESETS = [
  ['Texto principal', '#14202B', '#F7F3EC'],
  ['Metadatos', '#5B6470', '#F7F3EC'],
  ['Acento', '#B3261E', '#F7F3EC'],
  ['Botón rojo', '#FFFFFF', '#B3261E'],
  ['Gris claro (falla)', '#9AA3AE', '#F7F3EC'],
]

function lum(h: string) {
  const c = [1, 3, 5]
    .map((i) => parseInt(h.substr(i, 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

export default function Page() {
  const [pg, setPg] = useState(0)
  const [f, setF] = useState('#14202B')
  const [b, setB] = useState('#F7F3EC')
  const a = lum(f),
    c = lum(b),
    r = (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05)
  const badge = (t: string, ok: boolean) => (
    <span
      className={cn(
        'mr-1.5 inline-block rounded-full px-2.5 py-[3px] text-xs font-semibold text-white',
        ok ? 'bg-[#1f7a46]' : 'bg-[#a32a22]',
      )}
    >
      {t} {ok ? 'cumple' : 'no cumple'}
    </span>
  )
  const page = 'absolute inset-0 bg-eg-bg p-4 transition-[opacity,transform] duration-200 ease-[ease]'

  return (
    <>
      <MovilHeader />
      <main className="mx-auto max-w-[1000px] px-5 py-8">
        <h2 className={h2}>7. Detalles modernos</h2>
        <p className={cn(sub, 'max-w-[60ch]')}>
          Movimiento sutil que responde a una acción, transiciones cortas, foco visible y contraste comprobable.
        </p>
        <div className="grid grid-cols-2 gap-6 max-[820px]:grid-cols-1">
          <div className={box}>
            <p className={lab}>Subrayado animado (200 ms)</p>
            <a href="#" onClick={(e) => e.preventDefault()} className="group">
              <span className="inline bg-[linear-gradient(var(--eg-accent),var(--eg-accent))] bg-[length:0_2px] bg-[0_100%] bg-no-repeat font-serif text-[26px] leading-[1.15] font-medium transition-[background-size] duration-200 ease-out group-hover:bg-[length:100%_2px] group-focus-visible:bg-[length:100%_2px]">
                El mundo reordena sus prioridades ante una nueva era
              </span>
            </a>
            <p className="mt-3 text-xs text-eg-muted">Pasa el cursor o usa Tab. Solo cambia el subrayado, no el tamaño.</p>
          </div>

          <div className={box}>
            <p className={lab}>Transición entre páginas</p>
            <div className="relative my-3 h-[110px] overflow-hidden rounded border border-eg-rule">
              <div className={cn(page, pg && 'pointer-events-none -translate-x-4 opacity-0')}>
                <b className="font-serif text-xl font-medium">Portada</b>
                <div className="text-xs text-eg-muted">Página A</div>
              </div>
              <div className={cn(page, !pg && 'translate-x-4 opacity-0')}>
                <b className="font-serif text-xl font-medium">Artículo</b>
                <div className="text-xs text-eg-muted">Página B</div>
              </div>
            </div>
            <button className={btn} onClick={() => setPg(pg ^ 1)}>
              Cambiar de página
            </button>
          </div>

          <div className={box}>
            <p className={lab}>Foco visible con teclado</p>
            <div className="flex flex-wrap gap-2">
              <button className={btn}>Suscribirme</button>
              <OutlineBtn>Guardar</OutlineBtn>
              <OutlineBtn>Compartir</OutlineBtn>
            </div>
            <p className="mt-3 text-xs text-eg-muted">Pulsa Tab: cada control muestra un anillo de 2 px con el color de acento.</p>
          </div>

          <div className={box}>
            <p className={lab}>Movimiento reducido</p>
            <p className="mb-2.5 text-[15px]">
              El botón &quot;Sin animación&quot; de arriba pone todas las duraciones en 0 ms. También se respeta la
              preferencia del sistema.
            </p>
            <div className="eg-sk mb-2 h-3.5 w-[80%]" />
            <div className="eg-sk h-3.5 w-[55%]" />
          </div>

          <div className={cn(box, 'col-span-full')}>
            <p className={lab}>Comprobador de contraste (mínimo AA: 4.5:1 texto normal)</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(([t, pf, pb]) => (
                <Chip
                  key={t}
                  className="min-h-9"
                  onClick={() => {
                    setF(pf)
                    setB(pb)
                  }}
                >
                  {t}
                </Chip>
              ))}
            </div>
            <div className="my-2.5 grid grid-cols-2 gap-2.5">
              <label className="text-[13px] text-eg-muted">
                Texto
                <input
                  type="color"
                  value={f.toLowerCase()}
                  onChange={(e) => setF(e.target.value)}
                  className="h-10 w-full rounded border border-eg-rule bg-transparent p-0.5"
                />
              </label>
              <label className="text-[13px] text-eg-muted">
                Fondo
                <input
                  type="color"
                  value={b.toLowerCase()}
                  onChange={(e) => setB(e.target.value)}
                  className="h-10 w-full rounded border border-eg-rule bg-transparent p-0.5"
                />
              </label>
            </div>
            <div className="rounded border border-eg-rule p-4 font-serif text-xl font-medium" style={{ color: f, background: b }}>
              Los mercados miran a Europa
            </div>
            <p className="mt-3 mb-0 flex flex-wrap items-center gap-y-1.5">
              <span className="mr-2 text-[22px] font-semibold">{r.toFixed(2)}:1</span>
              {badge('AA texto', r >= 4.5)}
              {badge('AA texto grande', r >= 3)}
              {badge('AAA', r >= 7)}
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
