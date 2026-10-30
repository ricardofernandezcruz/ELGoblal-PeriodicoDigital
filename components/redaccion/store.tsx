'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { loadArticle } from '@/app/redaccion/actions'
import { Icon } from '@/components/eg/icon'
import type { ActionResult, AdminAuthor, AdminData, AdminHome, AdminStats } from '@/lib/newsroom-types'
import { can, type Permission } from '@/lib/permissions'
import type { CurrentUser } from '@/lib/session'
import {
  D,
  emptyEditor,
  loc,
  mk,
  TEMPLATES,
  type AdminComment,
  type AdminMedia,
  type AdminNews,
  type AdminSection,
  type AdminUser,
  type Editor,
  type View,
} from './data'
import { B, Dialog, DlgRow, DlgTitle } from './ui'

type Setter<T> = React.Dispatch<React.SetStateAction<T>>
type Ctx = {
  me: CurrentUser
  can: (p: Permission) => boolean
  view: View
  show: (v: View) => void
  go: (v: View) => void
  news: AdminNews[]
  setNews: Setter<AdminNews[]>
  media: AdminMedia[]
  setMedia: Setter<AdminMedia[]>
  com: AdminComment[]
  setCom: Setter<AdminComment[]>
  sections: AdminSection[]
  setSections: Setter<AdminSection[]>
  authors: AdminAuthor[]
  team: AdminUser[]
  setTeam: Setter<AdminUser[]>
  home: AdminHome
  setHome: Setter<AdminHome>
  stats: AdminStats
  E: Editor | null
  setE: Setter<Editor | null>
  dialog: (node: React.ReactNode, wide?: boolean) => void
  closeDialog: () => void
  toast: (m: string) => void
  /** Ejecuta una acción del servidor y muestra su error, si lo hay. */
  call: <T>(p: Promise<ActionResult<T>>) => Promise<T | undefined>
  newNote: (date?: Date) => void
  openEd: (id: string) => void
  sbOpen: boolean
  setSbOpen: Setter<boolean>
  pal: boolean
  setPal: Setter<boolean>
}

const AdminContext = createContext<Ctx | null>(null)
export const useAdmin = () => useContext(AdminContext)!

