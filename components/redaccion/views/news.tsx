'use client'

import { useState } from 'react'
import { ArtImg } from '@/components/eg/art'
import { cn } from '@/lib/utils'
import { bulkSetStatus, deleteArticles, duplicateArticle } from '@/app/redaccion/actions'
import { fd, num, type Status } from '../data'
import { useAdmin } from '../store'
import { B, Card, chk, cp, DlgRow, DlgTitle, Empty, I, inp, Seg, StatusBadge, sub, Tabs, Tbl, Thumb } from '../ui'

type Tab = 'all' | Status

export function NewsView() {
  const { newNote } = useAdmin()
  const [view, setView] = useState<'list' | 'cal'>('list')
  const [q, setQ] = useState('')
  return (
    <Card>
      <div className={`${cp} flex flex-wrap items-center gap-2.5`}>
        <Seg
          label="Vista"
          value={view}
          onChange={setView}
          options={[
            ['list', 'Lista'],
            ['cal', 'Calendario editorial'],
          ]}
        />
        <span className="flex-1" />
        <input
          className={cn(inp, 'w-[260px] max-[600px]:w-full')}
          placeholder="Buscar por titular, autor o sección"
          aria-label="Buscar notas"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <B v="acc" onClick={() => newNote()}>
          <I n="plus" />
          Nueva nota
        </B>
      </div>
      {view === 'list' ? <List q={q} /> : <Calendar />}
    </Card>
  )
}

