'use client'

import { useState } from 'react'
import { updateMediaAlt } from '@/app/redaccion/actions'
import { ArtImg } from '@/components/eg/art'
import type { AdminMedia } from '../data'
import { useAdmin } from '../store'
import { B, Badge, Card, cp, DlgRow, DlgTitle, Empty, hint, I, inp, pageTitle, sub } from '../ui'

/** Abre el selector de archivos, sube la imagen al servidor y la añade a la biblioteca. */
export function useUpload() {
  const { setMedia, toast } = useAdmin()
  return (cb: (m: AdminMedia) => void, onBusy?: (b: boolean) => void) => {
    const i = document.createElement('input')
    i.type = 'file'
    i.accept = 'image/jpeg,image/png,image/webp,image/gif'
    i.onchange = async () => {
      const f = i.files?.[0]
      if (!f) return
      if (f.size > 3e6) return toast('La imagen pesa más de 3 MB. Reduce su tamaño antes de subirla.')
      onBusy?.(true)
      try {
        const fd = new FormData()
        fd.append('file', f)
        const res = await fetch('/api/media', { method: 'POST', body: fd })
        const j = await res.json()
        if (!res.ok) return toast(j.error ?? 'No se pudo subir la imagen.')
        setMedia((ms) => [j as AdminMedia, ...ms])
        cb(j as AdminMedia)
      } catch {
        toast('Sin conexión con el servidor. Inténtalo de nuevo.')
      } finally {
        onBusy?.(false)
      }
    }
    i.click()
  }
}

export function MediaGrid({ items, onPick }: { items: AdminMedia[]; onPick: (m: AdminMedia) => void }) {
  if (!items.length) return <Empty title="La biblioteca está vacía">Sube la primera imagen con el botón de arriba.</Empty>
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
      {items.map((m) => (
        <button key={m.id} type="button" onClick={() => onPick(m)} className="overflow-hidden rounded-[10px] border border-eg-rule bg-eg-panel p-0 text-left">
          <div className="aspect-[16/10] w-full overflow-hidden bg-eg-soft">
            <ArtImg src={m.s} />
          </div>
          <span className="block px-2.5 py-2 text-xs">
            <b className="line-clamp-1">{m.n}</b>
            {m.a ? <span className={sub}>Con texto alternativo</span> : <Badge k="er" className="mt-0.5">Falta texto alternativo</Badge>}
          </span>
        </button>
      ))}
    </div>
  )
}

function PickDialog({ pick }: { pick: (m: AdminMedia) => void }) {
  const { media, closeDialog, toast } = useAdmin()
  const upload = useUpload()
  const [busy, setBusy] = useState(false)
  return (
    <>
      <DlgTitle>Elegir imagen</DlgTitle>
      <p className="text-sm text-eg-muted">Sube una foto o elige una de la biblioteca.</p>
      <div className="my-3 flex flex-wrap gap-2">
        <B
          disabled={busy}
          onClick={() =>
            upload((m) => {
              closeDialog()
              pick(m)
              toast('Imagen subida. Escribe su texto alternativo.')
            }, setBusy)
          }
        >
          <I n="up2" />
          {busy ? 'Subiendo…' : 'Subir una imagen'}
        </B>
        <span className={`${sub} self-center`}>JPG, PNG, WebP o GIF, hasta 3 MB</span>
      </div>
      <MediaGrid
        items={media}
        onPick={(m) => {
          closeDialog()
          pick(m)
        }}
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

function AltDialog({ m }: { m: AdminMedia }) {
  const { closeDialog, setMedia, call, toast } = useAdmin()
  const [a, setA] = useState(m.a)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if ((await call(updateMediaAlt(m.id, a))) === undefined) return
        setMedia((ms) => ms.map((x) => (x.id === m.id ? { ...x, a: a.trim() } : x)))
        closeDialog()
        toast('Texto alternativo guardado')
      }}
    >
      <DlgTitle>{m.n}</DlgTitle>
      <div className="my-2.5 aspect-video w-full overflow-hidden rounded-[5px] bg-eg-soft">
        <ArtImg src={m.s} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ma" className="text-[13px] font-semibold">
          Texto alternativo
        </label>
        <input id="ma" className={inp} value={a} onChange={(e) => setA(e.target.value)} placeholder="Describe lo que se ve, para quien no puede verlo" />
        <span className={hint}>Mejora la accesibilidad y el posicionamiento en buscadores.</span>
      </div>
      <DlgRow>
        <B v="out" onClick={closeDialog}>
          Cerrar
        </B>
        <B type="submit">Guardar texto alternativo</B>
      </DlgRow>
    </form>
  )
}

export function MediaView() {
  const { media, dialog, toast } = useAdmin()
  const upload = useUpload()
  const [busy, setBusy] = useState(false)
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <h2 className={pageTitle}>Multimedia</h2>
          <div className="text-sm text-eg-muted">Toda tu biblioteca en un solo lugar. Cada imagen debe tener texto alternativo.</div>
        </div>
        <span className="flex-1" />
        <B disabled={busy} onClick={() => upload((m) => (toast('Imagen subida. Añade su texto alternativo.'), dialog(<AltDialog m={m} />)), setBusy)}>
          <I n="up2" />
          {busy ? 'Subiendo…' : 'Subir imagen'}
        </B>
      </div>
      <Card className={cp}>
        <MediaGrid items={media} onPick={(m) => dialog(<AltDialog m={m} />)} />
      </Card>
    </>
  )
}
