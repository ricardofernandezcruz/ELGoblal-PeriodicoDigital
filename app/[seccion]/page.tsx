import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SectionView } from '@/components/site/section-view'
import { getSectionPage } from '@/lib/queries'

export const revalidate = 60

// Se generan al primer acceso y se guardan en caché (no hace falta construirlas de antemano).
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ seccion: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await getSectionPage((await params).seccion)
  return { title: d ? `${d.section.name} · El Global` : 'Sección no encontrada · El Global' }
}

export default async function Page({ params }: Props) {
  const d = await getSectionPage((await params).seccion)
  if (!d) notFound()
  return <SectionView {...d} />
}
