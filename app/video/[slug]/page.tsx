import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { VideoPage } from '@/components/site/video'
import { getMenu } from '@/lib/queries'
import { getNewsroomVideo } from '@/lib/video'

export const revalidate = 60

export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await getNewsroomVideo((await params).slug)
  if (!d) return { title: 'Video no encontrado · El Global' }
  const v = d.video
  const image = v.poster?.startsWith('http') ? [{ url: v.poster }] : undefined
  return {
    title: `${v.title} · Video · El Global`,
    description: v.description.slice(0, 160) || undefined,
    openGraph: { type: 'video.other', title: v.title, description: v.description.slice(0, 200), images: image },
  }
}

export default async function Page({ params }: Props) {
  const [d, menu] = await Promise.all([getNewsroomVideo((await params).slug), getMenu()])
  if (!d) notFound()
  return <VideoPage video={d.video} more={d.more} menu={menu} />
}
