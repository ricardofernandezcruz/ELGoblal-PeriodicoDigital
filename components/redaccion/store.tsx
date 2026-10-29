'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/eg/icon'
import type { CurrentUser } from '@/lib/session'
import {
  D,
  emptyEditor,
  initialComments,
  initialHome,
  initialMedia,
  initialNews,
  loc,
  mk,
  slugify,
  TEMPLATES,
  type Comment,
  type Editor,
  type HomeState,
  type MediaItem,
  type News,
  type View,
} from './data'
import { B, Dialog, DlgRow, DlgTitle } from './ui'

type Setter<T> = React.Dispatch<React.SetStateAction<T>>
type Ctx = {
  me: CurrentUser
  view: View
  show: (v: View) => void
  go: (v: View) => void
  news: News[]
  setNews: Setter<News[]>
  media: MediaItem[]
  setMedia: Setter<MediaItem[]>
  com: Comment[]
  setCom: Setter<Comment[]>
  hp: HomeState
  setHp: Setter<HomeState>
  E: Editor | null
  setE: Setter<Editor | null>
  dialog: (node: React.ReactNode, wide?: boolean) => void
  closeDialog: () => void
  toast: (m: string) => void
  newNote: (date?: Date) => void
  openEd: (id: number) => void
  sbOpen: boolean
  setSbOpen: Setter<boolean>
  pal: boolean
  setPal: Setter<boolean>
}

const AdminContext = createContext<Ctx | null>(null)
export const useAdmin = () => useContext(AdminContext)!

export function AdminProvider({ me, children }: { me: CurrentUser; children: React.ReactNode }) {
  const [view, setView] = useState<View>('dash')
  const [news, setNews] = useState(initialNews)
  const [media, setMedia] = useState(initialMedia)
  const [com, setCom] = useState(initialComments)
  const [hp, setHp] = useState(initialHome)
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
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }, [])
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
              Se guardan solos como borrador, pero aún no los has publicado ni programado. ¿Salir del editor?
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
                Salir y mantener borrador
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
            ...(date ? { mode: 'sch', when: loc(date) } : {}),
            blocks: t ? TEMPLATES[t]() : [mk('p', { v: '' })],
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
    [dialog, closeDialog, startEd],
  )

  const openEd = useCallback(
    (id: number) => {
      const n = news.find((x) => x.id === id)
      if (!n) return
      const blocks = TEMPLATES.std()
      blocks[0].src = n.art
      startEd(
        emptyEditor({
          id,
          title: n.t,
          sec: n.sec,
          au: n.au,
          mode: n.st === 'sch' ? 'sch' : n.st === 'pub' ? 'now' : 'draft',
          est: n.st === 'sch' ? 'sch' : 'draft',
          when: n.d ? loc(n.d) : loc(D(1, 7, 30)),
          tags: ['actualidad', 'análisis'],
          lead: 'Las grandes potencias abren una etapa de diálogo para afrontar los desafíos que definirán la próxima década.',
          blocks,
          slug: slugify(n.t),
        }),
      )
    },
    [news, startEd],
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
        view,
        show,
        go,
        news,
        setNews,
        media,
        setMedia,
        com,
        setCom,
        hp,
        setHp,
        E,
        setE,
        dialog,
        closeDialog,
        toast,
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
      <div className="fixed right-4 bottom-4 z-[100] grid gap-2" role="status">
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
