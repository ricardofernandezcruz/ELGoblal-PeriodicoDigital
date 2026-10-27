'use client'

import { useRef, useState } from 'react'
import { h2, sub } from '@/components/contenido/styles'
import { Chip } from '@/components/eg/chip'
import { OutlineBtn } from '@/components/eg/proto-header'
import { ToastProvider, useToast } from '@/components/eg/toast'
import { MovilHeader } from '@/components/movil/movil-header'
import { cn } from '@/lib/utils'

/* Degradados de la simulación de teléfono */
const IMG: Record<string, string> = {
  i1: 'bg-[linear-gradient(180deg,#0e2238,#1f4163_55%,#c98a4a)]',
  i3: 'bg-[linear-gradient(135deg,#C9B8A6,#B1A292)]',
  i4: 'bg-[linear-gradient(135deg,#AEBFCA,#98AAB6)]',
  '': 'bg-[linear-gradient(135deg,#CFD6D6,#A9B4BA)]',
}

const N: Record<string, [string, string, string][]> = {
  Portada: [
    ['Geopolítica', 'El mundo reordena sus prioridades ante una nueva era de incertidumbre', 'i1'],
    ['Economía', 'Los mercados miran a Europa ante un nuevo ciclo de inversión', 'i3'],
    ['Tecnología', 'La inteligencia artificial cambia la forma de leer las noticias', 'i4'],
    ['Cultura', 'El arte latinoamericano que conquista las galerías', ''],
  ],
  Mundo: [
    ['Mundo', 'Una conversación pendiente: las ciudades que buscan reinventarse', 'i4'],
    ['Mundo', 'El mapa de las nuevas alianzas que redefinen el tablero', 'i1'],
  ],
  Economía: [
    ['Economía', 'Los mercados miran a Europa ante un nuevo ciclo de inversión', 'i3'],
    ['Economía', 'Guía para entender la economía de este otoño', ''],
  ],
  Tecnología: [['Tecnología', 'La inteligencia artificial cambia la forma de leer', 'i4']],
  Cultura: [['Cultura', 'El arte latinoamericano que conquista las galerías', '']],
  Deportes: [['Deportes', 'Una jornada decisiva sacude la tabla de posiciones', 'i3']],
}

const RULES = [
  ['Una columna', 'Titular de 28 px y cuerpo de 17 a 19 px; nada se corta ni obliga a hacer zoom.'],
  ['Chips de sección', 'Scroll horizontal con el chip activo visible; altura de 36 px dentro de una barra de 56 px.'],
  ['Zona del pulgar', 'Las acciones frecuentes van abajo (inicio, buscar, guardados); arriba solo marca y búsqueda.'],
  ['Objetivos táctiles', 'Mínimo de 44 px de alto en botones y filas; la barra inferior mide 52 px.'],
  ['Sin saltos de diseño', 'Imágenes con relación de aspecto fija: el skeleton y la foto ocupan el mismo espacio.'],
]

export default function Page() {
  return (
    <ToastProvider duration={2000}>
      <MovilHeader />
      <main className="mx-auto max-w-[1000px] px-5 py-8">
        <h2 className={h2}>6. Versión móvil</h2>
        <p className={cn(sub, 'max-w-[60ch]')}>
          Una columna, secciones en chips con scroll horizontal y acciones en la zona del pulgar. Prueba el teléfono:
          desplázate, filtra y simula la carga.
        </p>
        <Phone />
      </main>
    </ToastProvider>
  )
}

