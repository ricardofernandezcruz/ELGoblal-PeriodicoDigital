'use client'

import { useEffect, useState } from 'react'
import { OutlineBtn, ProtoHeader } from '@/components/eg/proto-header'
import { toggleTheme } from '@/components/eg/theme'

export function MovilHeader() {
  const [rm, setRm] = useState(false)
  useEffect(() => setRm(document.documentElement.dataset.rm === '1'), [])
  return (
    <ProtoHeader
      tabs={[
        { href: '/movil', label: 'Móvil' },
        { href: '/detalles', label: 'Detalles' },
        { href: '/hoja-de-ruta', label: 'Hoja de ruta' },
      ]}
    >
      <OutlineBtn
        aria-pressed={rm}
        title="Reducir movimiento"
        className="max-[520px]:px-2 max-[520px]:text-xs"
        onClick={() => {
          const n = !rm
          setRm(n)
          if (n) document.documentElement.dataset.rm = '1'
          else delete document.documentElement.dataset.rm
        }}
      >
        Sin animación
      </OutlineBtn>
      <OutlineBtn aria-label="Cambiar tema" className="max-[520px]:px-2 max-[520px]:text-xs" onClick={() => toggleTheme()}>
        Tema
      </OutlineBtn>
    </ProtoHeader>
  )
}
