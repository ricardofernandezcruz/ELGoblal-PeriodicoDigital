'use client'

import { useCallback, useEffect, useState } from 'react'
import { adReport, deleteAd, listAds, saveAd, setAdPaused } from '@/app/redaccion/ads-actions'
import { ImagePrepError, prepareImage } from '@/lib/client-image'
import { AD_DESKTOP, AD_MOBILE, AD_STATUS_LABEL, adStatus, ctr, PLACEMENT_IDS, PLACEMENTS, type AdCreative, type AdminAd, type AdReport, type Placement } from '@/lib/ads-shared'
import { cn } from '@/lib/utils'
import { fd, loc, num } from '../data'
import { useAdmin } from '../store'
import { B, Badge, Card, cp, DlgRow, DlgTitle, Empty, h3, hint, I, inp, lab, pageTitle, sub, Tbl } from '../ui'

const MAX_VIDEO = 25 * 1024 * 1024
const STATUS_BADGE = { active: 'pub', scheduled: 'sch', ended: '', paused: 'rev' } as const

/* ---------- Subida de piezas ---------- */

async function uploadAdImage(f: File): Promise<AdCreative> {
  const img = await prepareImage(f)
  const fd = new FormData()
  fd.append('file', img.file)
  fd.append('purpose', 'ad')
  const res = await fetch('/api/media', { method: 'POST', body: fd })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error ?? 'No se pudo subir la imagen.')
  return { type: 'image', url: j.url, w: img.width, h: img.height }
}

const videoSize = (f: File) =>
  new Promise<{ w: number; h: number }>((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      resolve({ w: v.videoWidth, h: v.videoHeight })
      URL.revokeObjectURL(v.src)
    }
    v.onerror = () => reject(new Error('No se pudo leer el video. Usa MP4 o WebM.'))
    v.src = URL.createObjectURL(f)
  })

async function uploadAdVideo(f: File, onProgress: (p: number) => void): Promise<AdCreative> {
  if (f.size > MAX_VIDEO) throw new Error('El video pesa más de 25 MB. Para publicidad conviene que sea corto y ligero (menos de 15 segundos).')
  const { w, h } = await videoSize(f)
  const res = await fetch('/api/video-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: f.type, size: f.size }) })
  const j = await res.json()
  if (!res.ok) throw new Error(j.error ?? 'No se pudo preparar la subida.')
  await new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest()
    x.open('PUT', j.uploadUrl)
    x.setRequestHeader('Content-Type', f.type)
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error('El almacenamiento rechazó el archivo (' + x.status + ').')))
    x.onerror = () => reject(new Error('Se cortó la conexión durante la subida. Inténtalo de nuevo.'))
    x.send(f)
  })
  return { type: 'video', url: j.publicUrl, w, h }
}

function Preview({ c, className }: { c: AdCreative; className?: string }) {
  return c.type === 'video' ? (
    <video src={c.url} muted loop autoPlay playsInline className={cn('size-full object-contain', className)} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={c.url} alt="" className={cn('size-full object-contain', className)} />
  )
}

/** Pieza para computadora o celular: subir, ver y comprobar el formato. */
type Size = readonly [number, number]

