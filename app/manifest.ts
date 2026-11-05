import type { MetadataRoute } from 'next'

/** Hace el sitio instalable («Añadir a la pantalla de inicio») como una app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'El Global',
    short_name: 'El Global',
    description: 'Noticias, análisis y opinión para entender el mundo.',
    lang: 'es',
    start_url: '/?origen=app',
    scope: '/',
    display: 'standalone',
    background_color: '#F7F3EC',
    theme_color: '#F7F3EC',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Video', url: '/video', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Guardadas', url: '/guardadas', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
