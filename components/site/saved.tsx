'use client'

import Link from 'next/link'
import { ArtImg } from '@/components/eg/art'
import { Icon } from '@/components/eg/icon'
import { useToast } from '@/components/eg/toast'
import type { MenuItem } from '@/components/portada/site-header'
import { forgetReading, removeSaved, toggleSaved, useReading, useSaved, type ReadItem } from '@/lib/reading'
import { cn } from '@/lib/utils'
import { SiteChrome } from './chrome'

/** Botón «Guardar» de una nota. */
export function SaveButton({ item, className, label }: { item: Omit<ReadItem, 'at'>; className?: string; label?: boolean }) {
  const toast = useToast()
  const saved = useSaved().some((x) => x.id === item.id)
  return (
    <button
      type="button"
      className={className}
      aria-pressed={saved}
      aria-label={saved ? 'Quitar de guardadas' : 'Guardar para leer después'}
      title={saved ? 'Guardada' : 'Guardar para después'}
      onClick={() => toast(toggleSaved(item) ? 'Guardada. Encuéntrala en «Guardadas».' : 'Quitada de guardadas')}
    >
      <Icon name={saved ? 'bookmark2' : 'bookmark'} size={18} round={false} />
      {label && <span>{saved ? 'Guardada' : 'Guardar'}</span>}
    </button>
  )
}

/** Aviso en la portada: la última nota que se dejó a medias (de los últimos 3 días). */
export function ContinueReading({ className }: { className?: string }) {
  const item = useReading().find((x) => Date.now() - x.at < 3 * 864e5 && (x.p ?? 0) >= 5)
  if (!item) return null
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border border-eg-rule bg-eg-card p-2.5 pr-1.5', className)}>
      <Link href={item.href} className="group flex min-w-0 flex-1 items-center gap-3">
        {item.img && (
          <span className="h-12 w-16 flex-none overflow-hidden rounded bg-eg-surface">
            <ArtImg src={item.img} alt="" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold tracking-[.06em] text-eg-accent uppercase">Continúa leyendo</span>
          <span className="block truncate font-serif text-[16px] font-medium group-hover:underline group-hover:underline-offset-4">{item.title}</span>
          <span className="mt-1 block h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-eg-surface">
            <span className="block h-full rounded-full bg-eg-accent" style={{ width: (item.p ?? 0) + '%' }} />
          </span>
        </span>
      </Link>
      <button aria-label="Descartar" className="grid size-9 flex-none place-items-center rounded-md text-lg text-eg-muted hover:bg-eg-surface" onClick={() => forgetReading(item.id)}>
        ×
      </button>
    </div>
  )
}

function Row({ item, onRemove, progress }: { item: ReadItem; onRemove: () => void; progress?: boolean }) {
  return (
    <li className="flex items-center gap-4 border-b border-eg-rule py-4">
      <Link href={item.href} className="group flex min-w-0 flex-1 items-center gap-4">
        <span className="aspect-[4/3] w-28 flex-none overflow-hidden rounded bg-eg-surface max-[480px]:w-20">{item.img && <ArtImg src={item.img} alt="" />}</span>
        <span className="min-w-0">
          <span className="text-xs font-semibold text-eg-accent">{item.sec}</span>
          <span className="line-clamp-2 font-serif text-[19px] leading-[1.2] font-medium group-hover:underline group-hover:underline-offset-4">{item.title}</span>
          <span className="mt-1 block text-xs text-eg-muted">
            {progress ? `Leída al ${item.p ?? 0} %` : 'Guardada el ' + new Date(item.at).toLocaleDateString('es-DO', { day: 'numeric', month: 'long' })}
          </span>
        </span>
      </Link>
      <button aria-label="Quitar" className="grid size-10 flex-none place-items-center rounded-md text-eg-muted hover:bg-eg-surface hover:text-eg-ink" onClick={onRemove}>
        <Icon name="x" size={16} />
      </button>
    </li>
  )
}

export function SavedPage({ menu }: { menu: MenuItem[] }) {
  const saved = useSaved()
  const reading = useReading()
  return (
    <SiteChrome menu={menu} active="guardadas">
      <main className="mx-auto max-w-[760px] px-5 pt-8">
        <h1 className="m-0 border-b-2 border-eg-ink pb-3 font-serif text-[clamp(34px,5vw,48px)] leading-none font-medium">Guardadas</h1>
        <p className="mt-3 text-sm text-eg-muted">Se guardan en este navegador: no necesitas cuenta. Si cambias de celular o borras los datos, se pierden.</p>
        {reading.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-1 text-xs font-semibold tracking-[.08em] text-eg-muted uppercase">Continúa leyendo</h2>
            <ul className="m-0 list-none p-0">
              {reading.slice(0, 5).map((x) => (
                <Row key={x.id} item={x} progress onRemove={() => forgetReading(x.id)} />
              ))}
            </ul>
          </section>
        )}
        <section className="mt-8">
          <h2 className="mb-1 text-xs font-semibold tracking-[.08em] text-eg-muted uppercase">Para leer después</h2>
          {saved.length ? (
            <ul className="m-0 list-none p-0">
              {saved.map((x) => (
                <Row key={x.id} item={x} onRemove={() => removeSaved(x.id)} />
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-eg-rule px-6 py-12 text-center">
              <Icon name="bookmark" size={28} className="mx-auto mb-3 text-eg-muted" />
              <b className="block font-serif text-xl font-medium">Aún no guardaste nada</b>
              <p className="mx-auto mt-1 mb-4 max-w-[36ch] text-sm text-eg-muted">Toca el marcador en cualquier nota y aparecerá aquí para leerla cuando tengas tiempo.</p>
              <Link href="/" className="inline-flex min-h-11 items-center rounded bg-eg-ink px-5 text-sm font-semibold text-eg-bg">
                Ir a la portada
              </Link>
            </div>
          )}
        </section>
      </main>
    </SiteChrome>
  )
}
