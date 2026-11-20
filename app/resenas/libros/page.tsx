import type { Metadata } from 'next'
import { ReviewsHub } from '@/components/site/reviews'
import { getMenu, getReviews } from '@/lib/queries'

export const metadata: Metadata = { title: 'Reseñas de libros · El Global', description: 'Los libros que vale la pena leer, y los que no, según la redacción de El Global.', alternates: { canonical: '/resenas/libros' } }
export const revalidate = 60

export default async function Page() {
  const [reviews, menu] = await Promise.all([getReviews('libro'), getMenu()])
  return <ReviewsHub reviews={reviews} kind="libro" menu={menu} />
}
