'use client'

import { useState } from 'react'
import { PasswordInput } from '@/components/eg/password-input'
import { authClient } from '@/lib/auth-client'
import { ROLE_LABEL } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useAdmin } from '../store'
import { ProfileForm } from './profile'
import { B, Badge, DlgRow, DlgTitle, hint, inp, lab, Tabs } from '../ui'

const err = (e: { status?: number; code?: string } | null) =>
  !e
    ? ''
    : e.status === 429
      ? 'Demasiados intentos. Espera un minuto.'
      : e.code === 'INVALID_PASSWORD' || e.code === 'INVALID_EMAIL_OR_PASSWORD'
        ? 'La contraseña actual no es correcta.'
        : e.code === 'PASSWORD_TOO_SHORT'
          ? 'La nueva contraseña debe tener al menos 12 caracteres.'
          : e.code === 'INVALID_CODE' || e.code === 'INVALID_TWO_FACTOR_CODE'
            ? 'El código no es válido. Escribe el que muestra tu app ahora.'
            : 'No se pudo completar. Inténtalo de nuevo.'

function Password() {
  const { toast, closeDialog } = useAdmin()
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="mt-3 grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (next.length < 12) return setMsg('La nueva contraseña debe tener al menos 12 caracteres.')
        setBusy(true)
        const { error } = await authClient.changePassword({ currentPassword: cur, newPassword: next, revokeOtherSessions: true })
        setBusy(false)
        if (error) return setMsg(err(error))
        closeDialog()
        toast('Contraseña cambiada. Se cerraron tus otras sesiones.')
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pw-cur" className={lab}>
          Contraseña actual
        </label>
        <PasswordInput id="pw-cur" autoComplete="current-password" className={inp} value={cur} onChange={(e) => (setCur(e.target.value), setMsg(''))} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pw-new" className={lab}>
          Nueva contraseña
        </label>
        <PasswordInput id="pw-new" autoComplete="new-password" className={inp} value={next} onChange={(e) => (setNext(e.target.value), setMsg(''))} />
        <span className={hint}>Mínimo 12 caracteres. Una frase larga es más segura que una palabra con símbolos.</span>
      </div>
      <div role="alert" className="min-h-5 text-[13px] text-eg-accent">
        {msg}
      </div>
      <DlgRow className="mt-0">
        <B type="submit" disabled={busy || !cur || !next}>
          {busy ? 'Guardando…' : 'Cambiar contraseña'}
        </B>
      </DlgRow>
    </form>
  )
}

function TwoFactor() {
  const { me, toast } = useAdmin()
  const [pw, setPw] = useState('')
  const [setup, setSetup] = useState<{ uri: string; secret: string; codes: string[] } | null>(null)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  if (me.twoFactorEnabled)
    return (
      <form
        className="mt-3 grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          const { error } = await authClient.twoFactor.disable({ password: pw })
          setBusy(false)
          if (error) return setMsg(err(error))
          toast('Verificación en dos pasos desactivada')
          location.reload()
        }}
      >
        <p className="m-0 text-sm">
          <Badge k="pub">Activa</Badge> Cada inicio de sesión te pide un código de tu app.
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tf-pw" className={lab}>
            Contraseña, para desactivarla
          </label>
          <PasswordInput id="tf-pw" className={inp} value={pw} onChange={(e) => (setPw(e.target.value), setMsg(''))} />
        </div>
        <div role="alert" className="min-h-5 text-[13px] text-eg-accent">
          {msg}
        </div>
        <DlgRow className="mt-0">
          <B v="out" type="submit" disabled={busy || !pw}>
            Desactivar verificación en dos pasos
          </B>
        </DlgRow>
      </form>
    )

  if (!setup)
    return (
      <form
        className="mt-3 grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          const { data, error } = await authClient.twoFactor.enable({ password: pw })
          setBusy(false)
          if (error || !data || !('totpURI' in data)) return setMsg(err(error))
          const secret = new URL(data.totpURI).searchParams.get('secret') ?? ''
          setSetup({ uri: data.totpURI, secret, codes: data.backupCodes })
        }}
      >
        <p className="m-0 text-sm text-eg-muted">
          Protege tu cuenta con un código de tu teléfono, además de la contraseña. Es lo más importante para evitar que
          alguien publique en tu nombre.
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tf-pw" className={lab}>
            Tu contraseña
          </label>
          <PasswordInput id="tf-pw" className={inp} value={pw} onChange={(e) => (setPw(e.target.value), setMsg(''))} />
        </div>
        <div role="alert" className="min-h-5 text-[13px] text-eg-accent">
          {msg}
        </div>
        <DlgRow className="mt-0">
          <B type="submit" disabled={busy || !pw}>
            Activar verificación en dos pasos
          </B>
        </DlgRow>
      </form>
    )

  return (
    <form
      className="mt-3 grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        const { error } = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, '') })
        setBusy(false)
        if (error) return setMsg(err(error))
        toast('Verificación en dos pasos activada')
        location.reload()
      }}
    >
      <ol className="m-0 grid gap-2 pl-5 text-sm">
        <li>
          En tu app de autenticación, añade una cuenta con esta clave (o{' '}
          <a href={setup.uri} className="text-eg-info underline">
            ábrela desde el teléfono
          </a>
          ):
          <code className="mt-1 block rounded-md bg-eg-soft px-2.5 py-2 font-mono text-[13px] break-all select-all">{setup.secret}</code>
        </li>
        <li>
          Guarda estos códigos de emergencia en un lugar seguro. Cada uno sirve una vez si pierdes el teléfono:
          <code className="mt-1 block rounded-md bg-eg-soft px-2.5 py-2 font-mono text-[13px] leading-relaxed select-all">{setup.codes.join('  ')}</code>
        </li>
        <li>Escribe el código de 6 cifras que muestra la app para terminar.</li>
      </ol>
      <input
        aria-label="Código de 6 cifras"
        inputMode="numeric"
        autoComplete="one-time-code"
        className={cn(inp, 'font-mono tracking-[.3em]')}
        maxLength={7}
        value={code}
        onChange={(e) => (setCode(e.target.value), setMsg(''))}
      />
      <div role="alert" className="min-h-5 text-[13px] text-eg-accent">
        {msg}
      </div>
      <DlgRow className="mt-0">
        <B type="submit" disabled={busy || code.trim().length < 6}>
          Confirmar y activar
        </B>
      </DlgRow>
    </form>
  )
}

export function AccountDialog() {
  const { me, team, closeDialog } = useAdmin()
  const [tab, setTab] = useState<'perfil' | '2fa' | 'pw'>(me.twoFactorEnabled ? 'perfil' : '2fa')
  const self = team.find((u) => u.id === me.id)
  return (
    <>
      <DlgTitle>Mi cuenta</DlgTitle>
      <p className="mb-3 text-sm text-eg-muted">
        {me.name} · {me.email} · {ROLE_LABEL[me.role]}
      </p>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          ['perfil', 'Perfil'],
          ['2fa', 'Verificación en dos pasos'],
          ['pw', 'Contraseña'],
        ]}
      />
      {tab === 'perfil' ? self && <ProfileForm target={self} /> : tab === '2fa' ? <TwoFactor /> : <Password />}
      <DlgRow>
        <B v="ghost" onClick={closeDialog}>
          Cerrar
        </B>
      </DlgRow>
    </>
  )
}
