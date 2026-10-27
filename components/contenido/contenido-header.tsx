'use client'

import { OutlineBtn, ProtoHeader } from '@/components/eg/proto-header'
import { toggleTheme } from '@/components/eg/theme'

export function ContenidoHeader({ onTheme }: { onTheme?: () => void }) {
  return (
    <ProtoHeader
      tabs={[
        { href: '/contenido', label: 'Contenido' },
        { href: '/guia', label: 'Guía de diseño' },
        { href: '/indice', label: 'Índice' },
      ]}
    >
      <OutlineBtn
        aria-label="Cambiar tema"
        onClick={() => {
          toggleTheme()
          onTheme?.()
        }}
      >
        Tema
      </OutlineBtn>
    </ProtoHeader>
  )
}