function CreativeInput({ label, formats, value, onChange }: { label: string; formats: Size[]; value: AdCreative | null; onChange: (c: AdCreative | null) => void }) {
  const { toast } = useAdmin()
  const [busy, setBusy] = useState<string | null>(null)
  const pickFile = (accept: string, video: boolean) => {
    const i = document.createElement('input')
    i.type = 'file'
    i.accept = accept
    i.onchange = async () => {
      const f = i.files?.[0]
      if (!f) return
      setBusy(video ? 'Subiendo… 0 %' : 'Optimizando…')
      try {
        onChange(video ? await uploadAdVideo(f, (p) => setBusy(`Subiendo… ${p} %`)) : await uploadAdImage(f))
      } catch (e) {
        toast(e instanceof ImagePrepError || e instanceof Error ? e.message : 'No se pudo subir el archivo.')
      } finally {
        setBusy(null)
      }
    }
    i.click()
  }
  // ¿El formato coincide (±10 %) con alguno de los espacios elegidos?
  const fits = !value || !formats.length || formats.some(([w, h]) => Math.abs(value.w / value.h / (w / h) - 1) < 0.1)
  const [fw, fh] = formats[0] ?? [16, 9]
  return (
    <div className="grid min-w-0 content-start gap-2">
      <span className={lab}>{label}</span>
      <div className="grid place-items-center overflow-hidden rounded-lg border border-dashed border-eg-rule bg-eg-soft" style={{ aspectRatio: value ? `${value.w} / ${value.h}` : `${fw} / ${fh}`, maxHeight: 220 }}>
        {value ? <Preview c={value} /> : <span className={cn(sub, 'p-3 text-center')}>{busy ?? 'Sin archivo'}</span>}
      </div>
      {value && (
        <span className={hint}>
          {value.type === 'video' ? 'Video' : 'Imagen'} · {value.w}×{value.h} px
        </span>
      )}
      {!fits && <span className="rounded-md bg-eg-warn/14 px-2 py-1 text-xs text-eg-warn">No tiene el tamaño recomendado: se verá con bandas a los lados o arriba y abajo.</span>}
      <div className="flex flex-wrap gap-1.5">
        <B v="out" sm disabled={!!busy} onClick={() => pickFile('image/jpeg,image/png,image/webp,image/gif', false)}>
          <I n="image" />
          Imagen o GIF
        </B>
        <B v="out" sm disabled={!!busy} onClick={() => pickFile('video/mp4,video/webm', true)}>
          <I n="video" />
          Video
        </B>
        {value && (
          <B v="ghost" sm onClick={() => onChange(null)}>
            Quitar
          </B>
        )}
      </div>
      {busy && value && <span className={hint}>{busy}</span>}
    </div>
  )
}

/* ---------- Formulario de campaña ---------- */

const iso = (local: string) => (local ? new Date(local).toISOString() : null)

