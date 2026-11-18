import { Portada } from '@/components/portada/portada'
import { getAds } from '@/lib/ads'
import { getFrontPage } from '@/lib/queries'
import { getVideoHub } from '@/lib/video'

// La portada se regenera como mucho cada minuto, y al instante cuando se publica desde el panel.
export const revalidate = 60

export default async function Page() {
  const [front, videos, ads] = await Promise.all([getFrontPage(), getVideoHub(), getAds(['home-top', 'home-mid'])])
  return <Portada data={{ ...front, videos, ads }} />
}
