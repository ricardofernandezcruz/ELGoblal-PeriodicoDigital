'use client'

import { useState } from 'react'
import { deleteChannel, deleteVideo, saveChannel, saveVideo, setVideoStatus, updateChannels } from '@/app/redaccion/video-actions'
import { ArtImg } from '@/components/eg/art'
import { cn } from '@/lib/utils'
import { fd, num, type AdminChannel, type AdminVideo } from '../data'
import { useAdmin } from '../store'
import { B, Badge, Card, cp, DlgRow, DlgTitle, Empty, hint, I, inp, lab, pageTitle, Row2, Seg, sub, Switch, ta, Tabs } from '../ui'
import { MediaGrid, useUpload } from './media'

const ytId = (s: string) =>
  s.trim().match(/^[\w-]{11}$/)?.[0] ??
  s.match(/(?:youtu\.be\/|[?&]v=|\/(?:shorts|live|embed)\/)([\w-]{11})/)?.[1] ??
  null

export function VideosView() {
  const [tab, setTab] = useState<'own' | 'channels'>('own')
  return (
    <>
      <div className="mb-4">
        <h2 className={pageTitle}>Videos</h2>
        <div className="text-sm text-eg-muted">
          Los videos de la redacción tienen su propia página y no se mezclan con las notas. Los canales de redactores se leen solos de YouTube.
        </div>
      </div>
      <Card>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            ['own', 'Videos de la redacción'],
            ['channels', 'Canales de redactores'],
          ]}
        />
        <div className={cp}>{tab === 'own' ? <OwnVideos /> : <Channels />}</div>
      </Card>
    </>
  )
}

/* ---------- Videos propios ---------- */

function OwnVideos() {
  const { videos, setVideos, dialog, closeDialog, call, toast, can } = useAdmin()
  const publisher = can('article.publish')

  const toggle = async (v: AdminVideo) => {
    const r = await call(setVideoStatus(v.id, v.status !== 'published'))
    if (!r) return
    setVideos((l) => l.map((x) => (x.id === r.id ? r : x)))
    toast(r.status === 'published' ? 'Video publicado' : 'Video retirado del sitio')
  }

  const remove = (v: AdminVideo) =>
    dialog(
      <>
        <DlgTitle>Eliminar «{v.title}»</DlgTitle>
        <p className="text-sm text-eg-muted">Desaparece del sitio y del panel. El archivo subido no se borra del almacenamiento.</p>
        <DlgRow>
          <B v="out" onClick={closeDialog}>
            Cancelar
          </B>
          <B
            v="acc"
            onClick={async () => {
              closeDialog()
              if ((await call(deleteVideo(v.id))) === undefined) return
              setVideos((l) => l.filter((x) => x.id !== v.id))
              toast('Video eliminado')
            }}
          >
            Eliminar video
          </B>
        </DlgRow>
      </>,
    )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className={sub}>
          {videos.length} {videos.length === 1 ? 'video' : 'videos'} · {videos.filter((v) => v.status === 'published').length} publicados
        </span>
        <span className="flex-1" />
        <B v="acc" onClick={() => dialog(<VideoEditor />, true)}>
          <I n="plus" />
          Nuevo video
        </B>
      </div>
      {videos.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {videos.map((v) => (
            <div key={v.id} className="overflow-hidden rounded-xl border border-eg-rule bg-eg-bg">
              <button type="button" className="relative block aspect-video w-full border-0 bg-black p-0" onClick={() => dialog(<VideoEditor video={v} />, true)} aria-label={'Editar ' + v.title}>
                {v.poster ? <ArtImg src={v.poster} className="opacity-90" /> : <span className="grid size-full place-items-center text-white/70">Sin portada</span>}
                <span className="absolute top-2 left-2 flex gap-1.5">
                  <Badge k={v.status === 'published' ? 'pub' : ''} className="bg-eg-panel">
                    {v.status === 'published' ? 'Publicado' : 'Borrador'}
                  </Badge>
                  {v.featured && <Badge k="er" className="bg-eg-panel">Destacado</Badge>}
                </span>
                <span className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">{v.youtubeId ? 'YouTube' : 'Archivo'}</span>
              </button>
              <div className="p-3">
                <b className="line-clamp-2 font-serif text-[16px] leading-tight">{v.title}</b>
                <div className={cn(sub, 'mt-1')}>
                  {v.publishedAt ? fd(v.publishedAt) : 'Sin publicar'} · {num(v.views)} reproducciones
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <B v="out" sm onClick={() => dialog(<VideoEditor video={v} />, true)}>
                    <I n="type" />
                    Editar
                  </B>
                  {publisher && (
                    <B v="out" sm onClick={() => toggle(v)}>
                      {v.status === 'published' ? 'Retirar' : 'Publicar'}
                    </B>
                  )}
                  {v.status === 'published' && (
                    <a href={`/video/${v.slug}`} target="_blank" rel="noopener" className="inline-flex h-[30px] items-center gap-1 rounded-lg px-2 text-[13px] font-semibold hover:bg-eg-soft">
                      <I n="eye" />
                      Ver
                    </a>
                  )}
                  {publisher && (
                    <B v="ghost" ic sm aria-label={'Eliminar ' + v.title} onClick={() => remove(v)}>
                      <I n="trash" />
                    </B>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="Todavía no hay videos de la redacción">Sube un archivo o pega un enlace de YouTube con «Nuevo video».</Empty>
      )}
    </>
  )
}

/** Sube el archivo directamente al almacenamiento, con barra de progreso. */
async function uploadVideo(file: File, onProgress: (p: number) => void): Promise<string> {
  const res = await fetch('/api/video-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: file.type, size: file.size }),
  })
  const j = await res.json()
  if (!res.ok) throw new Error(j.error ?? 'No se pudo preparar la subida.')
  await new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest()
    x.open('PUT', j.uploadUrl)
    x.setRequestHeader('Content-Type', file.type)
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error('El almacenamiento rechazó el archivo (' + x.status + ').')))
    x.onerror = () => reject(new Error('Se cortó la conexión durante la subida. Inténtalo de nuevo.'))
    x.send(file)
  })
  return j.publicUrl as string
}

