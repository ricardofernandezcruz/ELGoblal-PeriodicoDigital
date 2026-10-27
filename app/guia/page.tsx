'use client'

import { ContenidoHeader } from '@/components/contenido/contenido-header'
import { box, btn,  h2, meta, secH, sub } from '@/components/contenido/styles'
import { ToastProvider, useToast } from '@/components/eg/toast'
import { cn } from '@/lib/utils'

const COLORS = [
  ['--bg', '#F7F3EC', 'Fondo de página'],
  ['--surface', '#E9EDEC', 'Paneles'],
  ['--ink', '#14202B', 'Texto y titulares'],
  ['--muted', '#5B6470', 'Metadatos'],
  ['--accent', '#B3261E', 'Acento y urgencia'],
  ['--rule', '#D9D2C5', 'Separadores'],
  ['--bg (oscuro)', '#0F1720', 'Fondo oscuro'],
  ['--accent (oscuro)', '#E5534B', 'Acento oscuro'],
]

const CSS = `:root{--bg:#F7F3EC;--surface:#E9EDEC;--ink:#14202B;--muted:#5B6470;
--accent:#B3261E;--rule:#D9D2C5;--card:#FFFDF9;
--serif:'Newsreader',Georgia,serif;--sans:'Inter',system-ui,sans-serif;--dur:200ms}
:root[data-theme="dark"]{--bg:#0F1720;--surface:#18222D;--ink:#E8E4DC;--muted:#9AA3AE;
--accent:#E5534B;--rule:#2A3541;--card:#141D27}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`

const TYPE = [
  ['Titular principal', 'text-[52px] leading-none font-medium font-serif', 'Newsreader 500 · 52–60 px · interlineado 1.08'],
  ['Titular secundario', 'text-[26px] leading-[1.15] font-medium font-serif', 'Newsreader 500 · 26 px · 1.15'],
  ['Texto de artículo en serif', 'text-xl leading-[1.65] font-serif', 'Newsreader 400 · 18/20/22 px · 1.65'],
  ['Etiqueta de sección', 'text-xs font-semibold text-eg-accent', 'Inter 600 · 12 px · color de acento'],
  ['Interfaz y metadatos', 'text-sm', 'Inter 400/500 · 12–14 px'],
]

const VOICE = [
  'Botones con verbo: "Guardar nota", "Recibir resumen", "Suscribirme"; nunca "Enviar" ni "Aceptar" solos.',
  'Una acción mantiene su nombre en todo el flujo: "Guardar" produce el aviso "Nota guardada".',
  'Los errores dicen qué pasó y cómo arreglarlo, sin disculpas: "Escribe un correo válido, por ejemplo tu@correo.com".',
  'Los estados vacíos invitan a actuar: "Elige al menos un tema para ver tus notas".',
  'Mayúsculas de oración en etiquetas, titulares y botones.',
]

const A11Y = [
  'Contraste mínimo de 4.5:1 en texto normal y 3:1 en texto grande (comprobado en la pestaña Detalles).',
  'Foco visible de 2 px en todos los controles y navegación completa con teclado.',
  'Texto alternativo en imágenes informativas; las decorativas van con alt vacío.',
  'Los gráficos tienen una tabla equivalente.',
  'Los avisos dinámicos usan role="status" o role="alert".',
  'Se respeta prefers-reduced-motion y el modo oscuro del sistema.',
  'Las imágenes llevan relación de aspecto fija para evitar saltos de diseño.',
]

export default function Page() {
  return (
    <ToastProvider duration={2000}>
      <ContenidoHeader />
      <Guide />
    </ToastProvider>
  )
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="m-0 list-none p-0">
      {items.map((t) => (
        <li
          key={t}
          className="flex gap-2.5 border-b border-eg-rule py-2 before:font-bold before:text-[#1f7a46] before:content-['✓'] last:border-0"
        >
          {t}
        </li>
      ))}
    </ul>
  )
}

function Guide() {
  const toast = useToast()
  const copy = (t: string, m: string) => {
    try {
      navigator.clipboard.writeText(t).then(
        () => toast(m),
        () => toast('No se pudo copiar'),
      )
    } catch {
      toast('No se pudo copiar')
    }
  }
  const p = 'text-sm text-eg-muted'

  return (
    <main className="mx-auto max-w-[1000px] px-5 py-8">
      <h2 className={h2}>Guía de diseño</h2>
      <p className={sub}>Todo lo necesario para construir el sitio igual que el prototipo. Toca un color para copiar su valor.</p>

      <div className={cn(secH, 'mt-0')}>Color</div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {COLORS.map(([n, h, u]) => (
          <button
            key={n}
            className="overflow-hidden rounded border border-eg-rule bg-eg-card p-0 text-left"
            onClick={() => copy(h, 'Copiado ' + h)}
          >
            <i className="block h-14" style={{ background: h }} />
            <span className="block px-2.5 py-2 text-xs text-eg-muted">
              <b className="block text-[13px] text-eg-ink">{n}</b>
              {h} · {u}
            </span>
          </button>
        ))}
      </div>

      <div className={secH}>Tipografía</div>
      <div className="grid gap-2.5">
        {TYPE.map(([l, c, m]) => (
          <div key={l} className="flex flex-wrap items-baseline justify-between gap-4 border-b border-eg-rule pb-2">
            <span className={c}>{l}</span>
            <span className="text-right font-sans text-xs whitespace-nowrap text-eg-muted max-[600px]:whitespace-normal">{m}</span>
          </div>
        ))}
      </div>

      <div className={secH}>Espaciado, bordes y movimiento</div>
      <div className="grid grid-cols-2 gap-6 max-[820px]:grid-cols-1">
        <div className={box}>
          <b>Espaciado</b>
          <p className={p}>
            Rejilla de 8 px: 4, 8, 12, 16, 24, 32, 40, 56. Contenedor de 1240 px en portada y 700 px (≈70 caracteres) en
            artículo.
          </p>
          <b>Bordes</b>
          <p className={cn(p, 'm-0')}>
            Radios de 2 px en imágenes, 4 px en botones y campos, 999 px en chips. Casi sin sombras: líneas de 1 px con el
            color de separación.
          </p>
        </div>
        <div className={box}>
          <b>Movimiento</b>
          <p className={p}>
            150–200 ms con ease-out para hover, foco y paneles. Solo responde a acciones del usuario, salvo el punto de
            &quot;en directo&quot;. Con movimiento reducido, todo pasa a 0 ms.
          </p>
          <b>Puntos de quiebre</b>
          <p className={cn(p, 'm-0')}>
            Móvil hasta 820 px (una columna, barra inferior), escritorio desde 821 px. Objetivos táctiles de 44 px o más.
          </p>
        </div>
      </div>

      <div className={secH}>Voz y textos de interfaz</div>
      <div className={box}>
        <CheckList items={VOICE} />
      </div>

      <div className={secH}>Lista de accesibilidad</div>
      <div className={box}>
        <CheckList items={A11Y} />
      </div>

      <div className={secH}>CSS base</div>
      <pre className="mb-3 overflow-auto rounded bg-eg-surface p-4 font-mono text-[13px] leading-normal">{CSS}</pre>
      <button className={btn} onClick={() => copy(CSS, 'CSS copiado')}>
        Copiar CSS
      </button>
      <p className={cn(meta, 'mt-6')}>
        La guía completa de diseño y desarrollo vive en el documento compartido «El Global: guía de diseño y desarrollo».
      </p>
    </main>
  )
}
