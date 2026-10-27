import { cn } from '@/lib/utils'

/** Chip de filtro: el estado se comunica con aria-pressed (guía §5.6). */
export function Chip({
  pressed,
  className,
  ...props
}: React.ComponentProps<'button'> & { pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'rounded-full border border-eg-rule bg-transparent px-3.5 py-1.5 text-[13px] font-medium',
        'aria-pressed:border-eg-ink aria-pressed:bg-eg-ink aria-pressed:text-eg-bg',
        className,
      )}
      {...props}
    />
  )
}

export function Chips({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-wrap gap-2', className)} {...props} />
}