function VideoEditor({ video }: { video?: AdminVideo }) {
  const { sections, authors, media, me, can, call, toast, closeDialog, setVideos } = useAdmin()
  const upload = useUpload()
  const publisher = can('article.publish')
  const [source, setSource] = useState<'file' | 'youtube'>(video?.fileUrl ? 'file' : 'youtube')
  const [fileUrl, setFileUrl] = useState(video?.fileUrl ?? null)
  const [yt, setYt] = useState(video?.youtubeId ? `https://www.youtube.com/watch?v=${video.youtubeId}` : '')
  const [title, setTitle] = useState(video?.title ?? '')
  const [description, setDescription] = useState(video?.description ?? '')
  const [sectionId, setSectionId] = useState(video?.sectionId ?? '')
  const [authorId, setAuthorId] = useState(video?.authorId ?? authors.find((a) => a.name === me.name)?.id ?? '')
  const [vertical, setVertical] = useState(video?.vertical ?? false)
  const [posterId, setPosterId] = useState(video?.posterId ?? null)
  const [featured, setFeatured] = useState(video?.featured ?? false)
  const [progress, setProgress] = useState<number | null>(null)
  const [library, setLibrary] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const id = ytId(yt)
  const poster = (posterId && media.find((m) => m.id === posterId)?.s) || (source === 'youtube' && id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null)

  const pickFile = () => {
    const i = document.createElement('input')
    i.type = 'file'
    i.accept = 'video/mp4,video/webm,video/quicktime'
    i.onchange = async () => {
      const f = i.files?.[0]
      if (!f) return
      setErr('')
      setProgress(0)
      try {
        setFileUrl(await uploadVideo(f, setProgress))
        if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
        toast('Video subido')
      } catch (e) {
        setErr((e as Error).message)
      } finally {
        setProgress(null)
      }
    }
    i.click()
  }

  const save = async (publish: boolean) => {
    setErr('')
    if (title.trim().length < 3) return setErr('Escribe un título de al menos 3 caracteres.')
    if (source === 'youtube' && !id) return setErr('Pega un enlace de YouTube válido.')
    if (source === 'file' && !fileUrl) return setErr('Sube primero el archivo de video.')
    setBusy(true)
    let v = await call(
      saveVideo({
        id: video?.id ?? null,
        title,
        description,
        sectionId: sectionId || null,
        authorId: authorId || null,
        source,
        fileUrl: source === 'file' ? fileUrl : null,
        youtubeUrl: source === 'youtube' ? yt : null,
        vertical,
        posterId,
        featured,
      }),
    )
    if (v && publish && v.status !== 'published') v = await call(setVideoStatus(v.id, true))
    setBusy(false)
    if (!v) return
    setVideos((l) => {
      const without = l.filter((x) => x.id !== v!.id).map((x) => (v!.featured ? { ...x, featured: false } : x))
      return [v!, ...without]
    })
    closeDialog()
    toast(publish ? 'Video publicado' : video ? 'Cambios guardados' : 'Video guardado como borrador')
  }

  return (
    <>
      <DlgTitle>{video ? 'Editar video' : 'Nuevo video'}</DlgTitle>
      <div className="mt-3 grid grid-cols-[1fr_260px] gap-5 max-[720px]:grid-cols-1">
        <div className="grid min-w-0 content-start gap-3">
          <div className="flex flex-col gap-1.5">
            <span className={lab}>Origen del video</span>
            <div>
              <Seg
                label="Origen"
                value={source}
                onChange={setSource}
                options={[
                  ['youtube', 'Enlace de YouTube'],
                  ['file', 'Subir archivo'],
                ]}
              />
            </div>
          </div>
          {source === 'youtube' ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="v-yt" className={lab}>
                Enlace de YouTube
              </label>
              <input id="v-yt" className={inp} placeholder="https://www.youtube.com/watch?v=…" value={yt} onChange={(e) => setYt(e.target.value)} />
              <span className={hint}>{yt && !id ? 'No reconocemos ese enlace como un video de YouTube.' : 'Sirven enlaces normales, de Shorts y de directos.'}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className={lab}>Archivo</span>
              <div className="flex flex-wrap items-center gap-2">
                <B v="out" onClick={pickFile} disabled={progress !== null}>
                  <I n="up2" />
                  {fileUrl ? 'Cambiar archivo' : 'Elegir archivo'}
                </B>
                <span className={hint}>MP4, WebM o MOV, hasta 500 MB</span>
              </div>
              {progress !== null && (
                <div className="mt-1" role="status">
                  <div className="h-2 overflow-hidden rounded bg-eg-soft">
                    <i className="block h-full bg-eg-accent transition-[width]" style={{ width: progress + '%' }} />
                  </div>
                  <span className={hint}>Subiendo… {progress} %</span>
                </div>
              )}
              {fileUrl && progress === null && <video src={fileUrl} controls preload="metadata" className="mt-1 max-h-48 w-full rounded-lg bg-black" />}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="v-title" className={lab}>
              Título
            </label>
            <input id="v-title" className={inp} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="v-desc" className={lab}>
              Descripción
            </label>
            <textarea id="v-desc" className={cn(ta, 'min-h-[80px]')} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="v-sec" className={lab}>
                Categoría
              </label>
              <select id="v-sec" className={inp} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">Sin categoría</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="v-au" className={lab}>
                Firma
              </label>
              <select id="v-au" className={inp} value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
                <option value="">Sin firma</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Row2 className="py-0">
            <span>Es vertical (9:16)</span>
            <Switch checked={vertical} onChange={setVertical} />
          </Row2>
          {publisher && (
            <Row2 className="py-0">
              <span>Destacar arriba en la sección Video</span>
              <Switch checked={featured} onChange={setFeatured} />
            </Row2>
          )}
        </div>

        <div className="grid content-start gap-2">
          <span className={lab}>Portada</span>
          <div className="aspect-video overflow-hidden rounded-lg bg-eg-soft">{poster ? <ArtImg src={poster} /> : <span className="grid size-full place-items-center text-xs text-eg-muted">Sin portada</span>}</div>
          <div className="flex flex-wrap gap-1.5">
            <B
              v="out"
              sm
              onClick={() =>
                upload((m) => {
                  setPosterId(m.id)
                  setLibrary(false)
                })
              }
            >
              <I n="up2" />
              Subir
            </B>
            <B v="out" sm onClick={() => setLibrary(!library)}>
              <I n="image" />
              Biblioteca
            </B>
            {posterId && (
              <B v="ghost" sm onClick={() => setPosterId(null)}>
                Quitar
              </B>
            )}
          </div>
          <span className={hint}>{source === 'youtube' ? 'Si no eliges una, se usa la miniatura de YouTube.' : 'Recomendada: si no, se ve el primer fotograma.'}</span>
        </div>
      </div>

      {library && (
        <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-eg-rule p-3">
          <MediaGrid
            items={media}
            onPick={(m) => {
              setPosterId(m.id)
              setLibrary(false)
            }}
          />
        </div>
      )}

      <div role="alert" className="mt-3 min-h-5 text-[13px] text-eg-accent">
        {err}
      </div>
      <DlgRow className="mt-1">
        <B v="ghost" onClick={closeDialog}>
          Cancelar
        </B>
        <B v="out" disabled={busy || progress !== null} onClick={() => save(false)}>
          {video?.status === 'published' ? 'Guardar cambios' : 'Guardar borrador'}
        </B>
        {publisher && video?.status !== 'published' && (
          <B v="acc" disabled={busy || progress !== null} onClick={() => save(true)}>
            <I n="up2" />
            Publicar
          </B>
        )}
      </DlgRow>
    </>
  )
}

/* ---------- Canales de redactores ---------- */

function Channels() {
  const { channels, setChannels, authors, dialog, closeDialog, call, toast, can } = useAdmin()
  const allowed = can('home.manage')

  const persist = async (list: AdminChannel[]) => {
    setChannels(list)
    const r = await call(updateChannels(list.map((c) => ({ id: c.id, active: c.active }))))
    if (r) setChannels(r)
  }
  const mv = (i: number, j: number) => {
    const l = [...channels]
    ;[l[i], l[j]] = [l[j], l[i]]
    persist(l)
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className={sub}>Cada canal muestra lo último de YouTube (y Spotify, si tiene) en el área de Video. Se actualiza cada 15 minutos.</span>
        <span className="flex-1" />
        {allowed && (
          <B v="acc" onClick={() => dialog(<ChannelForm />)}>
            <I n="plus" />
            Añadir canal
          </B>
        )}
      </div>
      {channels.length ? (
        <div className="grid gap-3">
          {channels.map((c, i) => (
            <div key={c.id} className={cn('flex flex-wrap items-center gap-3 rounded-xl border border-eg-rule bg-eg-bg p-3.5', !c.active && 'opacity-60')}>
              <Badge k={c.active ? 'pub' : ''}>{c.label}</Badge>
              <div className="min-w-0 flex-1">
                <b className="block truncate">{c.name}</b>
                <div className={cn(sub, 'truncate')}>
                  {authors.find((a) => a.id === c.authorId)?.name ?? 'Sin redactor asignado'} ·{' '}
                  <a href={c.url} target="_blank" rel="noopener" className="underline underline-offset-2">
                    YouTube
                  </a>
                  {c.spotifyShowId && ' · Spotify'}
                </div>
              </div>
              {allowed && (
                <div className="flex items-center gap-1">
                  <B v="ghost" ic sm aria-label={'Subir ' + c.label} disabled={i === 0} onClick={() => mv(i, i - 1)}>
                    <I n="up" />
                  </B>
                  <B v="ghost" ic sm aria-label={'Bajar ' + c.label} disabled={i === channels.length - 1} onClick={() => mv(i, i + 1)}>
                    <I n="down" />
                  </B>
                  <Switch label={'Mostrar ' + c.label} checked={c.active} onChange={(v) => persist(channels.map((x) => (x.id === c.id ? { ...x, active: v } : x)))} />
                  <B v="ghost" ic sm aria-label={'Editar ' + c.label} onClick={() => dialog(<ChannelForm channel={c} />)}>
                    <I n="type" />
                  </B>
                  <B
                    v="ghost"
                    ic
                    sm
                    aria-label={'Quitar ' + c.label}
                    onClick={() =>
                      dialog(
                        <>
                          <DlgTitle>Quitar el canal «{c.label}»</DlgTitle>
                          <p className="text-sm text-eg-muted">Deja de mostrarse en el sitio. El canal de YouTube no se toca.</p>
                          <DlgRow>
                            <B v="out" onClick={closeDialog}>
                              Cancelar
                            </B>
                            <B
                              v="acc"
                              onClick={async () => {
                                closeDialog()
                                const r = await call(deleteChannel(c.id))
                                if (r) (setChannels(r), toast('Canal quitado'))
                              }}
                            >
                              Quitar canal
                            </B>
                          </DlgRow>
                        </>,
                      )
                    }
                  >
                    <I n="trash" />
                  </B>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty title="No hay canales">Añade el canal de YouTube de un redactor.</Empty>
      )}
    </>
  )
}

function ChannelForm({ channel }: { channel?: AdminChannel }) {
  const { authors, call, setChannels, closeDialog, toast } = useAdmin()
  const [label, setLabel] = useState(channel?.label ?? '')
  const [name, setName] = useState(channel?.name ?? '')
  const [youtube, setYoutube] = useState(channel?.url ?? '')
  const [spotify, setSpotify] = useState(channel?.spotifyShowId ? `https://open.spotify.com/show/${channel.spotifyShowId}` : '')
  const [authorId, setAuthorId] = useState(channel?.authorId ?? '')
  const [busy, setBusy] = useState(false)
  const field = 'flex flex-col gap-1.5'
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        const r = await call(saveChannel({ id: channel?.id ?? null, label, name, youtube, spotify: spotify || null, authorId: authorId || null }))
        setBusy(false)
        if (!r) return
        setChannels(r)
        closeDialog()
        toast(channel ? 'Canal actualizado' : 'Canal añadido: sus videos aparecerán en el área de Video')
      }}
    >
      <DlgTitle>{channel ? 'Editar canal' : 'Añadir canal de redactor'}</DlgTitle>
      <div className="mt-3 grid gap-3">
        <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
          <div className={field}>
            <label htmlFor="c-label" className={lab}>
              Etiqueta
            </label>
            <input id="c-label" className={inp} placeholder="Deportes" maxLength={30} value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className={field}>
            <label htmlFor="c-name" className={lab}>
              Nombre del programa
            </label>
            <input id="c-name" className={inp} placeholder="Cartel Deportivo" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className={field}>
          <label htmlFor="c-yt" className={lab}>
            Canal de YouTube
          </label>
          <input id="c-yt" className={inp} placeholder="https://www.youtube.com/@nombre" value={youtube} onChange={(e) => setYoutube(e.target.value)} />
        </div>
        <div className={field}>
          <label htmlFor="c-sp" className={lab}>
            Pódcast en Spotify <span className="font-normal text-eg-muted">(opcional)</span>
          </label>
          <input id="c-sp" className={inp} placeholder="https://open.spotify.com/show/…" value={spotify} onChange={(e) => setSpotify(e.target.value)} />
        </div>
        <div className={field}>
          <label htmlFor="c-au" className={lab}>
            Redactor responsable
          </label>
          <select id="c-au" className={inp} value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
            <option value="">Sin asignar</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <DlgRow>
        <B v="ghost" onClick={closeDialog}>
          Cancelar
        </B>
        <B type="submit" disabled={busy}>
          {busy ? 'Comprobando el canal…' : channel ? 'Guardar canal' : 'Añadir canal'}
        </B>
      </DlgRow>
    </form>
  )
}
