import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Newsreader } from 'next/font/google'
import Script from 'next/script'
import { GiftIntro } from '@/components/portada/gift'
import { SiteInfoProvider } from '@/components/site/site-info'
import { getHome } from '@/lib/newsroom'
import { getSiteInfo } from '@/lib/site-info'
import { siteUrl } from '@/lib/site-url'
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
  // Base para las direcciones relativas de canonical y Open Graph.
  metadataBase: new URL(siteUrl()),
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
// Marca también si toca la animación del regalo, para taparlo todo antes de pintar: en cada carga de
// cualquier página pública (no al navegar dentro del sitio) mientras esté encendida y en fechas.
// /?regalo=1 la fuerza para verla desde el panel.
const themeScript = (gift: { on: boolean; from: string; to: string }) => `try{var t=localStorage.getItem('eg-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}
try{var g=${JSON.stringify(gift)},p=location.pathname,d=new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'});if(!/^\\/(redaccion|api)(\\/|$)/.test(p)&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&(location.search.indexOf('regalo=1')>-1||(g.on&&d>=g.from&&d<=g.to)))document.documentElement.dataset.gift=d}catch(e){}`

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [info, home] = await Promise.all([getSiteInfo(), getHome().catch(() => null)])
  return (
    <html lang="es" className={`${newsreader.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <Script id="eg-theme" strategy="beforeInteractive">
          {themeScript(home?.gift ?? { on: false, from: '', to: '' })}
        </Script>
        <SiteInfoProvider value={info}>{children}</SiteInfoProvider>
        <GiftIntro />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
