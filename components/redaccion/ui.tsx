'use client'

import { useEffect, useRef } from 'react'
import { Icon, type IconName } from '@/components/eg/icon'
import { cn } from '@/lib/utils'
import { ST, type Status } from './data'

type BtnProps = React.ComponentProps<'button'> & { v?: 'ink' | 'out' | 'acc' | 'ghost'; sm?: boolean; ic?: boolean }

export const btnClass = ({ v = 'ink', sm, ic }: Pick<BtnProps, 'v' | 'sm' | 'ic'>) =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-lg border border-transparent font-semibold whitespace-nowrap disabled:pointer-events-none disabled:opacity-50',
    sm ? 'h-[30px] px-2.5 text-[13px]' : 'h-[38px] px-3.5',
    ic && (sm ? 'w-[30px] px-0' : 'w-[38px] px-0'),
    v === 'ink' && 'bg-eg-ink text-eg-bg hover:brightness-[1.12]',
    v === 'acc' && 'bg-eg-accent text-white hover:brightness-[1.12]',
    v === 'out' && 'border-eg-rule bg-eg-panel text-eg-ink hover:bg-eg-soft',
    v === 'ghost' && 'bg-transparent text-eg-ink hover:bg-eg-soft',
  )

export function B({ v, sm, ic, className, type = 'button', ...props }: BtnProps) {
  return <button type={type} className={cn(btnClass({ v, sm, ic }), className)} {...props} />
}

export const I = ({ n, className }: { n: IconName; className?: string }) => <Icon name={n} className={className} />

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('rounded-xl border border-eg-rule bg-eg-panel', className)} {...props} />
}
export const cp = 'p-[18px]'
export const h3 = 'm-0 font-serif text-[17px] font-semibold'
export const sub = 'text-xs text-eg-muted'
export const pageTitle = 'm-0 font-serif text-[28px] font-semibold'
export const inp = 'h-[38px] w-full rounded-lg border border-eg-rule bg-eg-panel px-[11px] aria-[invalid=true]:border-eg-accent'
export const ta = 'min-h-[84px] w-full resize-y rounded-lg border border-eg-rule bg-eg-panel px-[11px] py-[9px] leading-[1.55]'
export const lab = 'text-[13px] font-semibold'
export const hint = 'text-xs text-eg-muted'
export const chk = 'size-4 accent-eg-accent'

const BADGE: Record<string, string> = {
  pub: 'bg-eg-ok/16 text-eg-ok',
  sch: 'bg-eg-info/16 text-eg-info',
  rev: 'bg-eg-warn/18 text-eg-warn',
  er: 'bg-eg-accent/16 text-eg-accent',
  draft: '',
}

export function Badge({ k = '', className, children }: { k?: string; className?: string; children?: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[5px] rounded-full bg-eg-soft px-2.5 py-px text-xs font-semibold text-eg-muted',
        BADGE[k],
        className,
      )}
    >
      {children}
    </span>
  )
}
export const StatusBadge = ({ st }: { st: Status }) => <Badge k={st}>{ST[st]}</Badge>

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <span className="relative h-[22px] w-[38px] flex-none">
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 z-[1] m-0 cursor-pointer opacity-0"
      />
      <i className="absolute inset-0 rounded-full bg-eg-rule transition-colors duration-150 peer-checked:bg-eg-ok after:absolute after:top-[3px] after:left-[3px] after:size-4 after:rounded-full after:bg-white after:transition-transform after:duration-150 after:content-[''] peer-checked:after:translate-x-4" />
    </span>
  )
}

export function Row2({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('flex items-center justify-between gap-3 py-2', className)} {...props} />
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: [T, string][]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-eg-rule" role="group" aria-label={label}>
      {options.map(([k, l]) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
          className="border-0 bg-eg-panel px-3 py-1.5 text-[13px] font-medium aria-pressed:bg-eg-ink aria-pressed:text-eg-bg"
        >
          {l}
        </button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({
  value,
  tabs,
  onChange,
}: {
  value: T
  tabs: [T, React.ReactNode][]
  onChange: (v: T) => void
}) {
  return (
    <div className="scrollbar-none flex gap-0.5 overflow-auto border-b border-eg-rule" role="tablist">
      {tabs.map(([k, l]) => (
        <button
          key={k}
          role="tab"
          type="button"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className="border-0 border-b-2 border-transparent bg-transparent px-3.5 py-2.5 font-semibold whitespace-nowrap text-eg-muted aria-selected:border-eg-accent aria-selected:text-eg-ink"
        >
          {l}
        </button>
      ))}
    </div>
  )
}

export function Chip({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-full border border-eg-rule bg-eg-panel px-3 py-1 text-[13px] font-medium',
        className,
      )}
      {...props}
    />
  )
}

export const QL = ({ className, ...props }: React.ComponentProps<'ul'>) => (
  <ul className={cn('m-0 list-none p-0 [&>li]:flex [&>li]:items-start [&>li]:gap-2.5 [&>li]:border-b [&>li]:border-eg-rule [&>li]:py-2', className)} {...props} />
)

export const Empty = ({ title, children }: { title: string; children?: React.ReactNode }) => (
  <div className="px-4 py-9 text-center text-eg-muted">
    <b className="mb-1 block font-serif text-lg font-semibold text-eg-ink">{title}</b>
    {children}
  </div>
)

export const Sp = () => <span className="flex-1" />

export function Overlay({
  onClose,
  className,
  label,
  children,
}: {
  onClose: () => void
  className?: string
  label?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn('fixed inset-0 z-[80] flex overflow-auto bg-[rgba(10,16,23,.55)]', className)}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  )
}

/** Diálogo modal: enfoca el primer control al abrir. */
export function Dialog({ wide, onClose, children }: { wide?: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('input,button')?.focus()
    return () => prev?.focus?.()
  }, [])
  return (
    <Overlay onClose={onClose}>
      <div
        ref={ref}
        className={cn(
          'm-auto rounded-[14px] border border-eg-rule bg-eg-panel p-[22px] shadow-[0_24px_60px_rgba(0,0,0,.35)]',
          wide ? 'w-[min(760px,94vw)]' : 'w-[min(520px,94vw)]',
        )}
      >
        {children}
      </div>
    </Overlay>
  )
}
export const DlgTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-1.5 font-serif text-xl font-semibold">{children}</h3>
)
export const DlgRow = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div className={cn('mt-4 flex flex-wrap justify-end gap-2', className)} {...props} />
)

export const Thumb = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <div className={cn('h-9 w-14 flex-none overflow-hidden rounded-[5px] bg-eg-soft', className)}>{children}</div>
)

export const Tbl = ({ className, ...props }: React.ComponentProps<'table'>) => (
  <table
    className={cn(
      'w-full border-collapse [&_td]:border-b [&_td]:border-eg-rule [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:align-middle [&_th]:border-b [&_th]:border-eg-rule [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:whitespace-nowrap [&_th]:text-eg-muted [&_tbody_tr:hover]:bg-eg-soft',
      className,
    )}
    {...props}
  />
)
