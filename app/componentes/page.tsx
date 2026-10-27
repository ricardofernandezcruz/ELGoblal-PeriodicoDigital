'use client'

import { useState } from 'react'
import { ArticleHeader, MiniFooter } from '@/components/articulo/article-header'
import { ArtFrame } from '@/components/eg/art'
import { Chip, Chips } from '@/components/eg/chip'
import { ToastProvider, useToast } from '@/components/eg/toast'
import { cn } from '@/lib/utils'

const tag = 'text-xs font-semibold text-eg-accent'
const h3 = 'my-1.5 font-serif text-xl leading-[1.2] font-medium group-hover:underline group-hover:underline-offset-4'
const meta = 'text-xs text-eg-muted'
const secH = 'mt-10 mb-5 border-b-2 border-eg-ink pb-2 font-serif text-[26px] font-medium'
const btn = 'rounded border-0 bg-eg-ink px-4 py-2.5 text-sm font-semibold text-eg-bg hover:opacity-[.88]'
const btnAlt = 'rounded border border-eg-rule bg-transparent px-4 py-2.5 text-sm font-semibold text-eg-ink'

export default function Page() {
  return (
    <ToastProvider>
      <ArticleHeader />
      <Components />
      <MiniFooter />
    </ToastProvider>
  )
}

function SkeletonCard() {
  return (
    <div>
      <div className="eg-sk aspect-video" />
      <div className="eg-sk mt-3 mb-2 h-3 w-[30%]" />
      <div className="eg-sk mb-1.5 h-5 w-[95%]" />
      <div className="eg-sk h-5 w-[70%]" />
    </div>
  )
}

function Components() {
  const toast = useToast()
  const [filter, setFilter] = useState('Hoy')
  const [sk, setSk] = useState<'idle' | 'loading' | 'done'>('idle')
  const [cookie, setCookie] = useState(false)

  return (
    <div className="mx-auto max-w-[1100px] px-5 pt-9 pb-5">
      <h2 className={cn(secH, 'mt-0')}>Tarjetas de nota</h2>
      <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] items-start gap-6 max-[800px]:grid-cols-1">
        <a href="/articulo" className="group">
          <ArtFrame src="mercados" />
          <span className={cn(tag, 'mt-2.5 block')}>Economía</span>
          <div className={cn(h3, 'text-[30px]')}>Los mercados miran a Europa ante un nuevo ciclo de inversión</div>
          <p className="m-0 font-serif text-lg leading-[1.4] text-eg-muted">Qué cambia para los inversores pequeños.</p>
        </a>
        <a href="/articulo" className="group">
          <ArtFrame src="ia" />
          <span className={cn(tag, 'mt-2.5 block')}>Tecnología</span>
          <div className={h3}>La IA cambia la forma de leer</div>
          <div className={meta}>Hace 1 h</div>
        </a>
        <a href="/articulo" className="group flex gap-2.5">
          <ArtFrame src="arte" className="aspect-square w-[90px] flex-none" />
          <div>
            <span className={tag}>Cultura</span>
            <div className={cn(h3, 'my-0.5 text-[17px]')}>Arte latinoamericano en galerías</div>
          </div>
        </a>
        <a href="/articulo" className="group border-t-2 border-eg-ink pt-2.5">
          <span className={tag}>Opinión</span>
          <div className={h3}>Leer despacio es resistencia informativa</div>
          <div className={meta}>Marta Quiroga</div>
        </a>
      </div>
      <p className={cn(meta, 'mt-4')}>Hero · media · compacta con miniatura · solo texto</p>

      <h2 className={secH}>Etiquetas y chips de filtro</h2>
      <div className="flex flex-wrap items-center gap-5">
        <span className={tag}>Mundo</span>
        <span className={tag}>Economía</span>
        <Chips>
          {['Hoy', 'Esta semana', 'Más leído'].map((c) => (
            <Chip key={c} pressed={filter === c} onClick={() => setFilter(c)}>
              {c}
            </Chip>
          ))}
        </Chips>
      </div>

      <h2 className={secH}>Skeletons de carga</h2>
      <button
        className={cn(btnAlt, 'mb-4')}
        onClick={() => {
          setSk('loading')
          setTimeout(() => setSk('done'), 2500)
        }}
      >
        Simular carga
      </button>
      <div className="grid grid-cols-3 gap-6 max-[800px]:grid-cols-1" aria-busy={sk === 'loading' || undefined}>
        {sk === 'loading' && [0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        {sk === 'done' && <p className={cn(meta, 'col-span-full')}>Contenido cargado.</p>}
      </div>

      <h2 className={secH}>Toasts y banner de cookies</h2>
      <div className="flex flex-wrap gap-2.5">
        <button className={btn} onClick={() => toast('Nota guardada')}>
          Guardar nota
        </button>
        <button className={btnAlt} onClick={() => toast('Enlace copiado')}>
          Copiar enlace
        </button>
        <button className={btnAlt} onClick={() => setCookie(true)}>
          Mostrar banner de cookies
        </button>
      </div>

      {cookie && (
        <div className="fixed right-4 bottom-4 left-4 z-40 flex max-w-[560px] flex-wrap items-center gap-3.5 rounded-lg border border-eg-rule bg-eg-card p-4 text-sm shadow-[0_8px_30px_rgba(0,0,0,.18)]">
          <span className="min-w-[200px] flex-1">
            Usamos cookies para recordar tus preferencias y medir la audiencia. Puedes cambiarlo cuando quieras.
          </span>
          <button className={btnAlt} onClick={() => setCookie(false)}>
            Configurar
          </button>
          <button
            className={btn}
            onClick={() => {
              setCookie(false)
              toast('Preferencias guardadas')
            }}
          >
            Aceptar
          </button>
        </div>
      )}
    </div>
  )
}
