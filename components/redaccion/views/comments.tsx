'use client'

import { ArtImg } from '@/components/eg/art'
import { useAdmin } from '../store'
import { B, Badge, Card, cp, Empty, I, pageTitle, sub } from '../ui'

export function Comments() {
  const { com, setCom, toast } = useAdmin()
  const act = (i: number, ok: boolean) => {
    setCom((c) => c.filter((_, j) => j !== i))
    toast(ok ? 'Comentario aprobado' : 'Comentario rechazado')
  }
  return (
    <>
      <div className="mb-4">
        <h2 className={pageTitle}>Comentarios por moderar</h2>
        <div className="text-sm text-eg-muted">{com.length ? com.length + ' esperando. El sistema marca los que parecen spam.' : ''}</div>
      </div>
      <Card className={cp}>
        {com.length ? (
          com.map((c, i) => (
            <div key={c.who + i} className="flex gap-3 border-t border-eg-rule py-3.5 first:border-0 max-[600px]:flex-wrap">
              <div className="size-9 flex-none overflow-hidden rounded-full">
                <ArtImg src={c.av} />
              </div>
              <div className="min-w-0 flex-1">
                <b>{c.who}</b> {c.spam && <Badge k="er">Parece spam</Badge>}
                <div className={sub}>En: {c.on}</div>
                <p className="mt-1.5 mb-0">{c.text}</p>
              </div>
              <div className="flex items-start gap-1.5">
                <B v="out" sm onClick={() => act(i, true)}>
                  <I n="check" />
                  Aprobar
                </B>
                <B v="out" sm onClick={() => act(i, false)}>
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
