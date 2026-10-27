'use client'

import { Icon } from '@/components/eg/icon'
import { ProtoHeader } from '@/components/eg/proto-header'
import { toggleTheme } from '@/components/eg/theme'

export function ArticleHeader({ className }: { className?: string }) {
  return (
    <ProtoHeader
      tabs={[
        { href: '/articulo', label: 'Artículo' },
        { href: '/componentes', label: 'Componentes' },
      ]}
      width="max-w-[1100px]"
      logoClass="text-[28px] max-[800px]:text-[22px]"
      tabClass="px-3 max-[800px]:px-2"
      className={className}
    >
      <button
        className="grid size-10 place-items-center rounded border border-transparent bg-transparent hover:border-eg-rule"
        aria-label="Cambiar tema"
        onClick={() => toggleTheme()}
      >
        <Icon name="moon" size={20} strokeWidth={1.8} round={false} />
      </button>
    </ProtoHeader>
  )
}

export function MiniFooter({ className }: { className?: string }) {
  return (
    <footer className={`mt-[60px] border-t border-eg-rule py-[30px] text-center text-[13px] text-eg-muted ${className ?? ''}`}>
      © 2026 El Global · Prototipo
    </footer>
  )
}
