import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteChrome } from '@/components/site/chrome'
import { getMenu } from '@/lib/queries'

export const metadata: Metadata = { title: 'Página no encontrada · El Global', robots: { index: false } }

export default async function NotFound() {
  const menu = await getMenu().catch(() => [])
  return (
    <SiteChrome menu={menu}>
      <main className="mx-auto max-w-[680px] px-5 py-20 text-center">
        <p className="m-0 font-serif text-[clamp(64px,12vw,120px)] leading-none font-medium text-eg-accent">404</p>
        <h1 className="mt-4 mb-3 font-serif text-[clamp(28px,4vw,40px)] leading-[1.1] font-medium">No encontramos esta página</h1>
        <p className="mx-auto mb-8 max-w-[44ch] font-serif text-[19px] leading-normal text-eg-muted">
          Puede que la nota haya cambiado de dirección o que el enlace esté incompleto. Prueba a buscarla o vuelve a la portada.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex min-h-11 items-center rounded bg-eg-ink px-5 font-semibold text-eg-bg hover:opacity-90">
            Ir a la portada
          </Link>
          <Link href="/video" className="inline-flex min-h-11 items-center rounded border border-eg-rule px-5 font-semibold hover:bg-eg-surface">
            Ver los videos
          </Link>
        </div>
        <p className="mt-6 text-sm text-eg-muted">
          También puedes pulsar <kbd className="rounded border border-eg-rule px-1.5 py-0.5 font-sans text-xs">/</kbd> para buscar.
        </p>
      </main>
    </SiteChrome>
  )
}
