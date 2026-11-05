import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

/* Marquee de shadcnspace (@shadcn-space/marquee-04, licencia MIT), adaptado:
   - las animaciones viven en app/globals.css (eg-marquee);
   - las copias repetidas se ocultan a lectores de pantalla y al teclado (inert);
   - con «reducir movimiento» no se anima: queda una fila que se desplaza con el dedo. */

interface MarqueeProps extends ComponentPropsWithoutRef<'div'> {
  /** Sentido contrario. */
  reverse?: boolean
  /** Se detiene con el ratón encima o con el foco dentro. */
  pauseOnHover?: boolean
  children: React.ReactNode
  /** Veces que se repite el contenido para que el bucle no tenga huecos. */
  repeat?: number
}

export function Marquee({ className, reverse = false, pauseOnHover = false, children, repeat = 3, ...props }: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        'group flex gap-(--gap) overflow-hidden [--duration:40s] [--gap:1rem] motion-reduce:scrollbar-none motion-reduce:overflow-x-auto',
        pauseOnHover && 'eg-marquee-pause',
        className,
      )}
    >
      {Array.from({ length: repeat }, (_, i) => (
        <div
          key={i}
          aria-hidden={i > 0 || undefined}
          inert={i > 0 || undefined}
          className={cn('eg-marquee flex shrink-0 justify-around gap-(--gap)', reverse && 'eg-marquee-reverse', i > 0 && 'motion-reduce:hidden')}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
