'use client'

import Link from 'next/link'
import { CardMedium, h3, Img, lead, meta, secH, secTitle, tag } from '@/components/portada/portada'
import type { MenuItem } from '@/components/portada/site-header'
import type { Card } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { SiteChrome } from './chrome'
import { TimeAgo } from './time-ago'

export function SectionView({ section, cards, menu }: { section: { name: string; slug: string }; cards: Card[]; menu: MenuItem[] }) {
  const [first, ...rest] = cards
  return (
    <SiteChrome menu={menu} active={section.slug}>
      <main className="mx-auto max-w-[1240px] px-5 pt-9">
        <div className={secH}>
          <h1 className={secTitle}>{section.name}</h1>
          <span className={meta}>{cards.length ? `${cards.length} ${cards.length === 1 ? 'nota' : 'notas'}` : ''}</span>
        </div>
        {first ? (
          <>
            <article className="mb-10 grid grid-cols-[1.4fr_1fr] items-center gap-8 max-[900px]:grid-cols-1">
              <Link href={first.href} className="group">
                <Img c={first} />
              </Link>
              <div>
                <span className={tag}>{first.sec}</span>
                <Link href={first.href} className="group">
                  <h2 className={cn(h3, 'text-[clamp(28px,3.4vw,42px)] leading-[1.08] tracking-[-.02em]')}>{first.title}</h2>
                </Link>
                {first.lead && <p className={lead}>{first.lead}</p>}
                <div className={meta}>
                  {first.au && <span>{first.au}</span>}
                  <TimeAgo date={first.date} />
                </div>
              </div>
            </article>
            <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-1">
              {rest.map((c) => (
                <CardMedium key={c.id} c={c} />
              ))}
            </div>
          </>
        ) : (
          <p className={cn(lead, 'py-16 text-center')}>Todavía no hay notas publicadas en {section.name}.</p>
        )}
      </main>
    </SiteChrome>
  )
}
