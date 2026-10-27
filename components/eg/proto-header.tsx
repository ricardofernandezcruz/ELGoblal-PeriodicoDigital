'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/** Cabecera de las páginas de prototipo: logo, pestañas (rutas) y acciones. */
export function ProtoHeader({
  tabs,
  width = 'max-w-[1000px]',
  logoClass = 'text-[26px] max-[820px]:text-xl',
  tabClass = 'px-2.5 max-[820px]:px-1.5 max-[820px]:text-[13px]',
  className,
  children,
}: {
  tabs: { href: string; label: string }[]
  width?: string
  logoClass?: string
  tabClass?: string
  className?: string
  children?: React.ReactNode
}) {
  const path = usePathname()
  return (
    <header className={cn('sticky top-0 z-20 border-b border-eg-rule bg-eg-bg', className)}>
      <div className={cn('mx-auto flex h-14 items-center justify-between gap-2 px-5', width)}>
        <Link href="/" className={cn('font-serif font-semibold tracking-[-.02em] whitespace-nowrap', logoClass)}>
          El Global
        </Link>
        <nav className="scrollbar-none flex overflow-x-auto" aria-label="Páginas del prototipo">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={path === t.href ? 'page' : undefined}
              className={cn(
                'border-b-2 border-transparent py-4 text-sm font-medium whitespace-nowrap text-eg-muted',
                'aria-[current=page]:border-eg-accent aria-[current=page]:text-eg-ink',
                tabClass,
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-none gap-1.5">{children}</div>
      </div>
    </header>
  )
}

/** Botón con borde de las cabeceras de prototipo ("Tema", "Sin animación"). */
export function OutlineBtn({ className, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'h-10 min-w-10 rounded border border-eg-rule bg-transparent px-3 text-[13px] font-medium',
        'aria-pressed:bg-eg-ink aria-pressed:text-eg-bg',
        className,
      )}
      {...props}
    />
  )
}

export function Btn({ alt, className, ...props }: React.ComponentProps<'button'> & { alt?: boolean }) {
  return (
    <button
      className={cn(
        'min-h-10 rounded border-0 px-4 py-2.5 text-sm font-semibold disabled:opacity-60',
        alt ? 'border border-eg-rule bg-transparent text-eg-ink' : 'bg-eg-ink text-eg-bg hover:opacity-[.88]',
        className,
      )}
      {...props}
    />
  )
}
