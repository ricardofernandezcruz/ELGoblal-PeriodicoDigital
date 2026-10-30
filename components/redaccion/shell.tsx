'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon, type IconName } from '@/components/eg/icon'
import { toggleTheme } from '@/components/eg/theme'
import { authClient } from '@/lib/auth-client'
import { ROLE_LABEL } from '@/lib/permissions'
import type { AdminData } from '@/lib/newsroom-types'
import type { CurrentUser } from '@/lib/session'
import { cn } from '@/lib/utils'
import { VIEWS, type View } from './data'
import { AdminProvider, useAdmin } from './store'
import { AccountDialog } from './views/account'
import { Avatar } from './views/profile'
import { B, btnClass, Overlay } from './ui'
import { Comments } from './views/comments'
import { Dashboard } from './views/dashboard'
import { EditorView } from './views/editor'
import { HomeView } from './views/home'
import { MediaView } from './views/media'
import { NewsView } from './views/news'
import { Stats } from './views/stats'
import { Team } from './views/team'
import { VideosView } from './views/videos'

export default function Redaccion({ user, initial }: { user: CurrentUser; initial: AdminData }) {
  return (
    <AdminProvider me={user} initial={initial}>
      <Shell />
    </AdminProvider>
  )
}

function NavBtn({ v, icon, children, count }: { v: View; icon: IconName; children: string; count?: number }) {
  const { view, go } = useAdmin()
  const on = view === v || (v === 'news' && view === 'edit')
  return (
    <button
      type="button"
      onClick={() => go(v)}
      aria-current={on ? 'page' : undefined}
      className={cn(
        'flex min-h-10 w-full items-center gap-2.5 rounded-lg border-0 bg-transparent px-2.5 py-[9px] text-left text-inherit hover:bg-white/8',
        on && 'bg-white/14 text-white shadow-[inset_3px_0_#e8847d]',
      )}
    >
      <Icon name={icon} />
      {children}
      {!!count && <span className="ml-auto rounded-full bg-eg-accent px-[7px] text-[11px] font-semibold text-white">{count}</span>}
    </button>
  )
}

function Shell() {
  const { me, view, news, com, sbOpen, setSbOpen, setPal, newNote, toast, dialog, can } = useAdmin()
  const rev = news.filter((n) => n.st === 'rev').length

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPal(true)
      }
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [setPal])

  const h6 = 'mx-2.5 mt-4 mb-1.5 text-[11px] font-semibold tracking-[.06em] text-[#7f8da1] uppercase'

  return (
    <div className="eg-admin min-h-screen bg-eg-bg text-sm leading-normal text-eg-ink">
      <div className="grid min-h-screen grid-cols-[15.5rem_1fr] max-[900px]:grid-cols-1">
        <aside
          aria-label="Navegación del panel"
          className={cn(
            'sticky top-0 flex h-screen flex-col gap-0.5 overflow-auto bg-eg-sb px-3 py-4 text-[#cdd5df] transition-transform duration-200',
            'max-[900px]:fixed max-[900px]:left-0 max-[900px]:z-[70] max-[900px]:w-64',
            sbOpen ? 'max-[900px]:translate-x-0' : 'max-[900px]:-translate-x-full',
          )}
        >
          <div className="px-2 py-1 font-serif text-2xl font-semibold tracking-[-.02em] text-white">
            El Global
            <small className="mt-0.5 block font-sans text-[11px] font-medium tracking-[.08em] text-[#8a98ab] uppercase">
              Panel de redacción
            </small>
          </div>
          <B v="acc" className="mt-3.5 mb-1" onClick={() => newNote()}>
            <Icon name="plus" />
            Nueva nota
          </B>
          <h6 className={h6}>Contenido</h6>
          <NavBtn v="dash" icon="home">
            Panel
          </NavBtn>
          <NavBtn v="news" icon="file" count={rev}>
            Noticias
          </NavBtn>
          <NavBtn v="videos" icon="video">
            Videos
          </NavBtn>
          <NavBtn v="media" icon="image">
            Multimedia
          </NavBtn>
          <NavBtn v="com" icon="chat" count={can('comment.moderate') ? com.length : 0}>
            Comentarios
          </NavBtn>
          <h6 className={h6}>Sitio</h6>
          <NavBtn v="home" icon="layout">
            Portada
          </NavBtn>
          <NavBtn v="stats" icon="chart">
            Analítica
          </NavBtn>
          <NavBtn v="team" icon="users">
            Equipo
          </NavBtn>
          <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 p-2.5">
            <Avatar name={me.name} image={me.image} className="bg-white/10 text-white" />
            <button
              type="button"
              className="min-w-0 flex-1 rounded-md border-0 bg-transparent p-0 text-left hover:opacity-80"
              aria-label="Mi cuenta"
              onClick={() => dialog(<AccountDialog />)}
            >
              <b className="block truncate text-[13px] text-white">{me.name}</b>
              <span className="text-xs text-[#8a98ab]">
                {ROLE_LABEL[me.role]}
                {!me.twoFactorEnabled && ' · activa 2FA'}
              </span>
            </button>
            <button
              type="button"
              className="rounded-md border-0 bg-transparent px-2 py-1 text-xs text-[#8a98ab] hover:bg-white/8 hover:text-white"
              onClick={async () => {
                await authClient.signOut()
                window.location.href = '/redaccion/login'
              }}
            >
              Salir
            </button>
          </div>
        </aside>
        {sbOpen && (
          <div className="fixed inset-0 z-[60] hidden bg-black/30 max-[900px]:block" onClick={() => setSbOpen(false)} />
        )}

        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex min-h-[60px] items-center gap-2.5 border-b border-eg-rule bg-eg-bg/90 px-6 py-2.5 backdrop-blur-[10px] max-[900px]:px-3.5">
            <B v="ghost" ic className="hidden max-[900px]:inline-flex" aria-label="Abrir menú" onClick={() => setSbOpen(!sbOpen)}>
              <Icon name="menu" />
            </B>
            <div className="min-w-0">
              <div className="text-xs text-eg-muted">{VIEWS[view][0]}</div>
              <h1 className="m-0 truncate font-serif text-[22px] font-semibold tracking-[-.01em]">{VIEWS[view][1]}</h1>
            </div>
            <span className="flex-1" />
            <B v="out" className="max-[900px]:hidden" onClick={() => setPal(true)}>
              <Icon name="search" />
              Buscar o ir a…
              <kbd className="rounded-[5px] border border-b-2 border-eg-rule bg-eg-panel px-1.5 py-px text-[11px] font-medium text-eg-muted">
                Ctrl K
              </kbd>
            </B>
            <B v="ghost" ic className="hidden max-[900px]:inline-flex" aria-label="Buscar o ir a" onClick={() => setPal(true)}>
              <Icon name="search" />
            </B>
            <B v="ghost" ic aria-label="Cambiar tema" onClick={() => toggleTheme()}>
              <Icon name="moon" />
            </B>
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className={cn(btnClass({ v: 'out' }), 'max-[900px]:hidden')}
              onClick={() => toast('Se abre el sitio público en otra pestaña')}
            >
              <Icon name="eye" />
              Ver sitio
            </a>
          </header>
          <main className="mx-auto w-full max-w-[1380px] p-6 max-[900px]:p-3.5">
            {view === 'dash' && <Dashboard />}
            {view === 'news' && <NewsView />}
            {view === 'edit' && <EditorView />}
            {view === 'home' && <HomeView />}
            {view === 'videos' && <VideosView />}
            {view === 'media' && <MediaView />}
            {view === 'com' && <Comments />}
            {view === 'stats' && <Stats />}
            {view === 'team' && <Team />}
          </main>
        </div>
      </div>
      <Palette />
    </div>
  )
}

