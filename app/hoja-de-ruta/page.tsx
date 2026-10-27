'use client'

import { useEffect, useState } from 'react'
import { h2, sub } from '@/components/contenido/styles'
import { MovilHeader } from '@/components/movil/movil-header'
import { cn } from '@/lib/utils'

const P: [string, string[]][] = [
  ['Fase 1 · Sistema de diseño', ['Colores, tipografía y modo oscuro', 'Tarjetas de nota (4 variantes)', 'Arreglar footer, panel e imágenes']],
  ['Fase 2 · Página de artículo', ['Columna de lectura y resumen', 'Herramientas de lectura', 'Comentarios y relacionados']],
  ['Fase 3 · Búsqueda y navegación', ['Buscador con atajo', 'Megamenú', 'Barra inferior en móvil']],
  ['Fase 4 · Personalización', ['Guardados', 'Sección Para ti', 'Newsletter']],
  ['Fase 5 · Contenido enriquecido', ['En directo', 'Multimedia y pódcast', 'Datos y gráficos']],
]

export default function Page() {
  const [st, setSt] = useState<Record<string, boolean>>({})
  useEffect(() => {
    try {
      setSt(JSON.parse(localStorage.getItem('eg-road') || '{}'))
    } catch {}
  }, [])
  const set = (k: string, v: boolean) => {
    const n = { ...st, [k]: v }
    setSt(n)
    try {
      localStorage.setItem('eg-road', JSON.stringify(n))
    } catch {}
  }
  const tot = P.reduce((a, p) => a + p[1].length, 0)
  const done = Object.values(st).filter(Boolean).length

  return (
    <>
      <MovilHeader />
      <main className="mx-auto max-w-[1000px] px-5 py-8">
        <h2 className={h2}>8. Orden de implementación</h2>
        <p className={cn(sub, 'max-w-[60ch]')}>Marca lo que ya tienes. El avance se guarda en este navegador.</p>
        <div className="mb-2 text-[13px] font-semibold text-eg-muted">
          {done} de {tot} tareas
        </div>
        <div className="mt-1.5 mb-5 h-2 overflow-hidden rounded bg-eg-surface">
          <i className="block h-full bg-eg-accent transition-[width] duration-200" style={{ width: (done / tot) * 100 + '%' }} />
        </div>
        {P.map(([title, items], i) => (
          <div key={title} className="mb-3 rounded border border-eg-rule bg-eg-card">
            <h3 className="m-0 flex justify-between gap-2.5 px-[18px] py-3.5 font-serif text-xl font-medium">
              {title}
              <span className="font-sans text-xs text-eg-muted">
                {items.filter((_, j) => st[i + '-' + j]).length}/{items.length}
              </span>
            </h3>
            <ul className="m-0 list-none px-[18px] pt-0 pb-3.5">
              {items.map((t, j) => {
                const k = i + '-' + j
                return (
                  <li key={k}>
                    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 py-[7px]">
                      <input
                        type="checkbox"
                        checked={!!st[k]}
                        onChange={(e) => set(k, e.target.checked)}
                        className="size-[18px] accent-eg-accent"
                      />
                      <span className={cn(st[k] && 'text-eg-muted line-through')}>{t}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </main>
    </>
  )
}