function Phone() {
  const toast = useToast()
  const [sec, setSec] = useState('Portada')
  const [thumb, setThumb] = useState(false)
  const [loading, setLoading] = useState(false)
  const scr = useRef<HTMLDivElement>(null)
  const tt = thumb ? 'outline outline-1 -outline-offset-1 outline-dashed outline-[#d4a017]' : ''

  const pick = (k: string) => {
    setSec(k)
    if (scr.current) scr.current.scrollTop = 0
  }

  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-10 max-[820px]:grid-cols-1">
      <div
        className="relative mx-auto flex h-[660px] w-[340px] max-w-full flex-col overflow-hidden rounded-[36px] border-[10px] border-eg-ink bg-eg-bg"
        aria-label="Simulación de teléfono"
      >
        <div ref={scr} className="relative flex-1 overflow-y-auto">
          <div className="sticky top-0 z-[3] flex h-12 items-center justify-between border-b border-eg-rule bg-eg-bg pr-2 pl-3.5">
            <span className="font-serif text-[22px] font-semibold tracking-[-.02em]">El Global</span>
            <button
              className={cn('h-10 rounded border-0 bg-transparent px-2.5 text-[13px] font-medium', tt)}
              aria-label="Buscar"
              onClick={() => toast('Buscar: se abre a pantalla completa')}
            >
              Buscar
            </button>
          </div>
          <div className="scrollbar-none sticky top-12 z-[3] flex gap-2 overflow-x-auto border-b border-eg-rule bg-eg-bg px-3.5 py-2.5">
            {Object.keys(N).map((k) => (
              <Chip key={k} pressed={sec === k} onClick={() => pick(k)} className={cn('min-h-9 flex-none py-0', tt)}>
                {k}
              </Chip>
            ))}
          </div>
          <div className="p-3.5">
            {loading
              ? [0, 1].map((i) => (
                  <div key={i} className="py-3.5">
                    <div className="eg-sk aspect-video" />
                    <div className="eg-sk mt-3 mb-2 h-3 w-[30%]" />
                    <div className="eg-sk mb-1.5 h-[26px] w-[95%]" />
                    <div className="eg-sk h-[26px] w-[70%]" />
                  </div>
                ))
              : N[sec].map((n, i) =>
                  i === 0 ? (
                    <a key={n[1]} href="#" onClick={(e) => e.preventDefault()} className={cn('block', tt)}>
                      <div className={cn('aspect-video rounded-[2px]', IMG[n[2]])} />
                      <span className="mt-2.5 mb-1 block text-xs font-semibold text-eg-accent">{n[0]}</span>
                      <h3 className="mb-2 font-serif text-[28px] leading-[1.1] font-medium tracking-[-.01em]">{n[1]}</h3>
                      <div className="text-xs text-eg-muted">Hace 18 min · 8 min de lectura</div>
                    </a>
                  ) : (
                    <a
                      key={n[1]}
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className={cn('flex gap-3 border-t border-eg-rule py-3.5', tt)}
                    >
                      <div className={cn('aspect-square w-24 flex-none rounded-[2px]', IMG[n[2]])} />
                      <div>
                        <span className="block text-xs font-semibold text-eg-accent">{n[0]}</span>
                        <h3 className="m-0 font-serif text-lg leading-[1.2] font-medium">{n[1]}</h3>
                        <div className="mt-1 text-xs text-eg-muted">Hace {i * 20 + 10} min</div>
                      </div>
                    </a>
                  ),
                )}
          </div>
        </div>
        {thumb && (
          <div className="pointer-events-none absolute right-0 bottom-[52px] left-0 z-[5] h-[34%] border-t-2 border-dashed border-[#2a9d5a] bg-[rgba(40,160,90,.18)] px-2 py-1 text-[11px] text-[#1b6b3d]">
            Zona del pulgar
          </div>
        )}
        <nav className="flex flex-none border-t border-eg-rule bg-eg-bg" aria-label="Navegación">
          {['Inicio', 'Secciones', 'Buscar', 'Guardados', 'Perfil'].map((b, i) => (
            <button
              key={b}
              onClick={() => i && toast(b)}
              className={cn(
                'grid min-h-[52px] flex-1 place-items-center border-0 bg-transparent text-[11px]',
                i === 0 ? 'text-eg-accent' : 'text-eg-muted',
                tt,
              )}
            >
              {b}
            </button>
          ))}
        </nav>
      </div>

      <div>
        <div className="mb-5 flex flex-wrap gap-2">
          <OutlineBtn aria-pressed={thumb} onClick={() => setThumb(!thumb)}>
            Ver zona del pulgar y objetivos táctiles
          </OutlineBtn>
          <button
            className="rounded border-0 bg-eg-ink px-4 py-2.5 text-sm font-semibold text-eg-bg"
            onClick={() => {
              setLoading(true)
              setTimeout(() => setLoading(false), 2200)
            }}
          >
            Simular carga
          </button>
        </div>
        <div className="grid gap-2.5 text-[15px]">
          {RULES.map(([t, d]) => (
            <div key={t} className="rounded bg-eg-surface px-3.5 py-3">
              <b className="block text-sm">{t}</b>
              {d}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
