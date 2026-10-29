'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

const inp =
  'h-[42px] w-full rounded-lg border border-eg-rule bg-eg-panel px-3 text-eg-ink aria-[invalid=true]:border-eg-accent'
const lab = 'text-[13px] font-semibold'

function message(e: { status?: number; code?: string; message?: string } | null) {
  if (!e) return ''
  if (e.status === 429) return 'Demasiados intentos. Espera un minuto y vuelve a probar.'
  if (e.code === 'INVALID_EMAIL_OR_PASSWORD') return 'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.'
  if (e.code === 'INVALID_CODE' || e.code === 'INVALID_TWO_FACTOR_CODE') return 'El código no es válido o ya caducó. Escribe el que muestra tu app ahora.'
  return 'No pudimos iniciar sesión. Inténtalo de nuevo en un momento.'
}

function LoginForm() {
  const router = useRouter()
  const twoFactor = useSearchParams().get('paso') === '2fa'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const done = () => {
    router.replace('/redaccion')
    router.refresh()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    if (twoFactor) {
      const { error } = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, '') })
      setBusy(false)
      if (error) return setErr(message(error))
      return done()
    }
    const { data, error } = await authClient.signIn.email({ email: email.trim(), password })
    setBusy(false)
    if (error) return setErr(message(error))
    // Con 2FA activo, el cliente redirige solo al paso del código.
    if (data && !('twoFactorRedirect' in data && data.twoFactorRedirect)) done()
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {twoFactor ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="code" className={lab}>
            Código de verificación
          </label>
          <input
            id="code"
            className={cn(inp, 'font-mono tracking-[.3em]')}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={7}
            value={code}
            aria-invalid={!!err}
            aria-describedby="err"
            onChange={(e) => {
              setCode(e.target.value)
              setErr('')
            }}
          />
          <span className="text-xs text-eg-muted">Ábrelo en tu app de autenticación (Google Authenticator, 1Password…).</span>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={lab}>
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              className={inp}
              autoComplete="username"
              autoFocus
              value={email}
              aria-invalid={!!err}
              aria-describedby="err"
              onChange={(e) => {
                setEmail(e.target.value)
                setErr('')
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className={lab}>
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className={inp}
              autoComplete="current-password"
              value={password}
              aria-invalid={!!err}
              aria-describedby="err"
              onChange={(e) => {
                setPassword(e.target.value)
                setErr('')
              }}
            />
          </div>
        </>
      )}
      <div id="err" role="alert" className="min-h-5 text-[13px] text-eg-accent">
        {err}
      </div>
      <button
        disabled={busy || (twoFactor ? code.trim().length < 6 : !email || !password)}
        className="h-[42px] rounded-lg bg-eg-ink font-semibold text-eg-bg hover:brightness-[1.12] disabled:opacity-50"
      >
        {busy ? 'Comprobando…' : twoFactor ? 'Verificar código' : 'Iniciar sesión'}
      </button>
      {twoFactor && (
        <a href="/redaccion/login" className="text-center text-[13px] text-eg-muted underline-offset-4 hover:underline">
          Volver a empezar
        </a>
      )}
    </form>
  )
}

export default function Page() {
  return (
    <main className="eg-admin grid min-h-screen place-items-center bg-eg-bg px-4 text-sm text-eg-ink">
      <div className="w-full max-w-[400px] rounded-[14px] border border-eg-rule bg-eg-panel p-7 shadow-[0_24px_60px_rgba(0,0,0,.08)]">
        <div className="mb-6">
          <div className="font-serif text-[28px] leading-none font-semibold tracking-[-.02em]">El Global</div>
          <div className="mt-1 text-[11px] font-medium tracking-[.08em] text-eg-muted uppercase">Panel de redacción</div>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-6 mb-0 text-xs text-eg-muted">
          El acceso es solo por invitación. Si no tienes cuenta, pídesela a un editor.
        </p>
      </div>
    </main>
  )
}
