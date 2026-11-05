'use client'

import { useCallback, useEffect, useState } from 'react'
import { removePushSubscription, savePushSubscription } from '@/app/actions'
import { Icon } from '@/components/eg/icon'
import { useToast } from '@/components/eg/toast'

/* App instalable y avisos de última hora (Web Push). */

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

const swReady = () => ('serviceWorker' in navigator ? navigator.serviceWorker.ready : Promise.reject())

/** Registra el service worker una vez por carga. */
export function useServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  }, [])
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

function keyBytes(b64: string) {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

export type PushState = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

/** Estado y cambio de los avisos de última hora en este navegador. */
export function usePush() {
  const toast = useToast()
  const [state, setState] = useState<PushState>('loading')

  useEffect(() => {
    if (!VAPID) return setState('unsupported')
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
      return setState(isIos() && !standalone() ? 'ios-install' : 'unsupported')
    if (Notification.permission === 'denied') return setState('denied')
    swReady()
      .then((r) => r.pushManager.getSubscription())
      .then((s) => setState(s ? 'on' : 'off'))
      .catch(() => setState('off'))
  }, [])

  const toggle = useCallback(async () => {
    if (state === 'ios-install') return toast('En iPhone: toca Compartir → «Añadir a pantalla de inicio», abre El Global desde ahí y activa los avisos.')
    if (state === 'unsupported') return toast('Este navegador no admite avisos.')
    if (state === 'denied') return toast('Bloqueaste los avisos. Actívalos en los ajustes del navegador para este sitio.')
    const reg = await swReady()
    if (state === 'on') {
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await removePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setState('off')
      return toast('Avisos desactivados')
    }
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      setState(perm === 'denied' ? 'denied' : 'off')
      return toast('No activamos los avisos.')
    }
    try {
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID!) })
      if (!(await savePushSubscription(sub.toJSON()))) throw new Error()
      setState('on')
      toast('Listo: te avisaremos solo de lo realmente urgente.')
    } catch {
      toast('No se pudieron activar los avisos. Inténtalo de nuevo.')
    }
  }, [state, toast])

  return { state, toggle }
}

/** Campana del header: activa o desactiva los avisos. */
export function PushButton({ className }: { className?: string }) {
  const { state, toggle } = usePush()
  if (state === 'loading' || state === 'unsupported') return null
  const on = state === 'on'
  return (
    <button className={className} aria-pressed={on} aria-label={on ? 'Desactivar avisos de última hora' : 'Recibir avisos de última hora'} title={on ? 'Avisos activados' : 'Avisos de última hora'} onClick={toggle}>
      <span className="relative">
        <Icon name="bell" size={20} strokeWidth={1.8} />
        {on && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-eg-accent ring-2 ring-eg-bg" />}
      </span>
    </button>
  )
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const DISMISS = 'eg-install-dismissed'

/** Invitación a instalar la app en el celular (a partir de la segunda visita y si no se cerró hace poco). */
export function InstallBanner() {
  const [ev, setEv] = useState<InstallEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (standalone() || !matchMedia('(max-width: 900px)').matches) return
    try {
      const until = Number(localStorage.getItem(DISMISS) ?? 0)
      if (until > Date.now()) return
      const visits = Number(localStorage.getItem('eg-visits') ?? 0) + 1
      localStorage.setItem('eg-visits', String(visits))
      if (visits < 2) return
    } catch {
      return
    }
    const on = (e: Event) => {
      e.preventDefault()
      setEv(e as InstallEvent)
      setShow(true)
    }
    addEventListener('beforeinstallprompt', on)
    if (isIos()) {
      setIos(true)
      setShow(true)
    }
    return () => removeEventListener('beforeinstallprompt', on)
  }, [])

  if (!show) return null
  const close = () => {
    setShow(false)
    try {
      localStorage.setItem(DISMISS, String(Date.now() + 30 * 864e5))
    } catch {}
  }
  return (
    <div role="dialog" aria-label="Instalar El Global" className="fixed inset-x-3 bottom-[72px] z-40 flex items-center gap-3 rounded-xl border border-eg-rule bg-eg-bg p-3 shadow-[0_12px_32px_rgba(0,0,0,.18)] min-[901px]:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" className="size-11 flex-none rounded-[10px]" />
      <div className="min-w-0 flex-1 text-[13px] leading-snug">
        <b className="block text-sm">El Global en tu pantalla de inicio</b>
        {ios ? <span className="text-eg-muted">Toca Compartir y luego «Añadir a pantalla de inicio».</span> : <span className="text-eg-muted">Ábrelo como una app, más rápido.</span>}
      </div>
      {!ios && ev && (
        <button
          className="min-h-10 rounded-md bg-eg-ink px-3.5 text-sm font-semibold text-eg-bg"
          onClick={async () => {
            await ev.prompt()
            await ev.userChoice.catch(() => null)
            close()
          }}
        >
          Instalar
        </button>
      )}
      <button aria-label="Cerrar" className="grid size-10 flex-none place-items-center rounded-md text-xl text-eg-muted" onClick={close}>
        ×
      </button>
    </div>
  )
}
