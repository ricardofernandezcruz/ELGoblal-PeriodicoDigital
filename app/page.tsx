import { Portada } from '@/components/portada/portada'
import { getFrontPage } from '@/lib/queries'

// La portada se regenera como mucho cada minuto, y al instante cuando se publica desde el panel.
export const revalidate = 60

export default async function Page() {
  return <Portada data={await getFrontPage()} />
}
