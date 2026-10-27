import Link from 'next/link'
import { ContenidoHeader } from '@/components/contenido/contenido-header'
import { h2, sub } from '@/components/contenido/styles'

const PAGES = [
  ['/', 'Portada', 'Sistema visual, header, megamenú, buscador, hero, Para ti, En directo, opinión y footer.'],
  ['/articulo', 'Artículo y componentes', 'Página de lectura, muro de pago, comentarios, tarjetas, chips, skeletons, toasts y cookies.'],
  ['/movil', 'Móvil, detalles y hoja de ruta', 'Teléfono simulado, zona del pulgar, comprobador de contraste y plan por fases.'],
  ['/contenido', 'Contenido y guía', 'En directo completo, multimedia, datos, newsletter y guía de diseño.'],
  ['/redaccion', 'Panel de redacción', 'Panel, noticias, editor de notas, portada, multimedia, comentarios, analítica y equipo.'],
]

export default function Page() {
  return (
    <>
      <ContenidoHeader />
      <main className="mx-auto max-w-[1000px] px-5 py-8">
        <h2 className={h2}>Índice del prototipo</h2>
        <p className={sub}>Las páginas del prototipo y qué cubre cada una.</p>
        <div>
          {PAGES.map(([href, t, d]) => (
            <Link
              key={href}
              href={href}
              className="mb-3 block rounded border border-eg-rule bg-eg-card px-5 py-[18px] hover:border-eg-ink"
            >
              <b className="block font-serif text-[22px] font-medium">{t}</b>
              <span className="text-xs text-eg-muted">{d}</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  )
}
