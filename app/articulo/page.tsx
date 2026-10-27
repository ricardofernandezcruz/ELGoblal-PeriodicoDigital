import type { Metadata } from 'next'
import { Article } from '@/components/articulo/article'

export const metadata: Metadata = { title: 'El mundo reordena sus prioridades · El Global' }

export default function Page() {
  return <Article />
}
