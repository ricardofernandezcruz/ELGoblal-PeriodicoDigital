'use client'

import { moderateComment } from '@/app/redaccion/actions'
import { fd } from '../data'
import { useAdmin } from '../store'
import { B, Badge, Card, cp, Empty, I, pageTitle, sub } from '../ui'

export function Comments() {
  const { com, setCom, toast, call, can } = useAdmin()
  const allowed = can('comment.moderate')
  const act = async (id: string, ok: boolean) => {
    if ((await call(moderateComment(id, ok))) === undefined) return
    setCom((c) => c.filter((x) => x.id !== id))
    toast(ok ? 'Comentario aprobado: ya se ve en la nota' : 'Comentario rechazado')
  }
  return (
    <>
      <div className="mb-4">
        <h2 className={pageTitle}>Comentarios por moderar</h2>
        <div className="text-sm text-eg-muted">
          {com.length ? com.length + ' esperando. El sistema marca los que parecen spam.' : 'Los comentarios de los lectores llegan aquí antes de publicarse.'}
        </div>
      </div>
      <Card className={cp}>
        {!allowed ? (
          <Empty title="No tienes permiso para moderar">Pídele a un editor que revise los comentarios.</Empty>
        ) : com.length ? (
          com.map((c) => (
            <div key={c.id} className="flex gap-3 border-t border-eg-rule py-3.5 first:border-0 max-[600px]:flex-wrap">
              <div className="grid size-9 flex-none place-items-center rounded-full bg-eg-soft font-semibold text-eg-muted">
                {c.who.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <b>{c.who}</b> {c.spam && <Badge k="er">Parece spam</Badge>}
                <div className={sub}>
                  En: {c.on} · {fd(c.at)}
                </div>
                <p className="mt-1.5 mb-0 break-words whitespace-pre-line">{c.text}</p>
              </div>
              <div className="flex items-start gap-1.5">
                <B v="out" sm onClick={() => act(c.id, true)}>
                  <I n="check" />
                  Aprobar
                </B>
                <B v="out" sm onClick={() => act(c.id, false)}>
                  <I n="x" />
                  Rechazar
                </B>
              </div>
            </div>
          ))
        ) : (
          <Empty title="Todo al día">No hay comentarios pendientes.</Empty>
        )}
      </Card>
    </>
  )
}
