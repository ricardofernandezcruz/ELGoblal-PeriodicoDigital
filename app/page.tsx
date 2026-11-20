import { Portada } from '@/components/portada/portada'
import { JsonLd } from '@/components/site/json-ld'
import { getAds } from '@/lib/ads'
import { getSiteInfo } from '@/lib/site-info'
import { SOCIALS } from '@/lib/site-info-shared'
import { siteUrl } from '@/lib/site-url'
import { getFrontPage } from '@/lib/queries'
import { getVideoHub } from '@/lib/video'

// La portada se regenera como mucho cada minuto, y al instante cuando se publica desde el panel.
export const revalidate = 60

export default async function Page() {
  const [front, videos, ads, info] = await Promise.all([getFrontPage(), getVideoHub(), getAds(['home-top', 'home-mid']), getSiteInfo()])
  const base = siteUrl()
  const sameAs = SOCIALS.map(([id]) => info.socials[id]).filter(Boolean)
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'WebSite', name: 'El Global', url: base + '/', inLanguage: 'es' },
            {
              '@type': 'NewsMediaOrganization',
              name: 'El Global',
              legalName: info.legalName || undefined,
              url: base + '/',
              logo: `${base}/icon-512.png`,
              email: info.email || undefined,
              telephone: info.phone || undefined,
              sameAs: sameAs.length ? sameAs : undefined,
              publishingPrinciples: `${base}/quienes-somos`,
              correctionsPolicy: `${base}/correcciones`,
            },
          ],
        }}
      />
      <Portada data={{ ...front, videos, ads }} />
    </>
  )
}