export function AdminProvider({ me, initial, children }: { me: CurrentUser; initial: AdminData; children: React.ReactNode }) {
  const [view, setView] = useState<View>('dash')
  const [news, setNews] = useState(initial.news)
  const [media, setMedia] = useState(initial.media)
  const [com, setCom] = useState(initial.comments)
  const [sections, setSections] = useState(initial.sections)
  const [team, setTeam] = useState(initial.team)
  const [home, setHome] = useState(initial.home)
  const [E, setE] = useState<Editor | null>(null)
  const [dlg, setDlg] = useState<{ node: React.ReactNode; wide?: boolean } | null>(null)
  const [toasts, setToasts] = useState<{ id: number; m: string }[]>([])
  const [sbOpen, setSbOpen] = useState(false)
  const [pal, setPal] = useState(false)
  const eRef = useRef(E)
  eRef.current = E
  const viewRef = useRef(view)
  viewRef.current = view

  const toast = useCallback((m: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, m }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])
  const call = useCallback(
    async <T,>(p: Promise<ActionResult<T>>) => {
      try {
        const r = await p
        if (r.ok) return r.data
        toast(r.error)
      } catch {
        toast('Sin conexión con el servidor. Revisa tu red y vuelve a intentarlo.')
      }
      return undefined
    },
    [toast],
  )
  const dialog = useCallback((node: React.ReactNode, wide?: boolean) => setDlg({ node, wide }), [])
  const closeDialog = useCallback(() => setDlg(null), [])

  const show = useCallback((v: View) => {
    setView(v)
    setSbOpen(false)
    scrollTo(0, 0)
  }, [])

  const go = useCallback(
    (v: View) => {
      if (viewRef.current === 'edit' && v !== 'edit' && eRef.current?.dirty) {
        dialog(
          <>
            <DlgTitle>Tienes cambios sin guardar</DlgTitle>
            <p className="text-sm text-eg-muted">
              Los últimos cambios todavía se están guardando. Si sales ahora, podrías perder lo que escribiste en los
              últimos segundos.
            </p>
            <DlgRow>
              <B v="out" onClick={closeDialog}>
                Seguir editando
              </B>
              <B
                onClick={() => {
                  closeDialog()
                  setE((e) => e && { ...e, dirty: false })
                  show(v)
                }}
              >
                Salir de todos modos
              </B>
            </DlgRow>
          </>,
        )
        return
      }
      show(v)
    },
    [dialog, closeDialog, show],
  )

  const defaultSection = sections[0]?.id ?? ''

  const startEd = useCallback(
    (e: Editor) => {
      setE(e)
      show('edit')
    },
    [show],
  )

  const newNote = useCallback(
    (date?: Date) => {
      const st = (t: keyof typeof TEMPLATES | null) => {
        closeDialog()
        startEd(
          emptyEditor({
            sec: defaultSection,
            au: initial.authors.find((a) => a.name === me.name)?.id ?? null,
            createdBy: me.id,
            mode: can(me.role, 'article.publish') ? (date ? 'sch' : 'now') : 'draft',
            when: loc(date ?? D(1, 7, 30)),
            blocks: t ? TEMPLATES[t]() : [mk('p')],
          }),
        )
      }
      const tpl: [keyof typeof TEMPLATES, string, string][] = [
        ['std', 'Nota estándar', 'Portada, texto y subtítulos'],
        ['cro', 'Crónica con galería', 'Fotos seguidas se vuelven galería'],
        ['dat', 'Dato y análisis', 'Cifras destacadas entre párrafos'],
        ['vid', 'Video vertical', 'Pensada para el celular'],
      ]
      dialog(
        <>
          <DlgTitle>¿Qué vas a publicar?</DlgTitle>
          <p className="text-sm text-eg-muted">
            Elige un punto de partida. Podrás cambiarlo todo y el sistema acomoda el diseño por ti.
          </p>
          <TplGrid>
            {tpl.map(([k, t, d]) => (
              <TplBtn key={k} onClick={() => st(k)} title={t} desc={d} />
            ))}
          </TplGrid>
          <DlgRow className="justify-between">
            <B v="ghost" onClick={() => st(null)}>
              Empezar en blanco
            </B>
            <B v="out" onClick={closeDialog}>
              Cancelar
            </B>
          </DlgRow>
        </>,
      )
    },
    [dialog, closeDialog, startEd, defaultSection, initial.authors, me],
  )

  const openEd = useCallback(
    async (id: string) => {
      const p = await call(loadArticle(id))
      if (!p) return
      const mode = p.status === 'pub' ? 'now' : p.status === 'sch' ? 'sch' : p.status === 'rev' ? 'rev' : 'draft'
      startEd(
        emptyEditor({
          id: p.id,
          title: p.title,
          lead: p.lead,
          sec: p.sectionId,
          au: p.authorId,
          tags: p.tags,
          slug: p.slug,
          slugEd: true,
          seo: p.seo,
          blocks: p.blocks,
          com: p.com,
          news: p.news,
          flash: p.flash,
          mode: !can(me.role, 'article.publish') && (mode === 'now' || mode === 'sch') ? 'draft' : mode,
          est: p.status,
          when: loc(p.when ?? D(1, 7, 30)),
          createdBy: p.createdBy,
          status: 'Sin cambios',
        }),
      )
    },
    [call, startEd, me.role],
  )

  // Esc cierra diálogos y paleta
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPal(false)
        setDlg(null)
      }
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [])

  return (
    <AdminContext.Provider
      value={{
        me,
        can: (p) => can(me.role, p),
        view,
        show,
        go,
        news,
        setNews,
        media,
        setMedia,
        com,
        setCom,
        sections,
        setSections,
        authors: initial.authors,
        team,
        setTeam,
        home,
        setHome,
        stats: initial.stats,
        E,
        setE,
        dialog,
        closeDialog,
        toast,
        call,
        newNote,
        openEd,
        sbOpen,
        setSbOpen,
        pal,
        setPal,
      }}
    >
      {children}
      {dlg && (
        <Dialog wide={dlg.wide} onClose={closeDialog}>
          {dlg.node}
        </Dialog>
      )}
      <div className="fixed right-4 bottom-4 z-[100] grid max-w-[min(420px,calc(100vw-32px))] gap-2" role="status">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex animate-[eg-toast-in_.2s] items-center gap-2.5 rounded-[10px] bg-eg-ink px-4 py-[11px] text-eg-bg shadow-[0_10px_28px_rgba(0,0,0,.28)]"
          >
            <Icon name="check" />
            <span>{t.m}</span>
          </div>
        ))}
      </div>
    </AdminContext.Provider>
  )
}

export const TplGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-3.5 grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">{children}</div>
)
export const TplBtn = ({
  title,
  desc,
  icon,
  onClick,
}: {
  title: string
  desc: string
  icon?: React.ReactNode
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-xl border border-eg-rule bg-eg-bg p-3.5 text-left hover:border-eg-accent"
  >
    <b className="flex items-center gap-2 font-serif text-base font-semibold">
      {icon}
      {title}
    </b>
    <span className="text-xs text-eg-muted">{desc}</span>
  </button>
)
