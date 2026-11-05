import type { Metadata } from 'next'
import { SavedPage } from '@/components/site/saved'
import { getMenu } from '@/lib/queries'

export const metadata: Metadata = { title: 'Guardadas · El Global', robots: { index: false } }
export const revalidate = 3600

export default async function Page() {
  return <SavedPage menu={await getMenu()} />
}