function List({ q }: { q: string }) {
  const { news, setNews, openEd, toast, dialog, closeDialog, call, can } = useAdmin()
  const [tab, setTab] = useState<Tab>('all')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const cnt = (s: Tab) => (s === 'all' ? news.length : news.filter((n) => n.st === s).length)
  const l = news.filter(
    (n) => (tab === 'all' || n.st === tab) && (!q || (n.t + n.au + n.sec).toLowerCase().includes(q.toLowerCase())),
  )
  const toggle = (id: string, on: boolean) => {
    const s = new Set(sel)
    if (on) s.add(id)
    else s.delete(id)
    setSel(s)
  }

  const bulk = (k: 'pub' | 'draft' | 'del') => {
    if (k === 'del') {
      dialog(
        <>
          <DlgTitle>Eliminar {sel.size} notas</DlgTitle>
          <p className="text-sm text-eg-muted">Se borran de forma definitiva, junto con sus versiones y comentarios. No se puede deshacer.</p>
          <DlgRow>
            <B v="out" onClick={closeDialog}>
              Cancelar
            </B>
            <B
              v="acc"
              onClick={async () => {
                closeDialog()
                const gone = await call(deleteArticles([...sel]))
                if (!gone) return
                setNews((ns) => ns.filter((n) => !gone.includes(n.id)))
                setSel(new Set())
                toast(gone.length === 1 ? 'Nota eliminada' : `${gone.length} notas eliminadas`)
              }}
            >
              Eliminar {sel.size} notas
            </B>
          </DlgRow>
        </>,
      )
      return
    }
    call(bulkSetStatus([...sel], k)).then((rows) => {
      if (!rows) return
      const m = new Map(rows.map((r) => [r.id, r]))
      setNews((ns) => ns.map((n) => m.get(n.id) ?? n))
      setSel(new Set())
      toast('Estado actualizado')
    })
  }

  return (
    <>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={(
          [
            ['all', 'Todas'],
            ['pub', 'Publicadas'],
            ['sch', 'Programadas'],
            ['rev', 'En revisión'],
            ['draft', 'Borradores'],
          ] as [Tab, string][]
        ).map(([k, t]) => [
          k,
          <>
            {t} <span className={sub}>{cnt(k)}</span>
          </>,
        ])}
      />
      {sel.size > 0 && (
        <div className={`${cp} flex flex-wrap items-center gap-2 bg-eg-soft`}>
          <b>{sel.size} seleccionadas</b>
          {can('article.publish') && (
            <>
              <B v="out" sm onClick={() => bulk('pub')}>
                Publicar
              </B>
              <B v="out" sm onClick={() => bulk('draft')}>
                Pasar a borrador
              </B>
            </>
          )}
          <B v="out" sm onClick={() => bulk('del')}>
            Eliminar
          </B>
        </div>
      )}
      {l.length ? (
        <div className="overflow-auto">
          <Tbl>
            <thead>
              <tr>
                <th className="w-9">
                  <input
                    type="checkbox"
                    className={chk}
                    aria-label="Seleccionar todas"
                    checked={l.every((n) => sel.has(n.id))}
                    onChange={(e) => {
                      const s = new Set(sel)
                      l.forEach((n) => (e.target.checked ? s.add(n.id) : s.delete(n.id)))
                      setSel(s)
                    }}
                  />
                </th>
                <th>Titular</th>
                <th>Sección</th>
                <th>Autor</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th className="!text-right">Lecturas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {l.map((n) => (
                <tr key={n.id}>
                  <td>
                    <input
                      type="checkbox"
                      className={chk}
                      checked={sel.has(n.id)}
                      onChange={(e) => toggle(n.id, e.target.checked)}
                      aria-label="Seleccionar nota"
                    />
                  </td>
                  <td>
                    <div className="flex min-w-[280px] items-center gap-3">
                      <Thumb>{n.art && <ArtImg src={n.art} />}</Thumb>
                      <a
                        href="#"
                        className="font-semibold"
                        onClick={(e) => {
                          e.preventDefault()
                          openEd(n.id)
                        }}
                      >
                        {n.t || 'Sin titular'}
                      </a>
                    </div>
                  </td>
                  <td>{n.sec}</td>
                  <td className="whitespace-nowrap">{n.au}</td>
                  <td>
                    <StatusBadge st={n.st} />
                  </td>
                  <td className="whitespace-nowrap">{fd(n.d)}</td>
                  <td className="text-right tabular-nums">{n.r ? num(n.r) : '—'}</td>
                  <td className="whitespace-nowrap">
                    <B v="ghost" ic sm aria-label="Editar nota" onClick={() => openEd(n.id)}>
                      <I n="type" />
                    </B>
                    <B
                      v="ghost"
                      ic
                      sm
                      aria-label="Duplicar nota"
                      onClick={async () => {
                        const row = await call(duplicateArticle(n.id))
                        if (!row) return
                        setNews((ns) => [row, ...ns])
                        toast('Nota duplicada como borrador')
                      }}
                    >
                      <I n="copy" />
                    </B>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tbl>
        </div>
      ) : (
        <Empty title="No hay notas con ese filtro">Prueba con otra búsqueda o crea una nota nueva.</Empty>
      )}
    </>
  )
}

function Calendar() {
  const { news, openEd, newNote } = useAdmin()
  const [calM, setCalM] = useState(() => new Date())
  const y = calM.getFullYear(),
    m = calM.getMonth(),
    first = new Date(y, m, 1),
    start = (first.getDay() + 6) % 7,
    days = new Date(y, m + 1, 0).getDate(),
    today = new Date().toDateString()
  const cells = Array.from({ length: Math.ceil((start + days) / 7) * 7 }, (_, i) => i - start + 1)

  return (
    <>
      <div className={`${cp} flex flex-wrap items-center gap-2.5`}>
        <B v="out" ic sm aria-label="Mes anterior" onClick={() => setCalM(new Date(y, m - 1, 1))}>
          <I n="left" />
        </B>
        <b className="min-w-[150px] text-center font-serif text-xl font-semibold capitalize">
          {calM.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}
        </b>
        <B v="out" ic sm aria-label="Mes siguiente" onClick={() => setCalM(new Date(y, m + 1, 1))}>
          <I n="right" />
        </B>
        <span className={sub}>Haz clic en un día vacío para programar una nota ese día</span>
      </div>
      <div className={`${cp} overflow-auto pt-0`}>
        <div className="grid min-w-[640px] grid-cols-7 border-t border-l border-eg-rule">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
            <div key={d} className="border-r border-b border-eg-rule bg-eg-soft p-1.5 text-xs font-semibold text-eg-muted">
              {d}
            </div>
          ))}
          {cells.map((dn, i) => {
            const ok = dn >= 1 && dn <= days
            const dt = new Date(y, m, dn)
            const ev = ok ? news.filter((n) => n.d && new Date(n.d).toDateString() === dt.toDateString()) : []
            return (
              <div
                key={i}
                onClick={ok ? () => newNote(new Date(y, m, dn, 8, 0)) : undefined}
                className={cn(
                  'min-h-24 border-r border-b border-eg-rule p-1.5 text-xs',
                  ok ? 'cursor-pointer hover:bg-eg-soft' : 'opacity-45',
                  ok && dt.toDateString() === today && 'bg-eg-accent/8',
                )}
              >
                {ok && <b>{dn}</b>}
                {ev.map((n) => (
                  <button
                    key={n.id}
                    title={n.t}
                    onClick={(e) => {
                      e.stopPropagation()
                      openEd(n.id)
                    }}
                    className={cn(
                      'mt-[3px] block w-full truncate rounded-[5px] border-0 px-1.5 py-0.5 text-left text-[11px] font-semibold',
                      n.st === 'pub' ? 'bg-eg-ok/20 text-eg-ok' : 'bg-eg-info/20 text-eg-info',
                    )}
                  >
                    {new Date(n.d!).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })} {n.t}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
