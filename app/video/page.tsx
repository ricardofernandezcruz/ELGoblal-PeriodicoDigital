import type { Metadata } from 'next'
import { VideoHub } from '@/components/site/video'
import { getMenu } from '@/lib/queries'
import { getVideoHub } from '@/lib/video'

export const metadata: Metadata = {
  title: 'Video · El Global',
  description: 'Las noticias en video de El Global y los programas de nuestros redactores.',
}

// Se regenera cada minuto; los canales de YouTube se releen cada 15.
export const revalidate = 60

export default async function Page() {
  const [hub, menu] = await Promise.all([getVideoHub(), getMenu()])
  return <VideoHub hub={hub} menu={menu} />
}
