/* Reseñas: tipos de obra y ficha. Por ahora solo libros; para añadir cine o música basta con
   sumar el tipo aquí, su página en app/resenas/<tipo> y sus campos en el editor. */

export const REVIEW_SECTION = 'resenas'

export const REVIEW_KINDS = { libro: { label: 'Libros', one: 'Libro', path: 'libros' } } as const
export type ReviewKind = keyof typeof REVIEW_KINDS

export type Review = {
  kind: ReviewKind
  work: string
  author: string
  publisher: string
  year: number | null
  pages: number | null
  isbn: string
  coverId: string | null
  cover: string
  rating: number
  verdict: string
  quote: string
  buyUrl: string
}

export const emptyReview = (): Review => ({
  kind: 'libro',
  work: '',
  author: '',
  publisher: '',
  year: null,
  pages: null,
  isbn: '',
  coverId: null,
  cover: '',
  rating: 4,
  verdict: '',
  quote: '',
  buyUrl: '',
})

/** Slugs que no puede usar una nota de Reseñas, porque son páginas de tipo (/resenas/libros…). */
export const RESERVED_REVIEW_SLUGS = Object.values(REVIEW_KINDS).map((k) => k.path)

export const ratingText = (r: number) => r.toLocaleString('es-DO', { maximumFractionDigits: 1 }) + ' de 5'
