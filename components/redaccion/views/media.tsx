'use client'

import { useEffect, useState } from 'react'
import { getMediaUses, importMediaFromUrl, purgeMedia, replaceMedia, restoreMedia, trashMedia, updateMediaInfo } from '@/app/redaccion/actions'
import { ArtImg } from '@/components/eg/art'
import { ImagePrepError, prepareImage } from '@/lib/client-image'
import type { MediaUse } from '@/lib/newsroom-types'
import { cn } from '@/lib/utils'
import { fd, type AdminMedia } from '../data'
import { useAdmin } from '../store'
import { B, Badge, Card, cp, DlgRow, DlgTitle, Empty, hint, I, inp, lab, pageTitle, sub, Tabs } from '../ui'

/** Abre el selector de archivos, reduce la imagen en el navegador (WebP, 2400 px), la sube y la añade a la biblioteca.
    onBusy recibe el paso en curso ('opt' optimizando, 'up' subiendo) o null al terminar. */
export function useUpload() {
  const { setMedia, toast } = useAdmin()
  return (cb: (m: AdminMedia) => void, onBusy?: (b: 'opt' | 'up' | null) => void) => {
    const i = document.createElement('input')
    i.type = 'file'
    i.accept = 'image/jpeg,image/png,image/webp,image/gif'
    i.onchange = async () => {
      const f = i.files?.[0]
      if (!f) return
      onBusy?.('opt')
      try {
        const img = await prepareImage(f)
        onBusy?.('up')
        const fd = new FormData()
        fd.append('file', img.file)
        fd.append('width', String(img.width))
        fd.append('height', String(img.height))
        const res = await fetch('/api/media', { method: 'POST', body: fd })
        const j = await res.json()
        if (!res.ok) return toast(j.error ?? 'No se pudo subir la imagen.')
        setMedia((ms) => [j as AdminMedia, ...ms])
        if (img.file !== f && f.size > img.file.size * 1.5) toast(`Imagen optimizada: de ${mb(f.size)} a ${mb(img.file.size)}`)
        cb(j as AdminMedia)
      } catch (e) {
        toast(e instanceof ImagePrepError ? e.message : 'Sin conexión con el servidor. Inténtalo de nuevo.')
      } finally {
        onBusy?.(null)
      }
    }
    i.click()
  }
}

const mb = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.round(n / 1e3) + ' KB')

/** Resumen de uso para la tarjeta. */
function UseBadge({ m }: { m: AdminMedia }) {
  const live = m.use.filter((u) => u.live).length
  if (live) return <Badge k="pub">{live === 1 ? 'En 1 publicación' : `En ${live} publicaciones`}</Badge>
  if (m.use.length) return <Badge k="rev">Solo en borradores</Badge>
  return <Badge>Sin usar</Badge>
}

