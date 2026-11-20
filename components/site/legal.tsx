'use client'

import Link from 'next/link'
import type { MenuItem } from '@/components/portada/site-header'
import { INFO_TITLE, type InfoKind } from '@/lib/info-pages'
import { owner, SOCIALS, type SiteInfo } from '@/lib/site-info-shared'
import { SiteChrome } from './chrome'
import { useSiteInfo } from './site-info'

/* Páginas institucionales y legales. Los datos de la empresa salen del panel
   (Portada → Datos del periódico); si un dato falta, esa línea no se muestra.
   Los textos legales son un borrador: conviene que los revise un abogado. */

const UPDATED = '20 de noviembre de 2026'

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-9 mb-2 font-serif text-[24px] leading-tight font-medium">{children}</h2>
const P = ({ children }: { children: React.ReactNode }) => <p className="mb-4">{children}</p>
const UL = ({ children }: { children: React.ReactNode }) => <ul className="mb-4 list-disc pl-6 [&>li]:mb-1.5">{children}</ul>

function Contact({ s }: { s: SiteInfo }) {
  const rows = [
    ['Correo', s.email && <a href={`mailto:${s.email}`}>{s.email}</a>],
    ['Teléfono', s.phone && <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}>{s.phone}</a>],
    ['Dirección', s.address],
    ['Director', s.director],
    ['Razón social', s.legalName && `${s.legalName}${s.rnc ? ` · RNC ${s.rnc}` : ''}`],
  ].filter(([, v]) => v)
  if (!rows.length) return null
  return (
    <dl className="my-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 rounded border border-eg-rule bg-eg-card p-5 font-sans text-[15px] max-[480px]:grid-cols-1">
      {rows.map(([k, v]) => (
        <div key={k as string} className="contents">
          <dt className="font-semibold">{k}</dt>
          <dd className="m-0 text-eg-muted [&_a]:text-eg-ink [&_a]:underline [&_a]:underline-offset-4">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

const writeTo = (s: SiteInfo) => (s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : 'los canales que aparecen en la página de contacto')

function Body({ kind, s }: { kind: InfoKind; s: SiteInfo }) {
  const who = owner(s)
  switch (kind) {
    case 'quienes-somos':
      return (
        <>
          {s.about ? (
            s.about.split(/\n\s*\n/).map((x, i) => <P key={i}>{x}</P>)
          ) : (
            <P>El Global es un medio digital de noticias, análisis y opinión con la mirada puesta en República Dominicana y en el mundo. Queremos que cada lector entienda lo que pasa, por qué importa y qué viene después.</P>
          )}
          <H2>Cómo trabajamos</H2>
          <UL>
            <li>Verificamos la información antes de publicarla y citamos nuestras fuentes siempre que es posible.</li>
            <li>Separamos la información de la opinión: los artículos de opinión están identificados como tales.</li>
            <li>Corregimos nuestros errores a la vista de todos (ver la <Link href="/correcciones">política de correcciones</Link>).</li>
            <li>La publicidad siempre lleva la etiqueta «Publicidad» y no influye en nuestras decisiones editoriales.</li>
          </UL>
          <Contact s={s} />
        </>
      )
    case 'contacto':
      return (
        <>
          <P>Queremos escucharte: avisos de noticias, preguntas, propuestas o cualquier error que encuentres en nuestras notas.</P>
          <Contact s={s} />
          {!s.email && !s.phone && <P>Muy pronto publicaremos aquí nuestros datos de contacto. Mientras tanto, puedes escribirnos por nuestras redes sociales.</P>}
          <H2>Para qué escribirnos</H2>
          <UL>
            <li>
              <b>Corregir un error:</b> indícanos la nota y lo que debe cambiar. Lo revisamos según nuestra <Link href="/correcciones">política de correcciones</Link>.
            </li>
            <li>
              <b>Publicidad:</b> cuéntanos qué quieres anunciar y te enviamos los formatos y las tarifas.
            </li>
            <li>
              <b>Tus datos personales:</b> para consultarlos, corregirlos o borrarlos, consulta nuestra <Link href="/privacidad">política de privacidad</Link>.
            </li>
          </UL>
          {SOCIALS.some(([id]) => s.socials[id]) && (
            <>
              <H2>Síguenos</H2>
              <UL>
                {SOCIALS.filter(([id]) => s.socials[id]).map(([id, name]) => (
                  <li key={id}>
                    <a href={s.socials[id]} target="_blank" rel="noopener me">
                      {name}
                    </a>
                  </li>
                ))}
              </UL>
            </>
          )}
        </>
      )
    case 'privacidad':
      return (
        <>
          <P>
            Esta política explica qué datos personales trata {who} cuando usas este sitio, para qué los usamos y cómo puedes ejercer tus derechos según la Ley núm. 172-13 de
            protección de datos de carácter personal de la República Dominicana.
          </P>
          <H2>Quién es el responsable</H2>
          <P>
            El responsable del tratamiento es {who}
            {s.rnc && `, RNC ${s.rnc}`}
            {s.address && `, con domicilio en ${s.address}`}. Puedes escribirnos a {writeTo(s)}.
          </P>
          <H2>Qué datos tratamos y para qué</H2>
          <UL>
            <li>
              <b>Comentarios:</b> el nombre que escribes y el texto del comentario, para publicarlo y moderarlo.
            </li>
            <li>
              <b>Boletín:</b> tu correo electrónico, para enviarte el resumen diario después de que confirmes la suscripción. Puedes darte de baja desde cualquier correo.
            </li>
            <li>
              <b>Avisos de última hora:</b> si los activas, un identificador técnico de tu navegador que permite enviarte los avisos. No incluye tu nombre ni tu correo, y puedes
              desactivarlos desde la campana de la cabecera.
            </li>
            <li>
              <b>Estadísticas de visitas:</b> datos agregados y anónimos sobre las páginas visitadas, sin cookies de seguimiento.
            </li>
            <li>
              <b>Seguridad:</b> una versión cifrada de tu dirección IP durante poco tiempo, para limitar abusos como el envío masivo de comentarios o votos. No se guarda la IP
              original.
            </li>
            <li>
              <b>Publicidad:</b> contamos cuántas veces se ve y se pulsa cada anuncio, de forma agregada. No creamos perfiles de lectores ni compartimos tus datos con los anunciantes.
            </li>
          </UL>
          <H2>Lo que se queda en tu dispositivo</H2>
          <P>
            Las notas que guardas para leer después, tu avance de lectura, el tema claro u oscuro y otras preferencias se guardan solo en tu navegador. No las recibimos ni las
            usamos. Las cookies se usan únicamente para que el equipo de la redacción pueda iniciar sesión en el panel.
          </P>
          <H2>Con quién compartimos datos</H2>
          <P>
            Solo con los proveedores que necesitamos para funcionar (alojamiento del sitio, base de datos, almacenamiento de imágenes y envío de correos), que tratan los datos por
            nuestra cuenta y con las debidas garantías. Los videos de YouTube y los programas de Spotify solo se cargan cuando pulsas para reproducirlos; desde ese momento se aplican
            sus propias políticas. No vendemos datos personales.
          </P>
          <H2>Cuánto tiempo los conservamos</H2>
          <P>
            Mientras sean necesarios para la finalidad para la que se recogieron: la suscripción, hasta que te des de baja; los comentarios, mientras la nota esté publicada; los
            datos de seguridad, unas horas.
          </P>
          <H2>Tus derechos</H2>
          <P>
            Puedes pedirnos acceso a tus datos, su rectificación, su supresión o oponerte a su tratamiento escribiendo a {writeTo(s)}. Te responderemos en los plazos que establece
            la ley.
          </P>
          <H2>Menores de edad</H2>
          <P>Este sitio no está dirigido a menores de 14 años y no recogemos sus datos a sabiendas.</P>
          <H2>Cambios en esta política</H2>
          <P>Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha de actualización.</P>
        </>
      )
    case 'terminos':
      return (
        <>
          <P>Al usar este sitio aceptas estas condiciones. Si no estás de acuerdo con ellas, te pedimos que no lo uses.</P>
          <H2>Contenido y propiedad intelectual</H2>
          <P>
            Los textos, fotografías, videos, gráficos y el diseño de este sitio pertenecen a {who} o a sus autores, y están protegidos por la legislación de propiedad intelectual.
            Puedes compartir los enlaces y citar fragmentos breves indicando la fuente y enlazando la nota original. Para cualquier otro uso, necesitas nuestra autorización.
          </P>
          <H2>Comentarios de los lectores</H2>
          <P>
            Cada lector es responsable de lo que publica. Podemos moderar, ocultar o eliminar los comentarios que incumplan nuestras <Link href="/normas-de-comentarios">normas</Link>.
          </P>
          <H2>Publicidad y enlaces externos</H2>
          <P>
            Los anuncios están identificados con la etiqueta «Publicidad» y son responsabilidad de sus anunciantes. Los enlaces a otros sitios se ofrecen como referencia; no
            controlamos su contenido.
          </P>
          <H2>Responsabilidad</H2>
          <P>
            Trabajamos para que la información sea exacta y esté actualizada, pero no podemos garantizar que el sitio esté libre de errores o interrupciones. Cuando detectamos un
            error, lo corregimos según nuestra <Link href="/correcciones">política de correcciones</Link>.
          </P>
          <H2>Legislación aplicable</H2>
          <P>Estas condiciones se rigen por las leyes de la República Dominicana.</P>
        </>
      )
    case 'normas-de-comentarios':
      return (
        <>
          <P>Los comentarios son un espacio para conversar sobre las noticias. Para que lo sigan siendo, te pedimos que respetes estas normas:</P>
          <UL>
            <li>Respeta a los demás: nada de insultos, amenazas, acoso ni lenguaje que discrimine por cualquier motivo.</li>
            <li>Habla de la nota: los comentarios que no tengan relación con ella pueden retirarse.</li>
            <li>Nada de publicidad, cadenas, enlaces engañosos ni mensajes repetidos.</li>
            <li>No publiques datos personales de otras personas (teléfonos, direcciones, documentos).</li>
            <li>No difundas información falsa a sabiendas ni suplantes a otras personas.</li>
          </UL>
          <H2>Cómo moderamos</H2>
          <P>
            La redacción revisa los comentarios y puede retirar los que incumplan estas normas, sin necesidad de aviso. Si alguien las incumple de forma reiterada, podemos impedirle
            seguir comentando. Si ves un comentario que no debería estar, escríbenos a {writeTo(s)}.
          </P>
          <P>Los comentarios expresan la opinión de sus autores, no la de {who}.</P>
        </>
      )
    case 'correcciones':
      return (
        <>
          <P>Nos equivocamos a veces. Cuando ocurre, lo corregimos rápido y de forma visible.</P>
          <H2>Cómo corregimos</H2>
          <UL>
            <li>Los errores de datos, nombres, cifras o citas se corrigen en la propia nota, con una aclaración al final que explica qué se cambió y cuándo.</li>
            <li>Las erratas menores (de ortografía o de formato) se corrigen sin aclaración.</li>
            <li>Si un error cambia el sentido de la noticia, lo indicamos también al principio de la nota.</li>
            <li>No borramos notas para ocultar un error, salvo por razones legales o de seguridad de las personas.</li>
          </UL>
          <H2>Cómo pedir una corrección</H2>
          <P>
            Escríbenos a {writeTo(s)} indicando la nota, el dato que consideras incorrecto y, si puedes, la fuente que lo demuestra. Atendemos también las solicitudes de
            rectificación y de respuesta previstas en la legislación dominicana.
          </P>
        </>
      )
  }
}

export function InfoPage({ kind, menu }: { kind: InfoKind; menu: MenuItem[] }) {
  const s = useSiteInfo()
  const legal = kind !== 'quienes-somos' && kind !== 'contacto'
  return (
    <SiteChrome menu={menu} active={kind}>
      <main className="mx-auto max-w-[720px] px-5 pt-10 pb-6 font-serif text-[18px] leading-[1.65] [&_a]:underline [&_a]:underline-offset-4">
        <h1 className="m-0 border-b-2 border-eg-ink pb-3 text-[clamp(34px,5vw,48px)] leading-[1.05] font-medium tracking-[-.02em]">{INFO_TITLE[kind]}</h1>
        {legal && <p className="mt-3 mb-6 font-sans text-xs text-eg-muted">Última actualización: {UPDATED}</p>}
        <div className={legal ? '' : 'mt-6'}>
          <Body kind={kind} s={s} />
        </div>
      </main>
    </SiteChrome>
  )
}
