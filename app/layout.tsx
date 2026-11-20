import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Newsreader } from 'next/font/google'
import Script from 'next/script'
import { SiteInfoProvider } from '@/components/site/site-info'
import { getSiteInfo } from '@/lib/site-info'
import './globals.css'

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'El Global — El mundo en una sola mirada',
  description: 'Noticias globales, análisis y opinión para entender el mundo.',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
  // Antes del lanzamiento (sin ALLOW_INDEXING=1) los buscadores no deben indexar el sitio de pruebas.
  robots: process.env.ALLOW_INDEXING === '1' ? undefined : { index: false, follow: false },
  // Al añadirla a la pantalla de inicio del iPhone se abre como app, sin barra del navegador.
  appleWebApp: { capable: true, title: 'El Global', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F3EC' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1720' },
  ],
}

// Aplica el tema guardado antes de pintar, para evitar el parpadeo.
// En la portada, marca también si toca la animación del regalo (una vez al día), para taparla antes de pintar.
const themeScript = `try{var t=localStorage.getItem('eg-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}
try{if(location.pathname==='/'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){var d=new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'});if(location.search.indexOf('regalo=1')>-1||localStorage.getItem('eg-gift')!==d)document.documentElement.dataset.gift=d}}catch(e){}`

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const info = await getSiteInfo()
  return (
    <html lang="es" className={`${newsreader.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <Script id="eg-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <SiteInfoProvider value={info}>{children}</SiteInfoProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
