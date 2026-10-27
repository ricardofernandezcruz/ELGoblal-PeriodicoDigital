'use client'

import { useState } from 'react'
import { ArtImg } from '@/components/eg/art'
import type { MediaItem } from '../data'
import { useAdmin } from '../store'
import { B, Badge, Card, cp, DlgRow, DlgTitle, hint, I, inp, pageTitle, sub } from '../ui'

/** Abre el selector de archivos y devuelve la imagen como data URL (máx. 3 MB). */
export function useUpload() {
  const { setMedia, toast } = useAdmin()
  return (cb: (m: MediaItem) => void) => {
    const i = document.createElement('input')
    i.type = 'file'
    i.accept = 'image/*'
    i.onchange = () => {
      const f = i.files?.[0]
      if (!f) return
      if (f.size > 3e6) return toast('La imagen pesa más de 3 MB. Reduce su tamaño antes de subirla.')
      const r = new FileReader()
      r.onload = () => {
        const m = { s: String(r.result), n: f.name.replace(/[.][^.]+$/, ''), a: '' }
        setMedia((ms) => [m, ...ms])
        cb(m)
      }
      r.readAsDataURL(f)
    }
    i.click()
  }
}

export function MediaGrid({ items, onPick }: { items: MediaItem[]; onPick: (m: MediaItem) => void }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
      {items.map((m, i) => (
        <button
          key={m.s.slice(0, 40) + i}
          type="button"
          onClick={() => onPick(m)}
          className="overflow-hidden rounded-[10px] border border-eg-rule bg-eg-panel p-0 text-left"
        >
          <div className="aspect-[16/10] w-full overflow-hidden bg-eg-soft">
            <ArtImg src={m.s} />
          </div>
          <span className="block px-2.5 py-2 text-xs">
            <b>{m.n}</b>
            <br />
            {m.a ? <span className={sub}>Con texto alternativo</span> : <Badge k="er" className="mt-0.5">Falta texto alternativo</Badge>}
          </span>
        </button>
      ))}
    </div>
  )
}

function PickDialog({ pick }: { pick: (m: MediaItem) => void }) {
  const { media, closeDialog, toast } = useAdmin()
  const upload = useUpload()
  return (
    <>
      <DlgTitle>Elegir imagen</DlgTitle>
      <p className="text-sm text-eg-muted">Sube una foto tuya o usa la biblioteca de ilustraciones.</p>
      <div className="my-3 flex flex-wrap gap-2">
        <B
          onClick={() =>
            upload((m) => {
              closeDialog()
              pick(m)
              toast('Imagen subida')
            })
          }
        >
          <I n="up2" />
          Subir una imagen
        </B>
        <span className={`${sub} self-center`}>JPG, PNG o WebP, hasta 3 MB</span>
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
  return (pick: (m: MediaItem) => void) => dialog(<PickDialog pick={pick} />, true)
}

function AltDialog({ m, onSave }: { m: MediaItem; onSave: (a: string) => void }) {
  const { closeDialog } = useAdmin()
  const [a, setA] = useState(m.a)
  return (
    <>
      <DlgTitle>{m.n}</DlgTitle>
      <div className="my-2.5 aspect-video w-full overflow-hidden rounded-[5px] bg-eg-soft">
        <ArtImg src={m.s} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ma" className="text-[13px] font-semibold">
          Texto alternativo
        </label>
        <input
          id="ma"
          className={inp}
          value={a}
          onChange={(e) => setA(e.target.value)}
          placeholder="Describe lo que se ve, para quien no puede verlo"
        />
        <span className={hint}>Mejora la accesibilidad y el posicionamiento en buscadores.</span>
      </div>
      <DlgRow>
        <B v="out" onClick={closeDialog}>
          Cerrar
        </B>
        <B onClick={() => onSave(a)}>Guardar</B>
      </DlgRow>
    </>
  )
}

export function MediaView() {
  const { media, setMedia, dialog, closeDialog, toast } = useAdmin()
  const upload = useUpload()
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <h2 className={pageTitle}>Multimedia</h2>
          <div className="text-sm text-eg-muted">Toda tu biblioteca en un solo lugar. Cada imagen debe tener texto alternativo.</div>
        </div>
        <span className="flex-1" />
        <B onClick={() => upload(() => toast('Imagen subida. Añade su texto alternativo.'))}>
          <I n="up2" />
          Subir imagen
        </B>
      </div>
      <Card className={cp}>
        <MediaGrid
          items={media}
          onPick={(m) =>
            dialog(
              <AltDialog
                m={m}
                onSave={(a) => {
                  setMedia((ms) => ms.map((x) => (x === m ? { ...x, a } : x)))
                  closeDialog()
                  toast('Texto alternativo guardado')
                }}
              />,
            )
          }
        />
      </Card>
    </>
  )
}