function AdEditor({ ad, onSaved }: { ad?: AdminAd; onSaved: () => void }) {
  const { sections, call, toast, closeDialog } = useAdmin()
  const [f, setF] = useState({
    name: ad?.name ?? '',
    advertiser: ad?.advertiser ?? '',
    url: ad?.url ?? 'https://',
    alt: ad?.alt ?? '',
    paused: ad?.paused ?? false,
    startsAt: ad?.startsAt ? loc(ad.startsAt) : '',
    endsAt: ad?.endsAt ? loc(ad.endsAt) : '',
    placements: ad?.placements ?? (['home-top'] as Placement[]),
    sections: ad?.sections ?? [],
    weight: ad?.weight ?? 1,
    desktop: ad?.desktop ?? null,
    mobile: ad?.mobile ?? null,
  })
  const [busy, setBusy] = useState(false)
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))

  const save = async () => {
    setBusy(true)
    const id = await call(saveAd({ ...f, id: ad?.id ?? null, startsAt: iso(f.startsAt), endsAt: iso(f.endsAt) }))
    setBusy(false)
    if (!id) return
    closeDialog()
    toast(ad ? 'Campaña guardada' : 'Campaña creada')
    onSaved()
  }

  return (
    <>
      <DlgTitle>{ad ? 'Editar campaña' : 'Nueva campaña'}</DlgTitle>
      <div className="mt-3 grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="an" className={lab}>
            Nombre de la campaña
          </label>
          <input id="an" className={inp} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej.: Navidad Supermercado X" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="aa" className={lab}>
            Anunciante
          </label>
          <input id="aa" className={inp} value={f.advertiser} onChange={(e) => set({ advertiser: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="au" className={lab}>
            Enlace de destino
          </label>
          <input id="au" className={inp} inputMode="url" value={f.url} onChange={(e) => set({ url: e.target.value })} />
          <span className={hint}>Adónde lleva el clic. Se abre en otra pestaña.</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="at" className={lab}>
            Descripción del anuncio
          </label>
          <input id="at" className={inp} value={f.alt} onChange={(e) => set({ alt: e.target.value })} placeholder="Ej.: Ofertas de Navidad en Supermercado X" />
          <span className={hint}>Para quien no puede ver la imagen.</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="as" className={lab}>
            Empieza <span className="font-normal text-eg-muted">(vacío = ya)</span>
          </label>
          <input id="as" type="datetime-local" className={inp} value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ae" className={lab}>
            Termina <span className="font-normal text-eg-muted">(vacío = sin fin)</span>
          </label>
          <input id="ae" type="datetime-local" className={inp} value={f.endsAt} min={f.startsAt || undefined} onChange={(e) => set({ endsAt: e.target.value })} />
        </div>
      </div>

      <div className="mt-4">
        <span className={lab}>Dónde sale</span>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 max-[640px]:grid-cols-1">
          {PLACEMENT_IDS.map((p) => {
            const on = f.placements.includes(p)
            const pl = PLACEMENTS[p]
            return (
              <label key={p} className={cn('flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5', on ? 'border-eg-ink bg-eg-soft' : 'border-eg-rule')}>
                <input type="checkbox" className="mt-0.5 size-4 accent-eg-accent" checked={on} onChange={() => set({ placements: on ? f.placements.filter((x) => x !== p) : [...f.placements, p] })} />
                <span className="min-w-0">
                  <b className="block text-[13px]">{pl.label}</b>

                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="mt-4">
        <span className={lab}>Secciones</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={!f.sections.length}
            onClick={() => set({ sections: [] })}
            className="min-h-8 rounded-full border border-eg-rule bg-eg-panel px-3 text-[13px] font-medium aria-pressed:border-eg-ink aria-pressed:bg-eg-ink aria-pressed:text-eg-bg"
          >
            Todas
          </button>
          {sections.map((s) => {
            const on = f.sections.includes(s.slug)
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => set({ sections: on ? f.sections.filter((x) => x !== s.slug) : [...f.sections, s.slug] })}
                className="min-h-8 rounded-full border border-eg-rule bg-eg-panel px-3 text-[13px] font-medium aria-pressed:border-eg-ink aria-pressed:bg-eg-ink aria-pressed:text-eg-bg"
              >
                {s.name}
              </button>
            )
          })}
        </div>
        <span className={hint}>Afecta a las notas y a las páginas de sección. En la portada y en Video salen solo las campañas para «Todas».</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
        <CreativeInput label="Pieza para computadora · 970×250" formats={[AD_DESKTOP]} value={f.desktop} onChange={(c) => set({ desktop: c })} />
        <CreativeInput label="Pieza para celular · 300×250" formats={[AD_MOBILE]} value={f.mobile} onChange={(c) => set({ mobile: c })} />
      </div>
      <p className={cn(hint, 'mt-2')}>Las dos medidas sirven para todos los espacios. Si falta una, se usa la otra. Los videos se reproducen sin sonido y en bucle; mejor si duran menos de 15 segundos.</p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[13px]">
          Peso en la rotación
          <select className={cn(inp, 'h-8 w-[70px]')} value={f.weight} onChange={(e) => set({ weight: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" className="size-4 accent-eg-accent" checked={f.paused} onChange={(e) => set({ paused: e.target.checked })} />
          Guardar en pausa
        </label>
      </div>
      <p className={cn(hint, 'mt-1')}>Si varias campañas comparten espacio, se turnan; una con peso 3 sale el triple que una con peso 1.</p>

      <DlgRow>
        <B v="out" onClick={closeDialog}>
          Cancelar
        </B>
        <B v="acc" disabled={busy} onClick={save}>
          {busy ? 'Guardando…' : ad ? 'Guardar cambios' : 'Crear campaña'}
        </B>
      </DlgRow>
    </>
  )
}

/* ---------- Informe ---------- */

function Report({ ad }: { ad: AdminAd }) {
  const { closeDialog, toast } = useAdmin()
  const [r, setR] = useState<AdReport | null>(null)
  useEffect(() => {
    adReport(ad.id).then((x) => x.ok && setR(x.data))
  }, [ad.id])
  const text = r
    ? [
        `Informe de la campaña «${ad.name}»${ad.advertiser ? ` (${ad.advertiser})` : ''} en El Global`,
        `Últimos 60 días: ${num(r.views)} vistas, ${num(r.clicks)} clics, ${ctr(r.views, r.clicks)} de clics.`,
        '',
        'Por espacio:',
        ...r.byPlacement.map((p) => `- ${PLACEMENTS[p.placement as Placement]?.label ?? p.placement}: ${num(p.views)} vistas, ${num(p.clicks)} clics (${ctr(p.views, p.clicks)})`),
        '',
        'Una vista cuenta cuando al menos la mitad del anuncio estuvo en pantalla durante 1 segundo.',
      ].join('\n')
    : ''
  return (
    <>
      <DlgTitle>Informe · {ad.name}</DlgTitle>
      {!r ? (
        <p className={sub}>Cargando…</p>
      ) : (
        <>
          <div className="my-3 grid grid-cols-3 gap-2 text-center">
            {[
              [num(r.views), 'vistas'],
              [num(r.clicks), 'clics'],
              [ctr(r.views, r.clicks), 'de clics'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-lg bg-eg-soft px-2 py-3">
                <b className="block font-serif text-[24px] leading-none">{n}</b>
                <span className={sub}>{l}</span>
              </div>
            ))}
          </div>
          <p className={cn(hint, 'mb-2')}>Últimos 60 días. Una vista cuenta cuando al menos la mitad del anuncio estuvo en pantalla durante 1 segundo.</p>
          {r.byPlacement.length ? (
            <div className="max-h-[300px] overflow-auto">
              <Tbl>
                <thead>
                  <tr>
                    <th>Espacio</th>
                    <th className="text-right">Vistas</th>
                    <th className="text-right">Clics</th>
                    <th className="text-right">% clics</th>
                  </tr>
                </thead>
                <tbody>
                  {r.byPlacement.map((p) => (
                    <tr key={p.placement}>
                      <td>{PLACEMENTS[p.placement as Placement]?.label ?? p.placement}</td>
                      <td className="text-right tabular-nums">{num(p.views)}</td>
                      <td className="text-right tabular-nums">{num(p.clicks)}</td>
                      <td className="text-right tabular-nums">{ctr(p.views, p.clicks)}</td>
                    </tr>
                  ))}
                  {r.byDay.slice(0, 14).map((d, i) => (
                    <tr key={d.day} className={i === 0 ? 'border-t-2 border-eg-rule' : undefined}>
                      <td className={sub}>{new Date(d.day + 'T12:00').toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                      <td className="text-right tabular-nums">{num(d.views)}</td>
                      <td className="text-right tabular-nums">{num(d.clicks)}</td>
                      <td className="text-right tabular-nums">{ctr(d.views, d.clicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </Tbl>
            </div>
          ) : (
            <Empty title="Todavía sin datos">Las vistas aparecen en cuanto el anuncio se muestra en el sitio.</Empty>
          )}
        </>
      )}
      <DlgRow>
        <B
          v="out"
          disabled={!r}
          onClick={() =>
            navigator.clipboard.writeText(text).then(
              () => toast('Informe copiado: pégalo en un correo o WhatsApp'),
              () => toast('No se pudo copiar'),
            )
          }
        >
          <I n="copy" />
          Copiar informe
        </B>
        <B onClick={closeDialog}>Cerrar</B>
      </DlgRow>
    </>
  )
}

/* ---------- Vista ---------- */

export function AdsView() {
  const { call, toast, dialog, closeDialog } = useAdmin()
  const [ads, setAds] = useState<AdminAd[] | null>(null)
  const load = useCallback(() => {
    listAds().then((r) => (r.ok ? setAds(r.data) : toast(r.error)))
  }, [toast])
  useEffect(load, [load])

  const open = (ad?: AdminAd) => dialog(<AdEditor ad={ad} onSaved={load} />, true)
  const remove = (ad: AdminAd) =>
    dialog(
      <>
        <DlgTitle>¿Eliminar «{ad.name}»?</DlgTitle>
        <p className="text-sm text-eg-muted">Deja de mostrarse al momento y se borran sus archivos y estadísticas. No se puede deshacer; si solo quieres detenerla, ponla en pausa.</p>
        <DlgRow>
          <B v="out" onClick={closeDialog}>
            Cancelar
          </B>
          <B
            v="acc"
            onClick={async () => {
              closeDialog()
              if ((await call(deleteAd(ad.id))) === undefined) return
              setAds((l) => l?.filter((x) => x.id !== ad.id) ?? null)
              toast('Campaña eliminada')
            }}
          >
            Eliminar campaña
          </B>
        </DlgRow>
      </>,
    )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <h2 className={pageTitle}>Publicidad</h2>
          <div className="text-sm text-eg-muted">Campañas, espacios y resultados. Los cambios se ven en el sitio en menos de un minuto.</div>
        </div>
        <span className="flex-1" />
        <B v="acc" onClick={() => open()}>
          <I n="plus" />
          Nueva campaña
        </B>
      </div>

      <Card className={cn(cp, 'mb-4')}>
        <h3 className={h3}>Cómo se muestra</h3>
        <ul className="mt-2 mb-0 grid gap-1 pl-5 text-[13px] text-eg-muted max-[640px]:pl-4">
          <li>Siempre con la etiqueta «Publicidad», sin ventanas emergentes ni sonido.</li>
          <li>El hueco está reservado: la página no salta cuando carga el anuncio. Si un espacio no tiene campañas, no ocupa nada.</li>
          <li>Los videos solo se reproducen mientras están a la vista.</li>
          <li>Las campañas se encienden y se apagan solas según sus fechas.</li>
        </ul>
      </Card>

      {ads === null ? (
        <Card className={cp}>
          <span className={sub}>Cargando…</span>
        </Card>
      ) : ads.length ? (
        <div className="grid gap-3">
          {ads.map((a) => {
            const st = adStatus(a)
            const c = a.desktop ?? a.mobile
            return (
              <Card key={a.id} className="grid grid-cols-[180px_1fr_auto] items-center gap-4 p-3 max-[900px]:grid-cols-[120px_1fr] max-[560px]:grid-cols-1">
                <div className="grid aspect-[16/9] place-items-center overflow-hidden rounded-lg bg-eg-soft">{c ? <Preview c={c} /> : <span className={sub}>Sin pieza</span>}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="font-serif text-[17px]">{a.name}</b>
                    <Badge k={STATUS_BADGE[st]}>{AD_STATUS_LABEL[st]}</Badge>
                  </div>
                  <div className={cn(sub, 'mt-0.5')}>
                    {a.advertiser || 'Sin anunciante'} · {a.startsAt ? fd(a.startsAt) : 'Desde ya'} → {a.endsAt ? fd(a.endsAt) : 'sin fin'}
                  </div>
                  <div className={cn(sub, 'mt-0.5 line-clamp-1')}>{a.placements.map((p) => PLACEMENTS[p].label).join(' · ')}</div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 text-[13px] tabular-nums">
                    <span>
                      <b>{num(a.views)}</b> vistas
                    </span>
                    <span>
                      <b>{num(a.clicks)}</b> clics
                    </span>
                    <span>
                      <b>{ctr(a.views, a.clicks)}</b> de clics
                    </span>
                    <span className={sub}>últimos 30 días</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-[900px]:col-span-2 max-[560px]:col-span-1">
                  <B v="out" sm onClick={() => open(a)}>
                    <I n="type" />
                    Editar
                  </B>
                  {st !== 'ended' && (
                    <B
                      v="out"
                      sm
                      onClick={async () => {
                        if ((await call(setAdPaused(a.id, !a.paused))) === undefined) return
                        setAds((l) => l?.map((x) => (x.id === a.id ? { ...x, paused: !a.paused } : x)) ?? null)
                        toast(a.paused ? 'Campaña reanudada' : 'Campaña en pausa')
                      }}
                    >
                      {a.paused ? 'Reanudar' : 'Pausar'}
                    </B>
                  )}
                  <B v="out" sm onClick={() => dialog(<Report ad={a} />, true)}>
                    <I n="chart" />
                    Informe
                  </B>
                  <B v="ghost" ic sm aria-label={'Eliminar ' + a.name} onClick={() => remove(a)}>
                    <I n="trash" />
                  </B>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <Empty title="Todavía no hay campañas">Crea la primera con «Nueva campaña»: sube la imagen, GIF o video, elige dónde sale y sus fechas.</Empty>
        </Card>
      )}
    </>
  )
}
