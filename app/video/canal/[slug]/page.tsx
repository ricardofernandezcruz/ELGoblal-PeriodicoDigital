import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ChannelPage } from '@/components/site/video'
import { getMenu } from '@/lib/queries'
import { getChannelFeeds } from '@/lib/video'

export const revalidate = 900

export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [ch] = await getChannelFeeds((await params).slug)
  return { title: ch ? `${ch.name} · Video · El Global` : 'Canal no encontrado · El Global' }
}

export default async function Page({ params }: Props) {
  const [[ch], menu] = await Promise.all([getChannelFeeds((await params).slug), getMenu()])
  if (!ch) notFound()
  return <ChannelPage ch={ch} menu={menu} />
}