export function MediaGrid({ items, onPick, empty }: { items: AdminMedia[]; onPick: (m: AdminMedia) => void; empty?: React.ReactNode }) {
  if (!items.length) return <>{empty ?? <Empty title="La biblioteca está vacía">Sube la primera imagen con el botón de arriba.</Empty>}</>
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 max-[420px]:grid-cols-2">
      {items.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onPick(m)}
          className="group overflow-hidden rounded-[10px] border border-eg-rule bg-eg-panel p-0 text-left transition-[border-color,box-shadow] hover:border-eg-ink/40 hover:shadow-[0_6px_18px_rgba(0,0,0,.08)]"
        >
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-eg-soft">
            <ArtImg src={m.s} className="transition-transform duration-300 group-hover:scale-[1.03]" />
            {m.c && <span className="absolute right-1.5 bottom-1.5 max-w-[85%] truncate rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-white">{m.c}</span>}
          </div>
          <span className="grid gap-1 px-2.5 py-2 text-xs">
            <b className="line-clamp-1">{m.n}</b>
            <span className="flex flex-wrap gap-1">
              <UseBadge m={m} />
              {!m.a && <Badge k="er">Sin texto alternativo</Badge>}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

/* ---------- Importar desde un enlace ---------- */

function ImportDialog({ onDone }: { onDone: (m: AdminMedia) => void }) {
  const { closeDialog, call, setMedia } = useAdmin()
  const [url, setUrl] = useState('')
  const [credit, setCredit] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!/^https?:\/\/\S+/.test(url.trim())) return setErr('Pega el enlace completo, empezando por https://')
        if (credit.trim().length < 2) return setErr('Escribe el crédito: quién hizo la foto o de dónde sale.')
        setBusy(true)
        const m = await call(importMediaFromUrl({ url, credit }))
        setBusy(false)
        if (!m) return
        setMedia((ms) => [m, ...ms])
        onDone(m)
      }}
    >
      <DlgTitle>Importar desde un enlace</DlgTitle>
      <p className="text-sm text-eg-muted">
        Pega el enlace de una imagen o de una noticia: si es una página, se toma su imagen principal. La imagen se copia a nuestra biblioteca, así no depende
        de que el otro sitio la mantenga.
      </p>
      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="iu" className={lab}>
          Enlace
        </label>
        <input id="iu" className={inp} inputMode="url" placeholder="https://…" value={url} onChange={(e) => (setUrl(e.target.value), setErr(''))} autoFocus />
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="ic" className={lab}>
          Crédito
        </label>
        <input id="ic" className={inp} placeholder="Ej.: Foto: AP / Presidencia RD" value={credit} onChange={(e) => (setCredit(e.target.value), setErr(''))} />
        <span className={hint}>Obligatorio. Se muestra junto a la imagen en la nota. Usa solo imágenes con permiso o de libre uso.</span>
      </div>
      <div className={cn(hint, 'mt-2 min-h-5 text-eg-accent')} role="alert">
        {err}
      </div>
      <DlgRow>
        <B v="out" onClick={closeDialog}>
          Cancelar
        </B>
        <B type="submit" disabled={busy}>
          <I n="link" />
          {busy ? 'Importando…' : 'Importar imagen'}
        </B>
      </DlgRow>
    </form>
  )
}

/** Botones «Subir» e «Importar desde un enlace», compartidos por la biblioteca y el selector. */
function AddButtons({ onAdded }: { onAdded: (m: AdminMedia, how: 'up' | 'link') => void }) {
  const { dialog } = useAdmin()
  const upload = useUpload()
  const [busy, setBusy] = useState<'opt' | 'up' | null>(null)
  return (
    <>
      <B disabled={!!busy} onClick={() => upload((m) => onAdded(m, 'up'), setBusy)}>
        <I n="up2" />
        {busy === 'opt' ? 'Optimizando…' : busy === 'up' ? 'Subiendo…' : 'Subir imagen'}
      </B>
      <B v="out" onClick={() => dialog(<ImportDialog onDone={(m) => onAdded(m, 'link')} />)}>
        <I n="link" />
        Desde un enlace
      </B>
    </>
  )
}

/* ---------- Selector de imagen (editor, perfiles, videos) ---------- */

function PickDialog({ pick, title = 'Elegir imagen', exclude }: { pick: (m: AdminMedia) => void; title?: string; exclude?: string }) {
  const { media, closeDialog, toast } = useAdmin()
  const [q, setQ] = useState('')
  const items = media.filter((m) => !m.d && m.id !== exclude && (!q || (m.n + ' ' + m.a + ' ' + m.c).toLowerCase().includes(q.toLowerCase())))
  return (
    <>
      <DlgTitle>{title}</DlgTitle>
      <div className="my-3 flex flex-wrap items-center gap-2">
        <AddButtons
          onAdded={(m, how) => {
            closeDialog()
            pick(m)
            toast(how === 'up' ? 'Imagen subida. Escribe su texto alternativo.' : 'Imagen importada con su crédito.')
          }}
        />
        <span className="flex-1" />
        <input className={cn(inp, 'w-[220px] max-[520px]:w-full')} type="search" placeholder="Buscar en la biblioteca" aria-label="Buscar en la biblioteca" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className={cn(sub, 'mb-3')}>JPG, PNG, WebP o GIF. Las fotos grandes se reducen solas antes de subirlas.</p>
      <MediaGrid
        items={items}
        onPick={(m) => {
          closeDialog()
          pick(m)
        }}
        empty={<Empty title={q ? 'Sin resultados' : 'La biblioteca está vacía'}>{q ? 'Prueba con otra palabra.' : 'Sube una imagen o impórtala desde un enlace.'}</Empty>}
      />
      <DlgRow>
        <B v="out" onClick={closeDialog}>
          Cancelar
        </B>
      </DlgRow>
    </>
  )
}

