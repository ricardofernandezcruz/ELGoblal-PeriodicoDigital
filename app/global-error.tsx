'use client'

/** Último recurso: si falla hasta el diseño general del sitio. Sin dependencias, con estilos propios. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F7F3EC', color: '#14181F', fontFamily: 'Georgia, serif', textAlign: 'center', padding: 24 }}>
        <main>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-.02em' }}>El Global</div>
          <p style={{ fontSize: 19, color: '#5B6470', maxWidth: '34ch', margin: '20px auto 24px' }}>El sitio tuvo un problema al cargar. Vuelve a intentarlo en un momento.</p>
          <button onClick={reset} style={{ font: '600 15px Arial, sans-serif', padding: '12px 20px', borderRadius: 6, border: 0, background: '#14181F', color: '#F7F3EC', cursor: 'pointer' }}>
            Reintentar
          </button>
        </main>
      </body>
    </html>
  )
}
