'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { PasswordInput } from '@/components/eg/password-input'
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

const btn = 'h-[42px] rounded-lg bg-eg-ink font-semibold text-eg-bg hover:brightness-[1.12] disabled:opacity-50'
const linkCls = 'text-center text-[13px] text-eg-muted underline-offset-4 hover:text-eg-ink hover:underline'

/** Pedir el enlace para cambiar la contraseña. La respuesta es la misma exista o no la cuenta. */
function ForgotForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (sent)
    return (
      <div className="grid gap-4">
        <p className="m-0 text-[15px] leading-normal">
          Si <b>{email.trim()}</b> tiene cuenta en la redacción, te llegará un enlace en unos minutos. Vale 1 hora. Revisa también la carpeta de spam.
        </p>
        <a href="/redaccion/login" className={linkCls}>
          Volver a iniciar sesión
        </a>
      </div>
    )
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr('Escribe un correo válido, por ejemplo nombre@correo.com')
        setBusy(true)
        const { error } = await authClient.requestPasswordReset({ email: email.trim() })
        setBusy(false)
        if (error?.status === 429) return setErr('Ya pediste varios enlaces. Espera unos minutos y revisa tu correo.')
        if (error) return setErr('No pudimos enviar el correo ahora. Inténtalo de nuevo en un momento.')
        setSent(true)
      }}
    >
      <p className="m-0 text-[15px] leading-normal text-eg-muted">Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.</p>
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
          onChange={(e) => (setEmail(e.target.value), setErr(''))}
        />
      </div>
      <div id="err" role="alert" className="min-h-5 text-[13px] text-eg-accent">
        {err}
      </div>
      <button disabled={busy || !email} className={btn}>
        {busy ? 'Enviando…' : 'Enviarme el enlace'}
      </button>
      <a href="/redaccion/login" className={linkCls}>
        Volver a iniciar sesión
      </a>
    </form>
  )
}

/** Elegir la contraseña nueva con el enlace del correo. */
function ResetForm({ token }: { token: string }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  if (done)
    return (
      <div className="grid gap-4">
        <p className="m-0 text-[15px] leading-normal">Listo: tu contraseña cambió. Por seguridad cerramos las sesiones abiertas en otros equipos.</p>
        <a href="/redaccion/login" className={cn(btn, 'grid place-items-center')}>
          Iniciar sesión
        </a>
      </div>
    )
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (pw.length < 12) return setErr('La contraseña debe tener al menos 12 caracteres.')
        if (pw !== pw2) return setErr('Las dos contraseñas no coinciden.')
        setBusy(true)
        const { error } = await authClient.resetPassword({ newPassword: pw, token })
        setBusy(false)
        if (error?.code === 'INVALID_TOKEN' || error?.status === 400) return setErr('El enlace caducó o ya se usó. Pide uno nuevo.')
        if (error?.status === 429) return setErr('Demasiados intentos. Espera un minuto y vuelve a probar.')
        if (error) return setErr('No pudimos cambiar la contraseña. Inténtalo de nuevo en un momento.')
        setDone(true)
      }}
    >
      <p className="m-0 text-[15px] leading-normal text-eg-muted">Elige una contraseña nueva de al menos 12 caracteres. Una frase de varias palabras es fácil de recordar y difícil de adivinar.</p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pw" className={lab}>
          Contraseña nueva
        </label>
        <PasswordInput id="pw" className={inp} autoComplete="new-password" autoFocus value={pw} aria-invalid={!!err} aria-describedby="err" onChange={(e) => (setPw(e.target.value), setErr(''))} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pw2" className={lab}>
          Repítela
        </label>
        <PasswordInput id="pw2" className={inp} autoComplete="new-password" value={pw2} aria-invalid={!!err} aria-describedby="err" onChange={(e) => (setPw2(e.target.value), setErr(''))} />
      </div>
      <div id="err" role="alert" className="min-h-5 text-[13px] text-eg-accent">
        {err}
      </div>
      <button disabled={busy || !pw || !pw2} className={btn}>
        {busy ? 'Guardando…' : 'Guardar contraseña'}
      </button>
      {err.startsWith('El enlace') && (
        <a href="/redaccion/login?paso=recuperar" className={linkCls}>
          Pedir un enlace nuevo
        </a>
      )}
    </form>
  )
}

function Forms() {
  const q = useSearchParams()
  const token = q.get('token')
  if (token) return <ResetForm token={token} />
  if (q.get('paso') === 'recuperar') return <ForgotForm />
  return <LoginForm twoFactor={q.get('paso') === '2fa'} />
}

function LoginForm({ twoFactor }: { twoFactor: boolean }) {
  const router = useRouter()
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
            <PasswordInput
              id="password"
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
      <button disabled={busy || (twoFactor ? code.trim().length < 6 : !email || !password)} className={btn}>
        {busy ? 'Comprobando…' : twoFactor ? 'Verificar código' : 'Iniciar sesión'}
      </button>
      {twoFactor ? (
        <a href="/redaccion/login" className={linkCls}>
          Volver a empezar
        </a>
      ) : (
        <a href="/redaccion/login?paso=recuperar" className={linkCls}>
          ¿Olvidaste tu contraseña?
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
          <Forms />
        </Suspense>
        <p className="mt-6 mb-0 text-xs text-eg-muted">
          El acceso es solo por invitación. Si no tienes cuenta, pídesela a un editor.
        </p>
      </div>
    </main>
  )
}
