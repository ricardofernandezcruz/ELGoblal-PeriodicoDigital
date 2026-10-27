'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Toast = (message: string) => void
const ToastContext = createContext<Toast>(() => {})

export const useToast = () => useContext(ToastContext)

/** Aviso centrado abajo, fondo --ink, role="status" (guía §5.13). */
export function ToastProvider({
  children,
  duration = 2200,
  className,
}: {
  children: React.ReactNode
  duration?: number
  className?: string
}) {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const toast = useCallback<Toast>(
    (m) => {
      setMsg(m)
      setShow(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setShow(false), duration)
    },
    [duration],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        role="status"
        className={cn(
          'pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md bg-eg-ink px-4 py-2.5 text-sm text-eg-bg transition-opacity duration-200',
          show ? 'opacity-100' : 'opacity-0',
          className,
        )}
      >
        {msg}
      </div>
    </ToastContext.Provider>
  )
}
