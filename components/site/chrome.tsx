'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/eg/icon'
import { ToastProvider } from '@/components/eg/toast'
import { BreakingBar, SearchPalette, SiteHeader, type MenuItem } from '@/components/portada/site-header'
import { cn } from '@/lib/utils'
import { TopStrip } from './indicators'
import { InstallBanner, useServiceWorker } from './pwa'

/** Estructura común del sitio público: última hora, header, buscador, pie y barra inferior móvil. */
export function SiteChrome({
  menu,
  breaking,
  active = '',
  children,
}: {
  menu: MenuItem[]
  breaking?: { on: boolean; text: string }
  active?: string
  children: React.ReactNode
}) {
  return (
    <ToastProvider className="bottom-[84px]">
      <Chrome menu={menu} breaking={breaking} active={active}>
        {children}
      </Chrome>
    </ToastProvider>
  )
}

function Chrome({ menu, breaking, active, children }: { menu: MenuItem[]; breaking?: { on: boolean; text: string }; active: string; children: React.ReactNode }) {
  const [megaOpen, setMegaOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchBtn = useRef<HTMLButtonElement>(null)
  useServiceWorker()

  const closeSearch = () => {
    setSearchOpen(false)
    searchBtn.current?.focus()
  }

  // Atajos: / o Ctrl/Cmd+K abren el buscador; Esc cierra buscador y megamenú
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement | null)?.tagName ?? '')
      if (e.key === 'Escape') {
        setSearchOpen((o) => {
          if (o) searchBtn.current?.focus()
          return false
        })
        setMegaOpen(false)
      } else if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [])

  return (
    <>
      {breaking?.on && <BreakingBar text={breaking.text} />}
      <TopStrip />
      <SiteHeader
        menu={menu}
        active={active}
        megaOpen={megaOpen}
        setMegaOpen={setMegaOpen}
        onSearch={() => setSearchOpen(true)}
        searchBtnRef={searchBtn}
      />
      {children}
      <SiteFooter menu={menu} />
      <BottomNav
        onSections={() => {
          scrollTo({ top: 0 })
          setMegaOpen(!megaOpen)
        }}
        onSearch={() => setSearchOpen(true)}
      />
      <SearchPalette open={searchOpen} onClose={closeSearch} />
      <InstallBanner />
    </>
  )
}

function SiteFooter({ menu }: { menu: MenuItem[] }) {
  const cols: { t: string; l: [string, string][] }[] = [
    { t: 'Secciones', l: menu.slice(0, 4).map((m) => [m.name, '/' + m.slug]) },
    { t: 'Más secciones', l: menu.slice(4, 8).map((m) => [m.name, '/' + m.slug]) },
    {
      t: 'El Global',
      l: [
        ['Portada', '/'],
        ['Video', '/video'],
        ['Boletín diario', '/#t-news'],
        ['Guardadas', '/guardadas'],
      ],
    },
  ]
  return (
    <footer className="mt-16 bg-eg-foot pt-10 pb-[100px] text-[#E8E4DC]">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[2fr_repeat(3,1fr)] gap-6 px-5 text-sm max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
        <div>
          <div className="font-serif text-[30px] leading-none font-semibold tracking-[-.02em]">El Global</div>
          <p className="max-w-[34ch] opacity-70">Periodismo para entender el mundo.</p>
          <p className="text-xs opacity-50">© {new Date().getFullYear()} El Global</p>
          <p className="text-[11px] opacity-40">
            Clima:{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noopener" className="underline">
              Open-Meteo
            </a>
            . Tasas de cambio:{' '}
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener" className="underline">
              ExchangeRate-API
            </a>
            .
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.t}>
            <h4 className="mb-2.5 text-[13px] font-semibold opacity-60">{c.t}</h4>
            {c.l.map(([label, href]) => (
              <Link key={href} href={href} className="block py-[3px] opacity-[.88]">
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </footer>
  )
}

function BottomNav({ onSections, onSearch }: { onSections: () => void; onSearch: () => void }) {
  const item = 'min-h-12 flex-1 border-0 bg-transparent py-2.5 text-center text-[11px] text-eg-muted'
  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed right-0 bottom-0 left-0 z-30 hidden border-t border-eg-rule bg-eg-bg pb-[env(safe-area-inset-bottom,0px)] max-[900px]:flex"
    >
      <Link href="/" className={cn(item, 'text-eg-accent')}>
        <Icon name="house" size={20} strokeWidth={1.8} round={false} className="mx-auto mb-0.5 block" />
        Inicio
      </Link>
      <button className={item} onClick={onSections}>
        <Icon name="menu" size={20} strokeWidth={1.8} round={false} className="mx-auto mb-0.5 block" />
        Secciones
      </button>
      <button className={item} onClick={onSearch}>
        <Icon name="search" size={20} strokeWidth={1.8} round={false} className="mx-auto mb-0.5 block" />
        Buscar
      </button>
      <Link href="/guardadas" className={item}>
        <Icon name="bookmark" size={20} strokeWidth={1.8} className="mx-auto mb-0.5 block" />
        Guardadas
      </Link>
    </nav>
  )
}
