'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from './icon'

/** Campo de contraseña con botón para mostrarla u ocultarla. */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} className={cn(className, 'pr-11')} spellCheck={false} autoCapitalize="none" {...props} />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={show}
        title={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-md border-0 bg-transparent text-eg-muted hover:bg-eg-soft hover:text-eg-ink"
      >
        <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </div>
  )
}
