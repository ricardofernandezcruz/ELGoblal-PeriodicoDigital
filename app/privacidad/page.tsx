import type { Metadata } from 'next'
import { InfoPage } from '@/components/site/legal'
import { INFO_TITLE } from '@/lib/info-pages'
import { getMenu } from '@/lib/queries'

export const metadata: Metadata = { title: `${INFO_TITLE['privacidad']} · El Global`, alternates: { canonical: '/privacidad' } }
export const revalidate = 3600

export default async function Page() {
  return <InfoPage kind="privacidad" menu={await getMenu()} />
}