const ACT: [string, string, string][] = [
  ['Panel', 'v:dash', 'ir'],
  ['Noticias', 'v:news', 'ir'],
  ['Portada', 'v:home', 'ir'],
  ['Videos', 'v:videos', 'ir'],
  ['Multimedia', 'v:media', 'ir'],
  ['Comentarios', 'v:com', 'ir'],
  ['Analítica', 'v:stats', 'ir'],
  ['Equipo y permisos', 'v:team', 'ir'],
  ['Nueva nota', 'new', 'acción'],
  ['Cambiar tema', 'theme', 'acción'],
]

function Palette() {
  const { pal, setPal, news, go, newNote, openEd } = useAdmin()
  const [q, setQ] = useState('')
  const [pi, setPi] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (pal) {
      setQ('')
      setPi(0)
      setTimeout(() => input.current?.focus(), 0)
    }
  }, [pal])

  if (!pal) return null
  const list = [...ACT, ...news.map((n) => [n.t, 'n:' + n.id, 'nota'] as [string, string, string])]
    .filter((a) => a[0].toLowerCase().includes(q.toLowerCase()))
    .slice(0, 9)
  const cur = Math.min(pi, Math.max(0, list.length - 1))

  const run = (k: string) => {
    setPal(false)
    if (k === 'theme') toggleTheme()
    else if (k === 'new') newNote()
    else if (k.startsWith('v:')) go(k.slice(2) as View)
    else openEd(k.slice(2))
  }

  return (
    <Overlay onClose={() => setPal(false)} label="Buscar o ir a">
      <div className="mx-auto mt-[12vh] mb-auto w-[min(560px,92vw)] overflow-hidden rounded-[14px] border border-eg-rule bg-eg-panel shadow-[0_24px_60px_rgba(0,0,0,.4)]">
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPi(0)
          }}
          onKeyDown={(e) => {
            const n = list.length
            if (!n) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setPi((cur + 1) % n)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setPi((cur - 1 + n) % n)
            } else if (e.key === 'Enter') run(list[cur][1])
          }}
          placeholder="Escribe una pantalla, una nota o una acción…"
          aria-label="Escribe una pantalla, una nota o una acción"
          autoComplete="off"
          className="w-full border-0 border-b border-eg-rule bg-transparent px-[18px] py-[15px] text-[15px] outline-0"
        />
        <ul className="m-0 max-h-80 list-none overflow-auto p-1.5">
          {list.length ? (
            list.map((a, i) => (
              <li
                key={a[1]}
                onClick={() => run(a[1])}
                onMouseEnter={() => setPi(i)}
                className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-[9px]', i === cur && 'bg-eg-soft')}
              >
                <Icon name={a[1].startsWith('n:') ? 'file' : 'search'} />
                <span className="truncate">{a[0]}</span>
                <span className="ml-auto text-xs text-eg-muted">{a[2]}</span>
              </li>
            ))
          ) : (
            <li className="px-2.5 py-[9px] text-xs text-eg-muted">Sin resultados. Prueba con otra palabra.</li>
          )}
        </ul>
      </div>
    </Overlay>
  )
}
