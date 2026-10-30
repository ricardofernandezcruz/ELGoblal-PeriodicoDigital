import type { Metadata } from 'next'

// El panel y su login no deben aparecer en buscadores.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
