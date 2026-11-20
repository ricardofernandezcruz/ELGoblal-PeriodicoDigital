import type { Metadata } from 'next'
import { ReviewsHub } from '@/components/site/reviews'
import { getMenu, getReviews } from '@/lib/queries'

export const metadata: Metadata = { title: 'Reseñas · El Global', description: 'Reseñas de libros de la redacción de El Global.', alternates: { canonical: '/resenas' } }
export const revalidate = 60

export default async function Page() {
  const [reviews, menu] = await Promise.all([getReviews(), getMenu()])
  return <ReviewsHub reviews={reviews} menu={menu} />
}
