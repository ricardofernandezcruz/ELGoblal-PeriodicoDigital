import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArticleView } from '@/components/site/article-view'
import { JsonLd } from '@/components/site/json-ld'
import { getAds } from '@/lib/ads'
import { siteUrl } from '@/lib/site-url'
import { getArticle, getMenu, readingMinutes } from '@/lib/queries'

export const revalidate = 60

// Se generan al primer acceso y se guardan en caché (no hace falta construirlas de antemano).
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ seccion: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seccion, slug } = await params
  const d = await getArticle(seccion, slug)
  if (!d) return { title: 'Nota no encontrada · El Global' }
  const a = d.article
  const img = a.hero?.src ?? (a.review?.cover || undefined)
  const image = img?.startsWith('http') ? [{ url: img, alt: a.hero?.alt || a.review?.work || a.title }] : undefined
  return {
    title: `${a.title} · El Global`,
    description: a.seo || a.lead,
    alternates: { canonical: `/${a.secSlug}/${slug}` },
    openGraph: { type: 'article', title: a.title, description: a.seo || a.lead, publishedTime: a.date, section: a.sec, tags: a.tags, images: image },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: a.title, description: a.seo || a.lead },
  }
}

export default async function Page({ params }: Props) {
  const { seccion, slug } = await params
  const [d, menu, ads] = await Promise.all([getArticle(seccion, slug), getMenu(), getAds(['article'], seccion)])
  if (!d) notFound()
  const a = d.article
  const base = siteUrl()
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: a.title.slice(0, 110),
          description: a.seo || a.lead,
          image: a.hero?.src.startsWith('http') ? [a.hero.src] : undefined,
          datePublished: a.date,
          dateModified: a.updatedAt,
          articleSection: a.sec,
          keywords: a.tags.join(', ') || undefined,
          author: a.au ? { '@type': 'Person', name: a.au } : { '@type': 'Organization', name: 'El Global' },
          publisher: { '@type': 'NewsMediaOrganization', name: 'El Global', logo: { '@type': 'ImageObject', url: `${base}/icon-512.png` } },
          mainEntityOfPage: `${base}/${a.secSlug}/${slug}`,
          isAccessibleForFree: true,
        }}
      />
      {a.review && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Review',
            name: a.title,
            reviewBody: a.review.verdict || a.lead,
            datePublished: a.date,
            author: a.au ? { '@type': 'Person', name: a.au } : { '@type': 'Organization', name: 'El Global' },
            publisher: { '@type': 'Organization', name: 'El Global' },
            reviewRating: { '@type': 'Rating', ratingValue: a.review.rating, bestRating: 5, worstRating: 0.5 },
            itemReviewed: {
              '@type': 'Book',
              name: a.review.work,
              author: a.review.author ? { '@type': 'Person', name: a.review.author } : undefined,
              isbn: a.review.isbn || undefined,
              image: a.review.cover || undefined,
            },
          }}
        />
      )}
      <ArticleView {...d} minutes={readingMinutes(a)} menu={menu} ads={ads} />
    </>
  )
}
