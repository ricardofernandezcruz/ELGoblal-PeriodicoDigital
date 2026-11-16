'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { SiteChrome } from '@/components/site/chrome'

/** Error inesperado en una página: se ofrece reintentar sin perder el resto del sitio. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <SiteChrome menu={[]}>
      <main className="mx-auto max-w-[680px] px-5 py-20 text-center">
        <h1 className="mb-3 font-serif text-[clamp(28px,4vw,40px)] leading-[1.1] font-medium">Algo falló al cargar esta página</h1>
        <p className="mx-auto mb-8 max-w-[44ch] font-serif text-[19px] leading-normal text-eg-muted">
          Puede ser un problema pasajero de conexión. Vuelve a intentarlo; si sigue pasando, prueba en unos minutos.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="inline-flex min-h-11 items-center rounded border-0 bg-eg-ink px-5 font-semibold text-eg-bg hover:opacity-90">
            Reintentar
          </button>
          <Link href="/" className="inline-flex min-h-11 items-center rounded border border-eg-rule px-5 font-semibold hover:bg-eg-surface">
            Ir a la portada
          </Link>
        </div>
        {error.digest && <p className="mt-8 text-xs text-eg-muted">Código del error: {error.digest}</p>}
      </main>
    </SiteChrome>
  )
}
