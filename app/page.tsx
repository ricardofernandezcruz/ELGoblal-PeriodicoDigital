import { Portada } from '@/components/portada/portada'
import { getFrontPage } from '@/lib/queries'
import { getVideoHub } from '@/lib/video'

// La portada se regenera como mucho cada minuto, y al instante cuando se publica desde el panel.
export const revalidate = 60

export default async function Page() {
  const [front, videos] = await Promise.all([getFrontPage(), getVideoHub()])
  return <Portada data={{ ...front, videos }} />
}