export function usePickMedia() {
  const { dialog } = useAdmin()
  return (pick: (m: AdminMedia) => void) => dialog(<PickDialog pick={pick} />, true)
}

/* ---------- Ficha de una imagen ---------- */

const USE_KIND: Record<MediaUse['k'], string> = { art: 'Nota', vid: 'Video', au: 'Foto de firma' }

function UseList({ uses }: { uses: MediaUse[] }) {
  const { openEd, closeDialog } = useAdmin()
  return (
    <ul className="m-0 grid max-h-[180px] list-none gap-1 overflow-auto p-0">
      {uses.map((u) => (
        <li key={u.k + u.id} className="flex items-center gap-2 text-sm">
          <Badge k={u.live ? 'pub' : 'rev'}>{u.live ? 'Publicada' : 'Borrador'}</Badge>
          <span className={sub}>{USE_KIND[u.k]}</span>
          {u.k === 'art' ? (
            <button type="button" className="min-w-0 truncate border-0 bg-transparent p-0 text-left font-medium hover:underline" onClick={() => (closeDialog(), openEd(u.id))}>
              {u.t}
            </button>
          ) : (
            <span className="min-w-0 truncate font-medium">{u.t}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

function MediaDialog({ m }: { m: AdminMedia }) {
  const { me, can, closeDialog, dialog, setMedia, call, toast } = useAdmin()
  const [a, setA] = useState(m.a)
  const [c, setC] = useState(m.c)
  const [uses, setUses] = useState<MediaUse[] | null>(null)
  const [busy, setBusy] = useState(false)
  const manager = can('media.manage')
  const canDelete = manager || m.by === me.id

  useEffect(() => {
    let live = true
    getMediaUses(m.id).then((r) => live && setUses(r.ok ? r.data : m.use))
    return () => {
      live = false
    }
  }, [m.id, m.use])

  const live = uses?.filter((u) => u.live) ?? []
  const drafts = uses?.filter((u) => !u.live) ?? []

  const toTrash = async (fromDrafts: boolean) => {
    setBusy(true)
    const ok = await call(trashMedia(m.id, fromDrafts))
    setBusy(false)
    if (ok === undefined) return
    setMedia((ms) => ms.map((x) => (x.id === m.id ? { ...x, d: new Date().toISOString(), use: [] } : x)))
    closeDialog()
    toast(fromDrafts ? 'Imagen quitada de los borradores y enviada a la papelera' : 'Imagen enviada a la papelera')
  }

  const replace = () =>
    dialog(
      <PickDialog
        title={`Elegir la imagen que reemplaza a «${m.n}»`}
        exclude={m.id}
        pick={(to) =>
          dialog(
            <>
              <DlgTitle>¿Reemplazar la imagen en todas partes?</DlgTitle>
              <div className="my-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="aspect-video overflow-hidden rounded-lg bg-eg-soft">
                  <ArtImg src={m.s} />
                </div>
                <I n="right" />
                <div className="aspect-video overflow-hidden rounded-lg bg-eg-soft">
                  <ArtImg src={to.s} />
                </div>
              </div>
              <p className="text-sm text-eg-muted">
                Se cambia en {live.length + drafts.length === 1 ? 'el sitio donde aparece' : `los ${live.length + drafts.length} sitios donde aparece`}, también en lo ya
                publicado. La imagen vieja va a la papelera (30 días para restaurarla).
              </p>
              <DlgRow>
                <B v="out" onClick={closeDialog}>
                  Cancelar
                </B>
                <B
                  v="acc"
                  onClick={async () => {
                    const n = await call(replaceMedia(m.id, to.id))
                    if (n === undefined) return
                    setMedia((ms) =>
                      ms.map((x) =>
                        x.id === m.id ? { ...x, d: new Date().toISOString(), use: [] } : x.id === to.id ? { ...x, use: [...x.use, ...(uses ?? m.use)] } : x,
                      ),
                    )
                    closeDialog()
                    toast(n === 1 ? 'Imagen reemplazada en 1 nota' : `Imagen reemplazada en ${n} notas`)
                  }}
                >
                  <I n="swap" />
                  Reemplazar
                </B>
              </DlgRow>
            </>,
          )
        }
      />,
      true,
    )

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if ((await call(updateMediaInfo(m.id, { alt: a, credit: c }))) === undefined) return
        setMedia((ms) => ms.map((x) => (x.id === m.id ? { ...x, a: a.trim(), c: c.trim() } : x)))
        closeDialog()
        toast('Cambios guardados')
      }}
    >
      <DlgTitle>{m.n}</DlgTitle>
      <div className="my-2.5 aspect-video w-full overflow-hidden rounded-lg bg-eg-soft">
        <ArtImg src={m.s} />
      </div>
      <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ma" className={lab}>
            Texto alternativo
          </label>
          <input id="ma" className={inp} value={a} onChange={(e) => setA(e.target.value)} placeholder="Describe lo que se ve" />
          <span className={hint}>Para quien no puede ver la imagen y para los buscadores.</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mc" className={lab}>
            Crédito <span className="font-normal text-eg-muted">(opcional)</span>
          </label>
          <input id="mc" className={inp} value={c} onChange={(e) => setC(e.target.value)} placeholder="Ej.: Foto: Juan Pérez" />
          <span className={hint}>Aparece junto a la imagen en las notas.</span>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-eg-rule p-3">
        <b className="mb-2 block text-[13px]">Dónde se usa</b>
        {uses === null ? (
          <span className={sub}>Consultando…</span>
        ) : uses.length ? (
          <UseList uses={uses} />
        ) : (
          <span className={sub}>No aparece en ninguna nota, video ni perfil.</span>
        )}
      </div>

      {canDelete && uses !== null && (
        <div className="mt-3 rounded-lg bg-eg-soft p-3 text-sm">
          {live.length ? (
            manager ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 text-eg-muted">Para borrarla, primero reemplázala: el público la está viendo.</span>
                <B v="out" sm onClick={replace}>
                  <I n="swap" />
                  Reemplazar por otra
                </B>
              </div>
            ) : (
              <span className="text-eg-muted">Se ve en publicaciones; un editor puede reemplazarla y borrarla.</span>
            )
          ) : drafts.length ? (
            manager ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 text-eg-muted">Solo está en borradores. Se quitará de ellos.</span>
                <B v="out" sm disabled={busy} onClick={() => toTrash(true)}>
                  <I n="trash" />
                  Quitar y mandar a la papelera
                </B>
              </div>
            ) : (
              <span className="text-eg-muted">Está en borradores. Quítala de ellos para poder borrarla.</span>
            )
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex-1 text-eg-muted">No se usa en ningún sitio.</span>
              <B v="out" sm disabled={busy} onClick={() => toTrash(false)}>
                <I n="trash" />
                Mandar a la papelera
              </B>
            </div>
          )}
        </div>
      )}

      <DlgRow>
        <B v="out" onClick={closeDialog}>
          Cerrar
        </B>
        <B type="submit">Guardar cambios</B>
      </DlgRow>
    </form>
  )
}

/* ---------- Papelera ---------- */

function Trash({ items }: { items: AdminMedia[] }) {
  const { me, can, setMedia, call, toast, dialog, closeDialog } = useAdmin()
  const manager = can('media.manage')
  if (!items.length) return <Empty title="La papelera está vacía">Lo que borres se queda aquí 30 días por si te arrepientes.</Empty>
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
      {items.map((m) => (
        <div key={m.id} className="overflow-hidden rounded-[10px] border border-eg-rule bg-eg-panel">
          <div className="aspect-[16/10] overflow-hidden bg-eg-soft opacity-60 grayscale">
            <ArtImg src={m.s} />
          </div>
          <div className="grid gap-2 px-2.5 py-2 text-xs">
            <span>
              <b className="line-clamp-1">{m.n}</b>
              <span className={sub}>Se borra del todo el {fd(new Date(new Date(m.d!).getTime() + 30 * 864e5))}</span>
            </span>
            {(manager || m.by === me.id) && (
              <span className="flex flex-wrap gap-1.5">
                <B
                  v="out"
                  sm
                  onClick={async () => {
                    if ((await call(restoreMedia(m.id))) === undefined) return
                    setMedia((ms) => ms.map((x) => (x.id === m.id ? { ...x, d: null } : x)))
                    toast('Imagen restaurada')
                  }}
                >
                  <I n="undo" />
                  Restaurar
                </B>
                {manager && (
                  <B
                    v="ghost"
                    sm
                    onClick={() =>
                      dialog(
                        <>
                          <DlgTitle>¿Borrar «{m.n}» para siempre?</DlgTitle>
                          <p className="text-sm text-eg-muted">Se elimina del almacenamiento ahora mismo y no se puede deshacer.</p>
                          <DlgRow>
                            <B v="out" onClick={closeDialog}>
                              Cancelar
                            </B>
                            <B
                              v="acc"
                              onClick={async () => {
                                closeDialog()
                                if ((await call(purgeMedia(m.id))) === undefined) return
                                setMedia((ms) => ms.filter((x) => x.id !== m.id))
                                toast('Imagen borrada definitivamente')
                              }}
                            >
                              Borrar para siempre
                            </B>
                          </DlgRow>
                        </>,
                      )
                    }
                  >
                    Borrar ya
                  </B>
                )}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- Vista Multimedia ---------- */

type Filter = 'all' | 'unused' | 'noalt' | 'trash'

export function MediaView() {
  const { media, dialog, toast } = useAdmin()
  const [f, setF] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const active = media.filter((m) => !m.d)
  const trash = media.filter((m) => m.d)
  const lists: Record<Filter, AdminMedia[]> = {
    all: active,
    unused: active.filter((m) => !m.use.length),
    noalt: active.filter((m) => !m.a),
    trash,
  }
  const shown = lists[f].filter((m) => !q || (m.n + ' ' + m.a + ' ' + m.c).toLowerCase().includes(q.toLowerCase()))
  const count = (n: number) => <span className="ml-1 rounded-full bg-eg-soft px-1.5 py-px text-[11px] font-semibold text-eg-muted">{n}</span>

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <h2 className={pageTitle}>Multimedia</h2>
          <div className="text-sm text-eg-muted">Toda tu biblioteca en un solo lugar. Cada imagen debe tener texto alternativo.</div>
        </div>
        <span className="flex-1" />
        <div className="flex flex-wrap gap-2">
          <AddButtons
            onAdded={(m, how) => {
              toast(how === 'up' ? 'Imagen subida. Añade su texto alternativo.' : 'Imagen importada con su crédito.')
              dialog(<MediaDialog m={m} />)
            }}
          />
        </div>
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-x-3 border-b border-eg-rule pr-3 max-[640px]:pr-0">
          <div className="min-w-0 flex-1 [&>div]:border-b-0">
            <Tabs
              value={f}
              onChange={setF}
              tabs={[
                ['all', <>Todas{count(lists.all.length)}</>],
                ['unused', <>Sin usar{count(lists.unused.length)}</>],
                ['noalt', <>Sin texto alternativo{count(lists.noalt.length)}</>],
                ['trash', <>Papelera{count(trash.length)}</>],
              ]}
            />
          </div>
          <input
            className={cn(inp, 'my-2 w-[220px] max-[640px]:mx-3 max-[640px]:w-full')}
            type="search"
            placeholder="Buscar por nombre o crédito"
            aria-label="Buscar en la biblioteca"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className={cp}>
          {f === 'trash' ? (
            <Trash items={shown} />
          ) : (
            <MediaGrid
              items={shown}
              onPick={(m) => dialog(<MediaDialog m={m} />)}
              empty={
                q ? (
                  <Empty title="Sin resultados">Prueba con otra palabra.</Empty>
                ) : f === 'unused' ? (
                  <Empty title="Todo se está usando">No hay imágenes sueltas en la biblioteca.</Empty>
                ) : f === 'noalt' ? (
                  <Empty title="Todas tienen texto alternativo">Buen trabajo.</Empty>
                ) : undefined
              }
            />
          )}
        </div>
      </Card>
    </>
  )
}
