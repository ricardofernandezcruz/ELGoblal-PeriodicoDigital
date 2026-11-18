'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { adView } from '@/app/actions'
import { PLACEMENTS, type AdCreative, type AdMap, type Placement, type PublicAd } from '@/lib/ads-shared'
import { cn } from '@/lib/utils'

/* Anuncios del sitio. Reglas que no se pueden saltar desde el panel:
   - siempre con la etiqueta «Publicidad» y el enlace marcado como patrocinado;
   - hueco reservado con el formato del espacio (la página no salta al cargar);
   - videos sin sonido, que solo se reproducen mientras están a la vista;
   - con «reducir movimiento», los videos no arrancan solos. */

const AdsContext = createContext<AdMap>({})
export const AdsProvider = ({ ads, children }: { ads?: AdMap; children: React.ReactNode }) => <AdsContext.Provider value={ads ?? {}}>{children}</AdsContext.Provider>

const MOBILE = '(max-width: 640px)'

/** Elige una campaña al azar según su peso (en el navegador, para que rote en cada visita). */
function pick(list: PublicAd[]): PublicAd | null {
  const live = list.filter((a) => !a.endsAt || +new Date(a.endsAt) > Date.now())
  const total = live.reduce((n, a) => n + Math.max(1, a.weight), 0)
  let r = Math.random() * total
  for (const a of live) if ((r -= Math.max(1, a.weight)) < 0) return a
  return null
}

function Creative({ c, alt, active }: { c: AdCreative; alt: string; active: boolean }) {
  const v = useRef<HTMLVideoElement>(null)
  const [reduce, setReduce] = useState(false)
  useEffect(() => setReduce(matchMedia('(prefers-reduced-motion: reduce)').matches), [])
  useEffect(() => {
    const el = v.current
    if (!el || reduce) return
    if (active) el.play().catch(() => {})
    else el.pause()
  }, [active, reduce])
  if (c.type === 'video')
    return <video ref={v} src={c.url} muted loop playsInline preload="metadata" controls={reduce} aria-label={alt} className="size-full object-contain" />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={c.url} alt={alt} loading="lazy" decoding="async" className="size-full object-contain" />
}

/** Un espacio de publicidad. Si no hay campañas para él, no ocupa nada. */
export function AdSlot({ p, className }: { p: Placement; className?: string }) {
  const list = useContext(AdsContext)[p]
  const [ad, setAd] = useState<PublicAd | null>(null)
  const [mobile, setMobile] = useState(false)
  const [visible, setVisible] = useState(false)
  const box = useRef<HTMLAnchorElement>(null)
  const counted = useRef(false)

  useEffect(() => {
    if (list?.length) setAd(pick(list))
    const m = matchMedia(MOBILE)
    setMobile(m.matches)
    const on = () => setMobile(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [list])

  // Vista: al menos la mitad del anuncio en pantalla durante 1 segundo. Una por carga de página.
  useEffect(() => {
    const el = box.current
    if (!el || !ad) return
    let t: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting)
        clearTimeout(t)
        if (e.isIntersecting && !counted.current)
          t = setTimeout(() => {
            counted.current = true
            adView(ad.id, p).catch(() => {})
          }, 1000)
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimeout(t)
    }
  }, [ad, p])

  if (!list?.length) return null
  const f = PLACEMENTS[p]
  const [dw, dh] = f.desktop
  const [mw, mh] = f.mobile
  const creative = ad && (mobile ? (ad.mobile ?? ad.desktop) : (ad.desktop ?? ad.mobile))
  const alt = ad ? ad.alt || `Publicidad de ${ad.advertiser || 'un anunciante'}` : ''

  return (
    <aside aria-label="Publicidad" className={cn('mx-auto my-8 w-full', className)}>
      <div className="mb-1.5 text-center text-[10px] font-semibold tracking-[.14em] text-eg-muted uppercase">Publicidad</div>
      <a
        ref={box}
        href={ad ? `/api/ads/click?c=${ad.id}&p=${p}` : undefined}
        target="_blank"
        rel="sponsored noopener"
        aria-label={ad ? alt : 'Publicidad'}
        style={{ '--dw': `${dw}px`, '--da': `${dw} / ${dh}`, '--mw': `${mw}px`, '--ma': `${mw} / ${mh}` } as React.CSSProperties}
        className="mx-auto block aspect-(--da) w-full max-w-(--dw) overflow-hidden rounded-[2px] bg-eg-surface max-[640px]:aspect-(--ma) max-[640px]:max-w-(--mw)"
      >
        {creative && <Creative c={creative} alt={alt} active={visible} />}
      </a>
    </aside>
  )
}
