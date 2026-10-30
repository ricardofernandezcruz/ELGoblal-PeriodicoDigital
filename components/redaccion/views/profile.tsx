'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deleteTeamUser, resetUserPassword, resetUserTwoFactor, revokeUserSessions, setUserAvatar, updateProfile } from '@/app/redaccion/actions'
import { ArtImg } from '@/components/eg/art'
import { ROLE_LABEL } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { AdminUser } from '../data'
import { useAdmin } from '../store'
import { B, Badge, DlgRow, DlgTitle, hint, I, inp, lab, Tabs, ta } from '../ui'
import { useUpload } from './media'

export function Avatar({ name, image, size = 36, className }: { name: string; image?: string | null; size?: number; className?: string }) {
  return (
    <div
      className={cn('grid flex-none place-items-center overflow-hidden rounded-full bg-eg-soft font-semibold text-eg-muted', className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {image ? <ArtImg src={image} alt="" /> : name.slice(0, 1).toUpperCase()}
    </div>
  )
}

/** Datos públicos y de acceso de una persona del equipo. */
export function ProfileForm({ target }: { target: AdminUser }) {
  const { me, can, call, toast, setTeam } = useAdmin()
  const router = useRouter()
  const upload = useUpload()
  const isSelf = target.id === me.id
  const manager = can('team.manage')
  const [name, setName] = useState(target.name)
  const [email, setEmail] = useState(target.email)
  const [bio, setBio] = useState(target.bio)
  const [image, setImage] = useState(target.image)
  const [busy, setBusy] = useState<'' | 'save' | 'photo'>('')
  const [err, setErr] = useState('')

  const patchTeam = (p: Partial<AdminUser>) => setTeam((t) => t.map((x) => (x.id === target.id ? { ...x, ...p } : x)))

  const avatar = async (mediaId: string | null) => {
    setBusy('photo')
    const url = await call(setUserAvatar(target.id, mediaId))
    setBusy('')
    if (url === undefined) return
    setImage(url)
    patchTeam({ image: url })
    if (isSelf) router.refresh()
    toast(mediaId ? 'Foto de perfil actualizada' : 'Foto de perfil quitada')
  }

  return (
    <form
      className="mt-3 grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (name.trim().length < 2) return setErr('Escribe un nombre de al menos 2 letras.')
        if (manager && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('Escribe un correo válido, por ejemplo nombre@correo.com')
        setBusy('save')
        const ok = await call(updateProfile(target.id, { name, bio, ...(manager && email !== target.email ? { email } : {}) }))
        setBusy('')
        if (ok === undefined) return
        patchTeam({ name: name.trim(), email: manager ? email.trim().toLowerCase() : target.email, bio: bio.trim() })
        if (isSelf) router.refresh()
        toast('Perfil guardado')
      }}
    >
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={name || '?'} image={image} size={72} />
        <div className="flex flex-wrap gap-2">
          <B
            v="out"
            sm
            disabled={!!busy}
            onClick={() =>
              upload(
                (m) => avatar(m.id),
                (b) => setBusy(b ? 'photo' : ''),
              )
            }
          >
            <I n="up2" />
            {busy === 'photo' ? 'Subiendo…' : image ? 'Cambiar foto' : 'Subir foto'}
          </B>
          {image && (
            <B v="ghost" sm disabled={!!busy} onClick={() => avatar(null)}>
              Quitar foto
            </B>
          )}
        </div>
        <span className={cn(hint, 'basis-full')}>Se muestra en el panel y junto a la firma en las notas. Mejor cuadrada, hasta 3 MB.</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pf-name" className={lab}>
          Nombre (así aparece la firma)
        </label>
        <input id="pf-name" className={inp} value={name} maxLength={80} onChange={(e) => (setName(e.target.value), setErr(''))} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pf-email" className={lab}>
          Correo de acceso
        </label>
        <input
          id="pf-email"
          type="email"
          className={cn(inp, 'disabled:opacity-60')}
          value={email}
          disabled={!manager}
          onChange={(e) => (setEmail(e.target.value), setErr(''))}
        />
        {!manager && <span className={hint}>Solo un administrador puede cambiar el correo con el que se entra.</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pf-bio" className={lab}>
          Biografía breve <span className="font-normal text-eg-muted">(opcional)</span>
        </label>
        <textarea id="pf-bio" className={cn(ta, 'min-h-[70px]')} value={bio} maxLength={300} onChange={(e) => setBio(e.target.value)} />
        <span className={hint}>{bio.length} de 300 caracteres</span>
      </div>
      <div role="alert" className="min-h-5 text-[13px] text-eg-accent">
        {err}
      </div>
      <DlgRow className="mt-0">
        <B type="submit" disabled={!!busy}>
          {busy === 'save' ? 'Guardando…' : 'Guardar perfil'}
        </B>
      </DlgRow>
    </form>
  )
}

function TempPassword({ name, email, password }: { name: string; email: string; password: string }) {
  const { toast } = useAdmin()
  return (
    <div className="mt-3 rounded-lg bg-eg-soft p-3">
      <p className="m-0 mb-2 text-sm">
        Nueva contraseña temporal de <b>{name}</b>. Se muestra solo esta vez; sus sesiones abiertas se cerraron.
      </p>
      <code className="block font-mono text-[15px] break-all select-all">{password}</code>
      <B
        v="out"
        sm
        className="mt-2"
        onClick={() =>
          navigator.clipboard
            .writeText(`Acceso: ${location.origin}/redaccion/login\nCorreo: ${email}\nContraseña temporal: ${password}`)
            .then(
              () => toast('Datos copiados'),
              () => toast('No se pudo copiar'),
            )
        }
      >
        <I n="copy" />
        Copiar datos de acceso
      </B>
    </div>
  )
}

/** Contraseña, verificación en dos pasos, sesiones y eliminación (solo administradores). */
function Security({ target }: { target: AdminUser }) {
  const { call, toast, setTeam, closeDialog } = useAdmin()
  const [confirm, setConfirm] = useState<'' | 'pw' | '2fa' | 'del'>('')
  const [temp, setTemp] = useState('')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const row = 'flex flex-wrap items-center justify-between gap-3 border-b border-eg-rule py-3'

  return (
    <div className="mt-2">
      <div className={row}>
        <div>
          <b>Contraseña</b>
          <div className="text-xs text-eg-muted">Genera una contraseña temporal nueva y cierra sus sesiones.</div>
        </div>
        {confirm === 'pw' ? (
          <span className="flex gap-2">
            <B v="ghost" sm onClick={() => setConfirm('')}>
              Cancelar
            </B>
            <B
              sm
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                const p = await call(resetUserPassword(target.id))
                setBusy(false)
                setConfirm('')
                if (p) setTemp(p)
              }}
            >
              Sí, restablecer
            </B>
          </span>
        ) : (
          <B v="out" sm onClick={() => setConfirm('pw')}>
            <I n="key" />
            Restablecer contraseña
          </B>
        )}
      </div>
      {temp && <TempPassword name={target.name} email={target.email} password={temp} />}

      <div className={row}>
        <div>
          <b>Verificación en dos pasos</b> {target.twoFactor ? <Badge k="pub">Activa</Badge> : <Badge>Sin activar</Badge>}
          <div className="text-xs text-eg-muted">Quítala si la persona perdió el teléfono; tendrá que volver a activarla.</div>
        </div>
        {target.twoFactor &&
          (confirm === '2fa' ? (
            <span className="flex gap-2">
              <B v="ghost" sm onClick={() => setConfirm('')}>
                Cancelar
              </B>
              <B
                sm
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  const ok = await call(resetUserTwoFactor(target.id))
                  setBusy(false)
                  setConfirm('')
                  if (ok === undefined) return
                  setTeam((t) => t.map((x) => (x.id === target.id ? { ...x, twoFactor: false } : x)))
                  toast('Verificación en dos pasos quitada')
                }}
              >
                Sí, quitarla
              </B>
            </span>
          ) : (
            <B v="out" sm onClick={() => setConfirm('2fa')}>
              Quitar verificación
            </B>
          ))}
      </div>

      <div className={row}>
        <div>
          <b>Sesiones abiertas</b>
          <div className="text-xs text-eg-muted">Cierra su sesión en todos los dispositivos.</div>
        </div>
        <B
          v="out"
          sm
          disabled={busy}
          onClick={async () => {
            const n = await call(revokeUserSessions(target.id))
            if (n !== undefined) toast(n ? `Se cerraron ${n} ${n === 1 ? 'sesión' : 'sesiones'}` : 'No tenía sesiones abiertas')
          }}
        >
          <I n="logout" />
          Cerrar sesiones
        </B>
      </div>

      <div className="mt-4 rounded-xl border border-eg-accent/40 p-3.5">
        <b className="text-eg-accent">Eliminar cuenta</b>
        <p className="mt-1 mb-2 text-xs text-eg-muted">
          La persona deja de poder entrar. Sus notas y su firma se conservan. No se puede deshacer.
        </p>
        {confirm === 'del' ? (
          <div className="grid gap-2">
            <label htmlFor="del-name" className={lab}>
              Escribe «{target.name}» para confirmar
            </label>
            <input id="del-name" className={inp} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            <span className="flex flex-wrap justify-end gap-2">
              <B v="ghost" sm onClick={() => (setConfirm(''), setTyped(''))}>
                Cancelar
              </B>
              <B
                v="acc"
                sm
                disabled={busy || typed.trim() !== target.name}
                onClick={async () => {
                  setBusy(true)
                  const ok = await call(deleteTeamUser(target.id))
                  setBusy(false)
                  if (ok === undefined) return
                  setTeam((t) => t.filter((x) => x.id !== target.id))
                  closeDialog()
                  toast(`Cuenta de ${target.name} eliminada`)
                }}
              >
                <I n="trash" />
                Eliminar la cuenta de {target.name}
              </B>
            </span>
          </div>
        ) : (
          <B v="out" sm onClick={() => setConfirm('del')}>
            <I n="trash" />
            Eliminar cuenta…
          </B>
        )}
      </div>
    </div>
  )
}

/** Diálogo de edición de una persona desde Equipo. */
export function UserDialog({ id }: { id: string }) {
  const { me, team, can, closeDialog } = useAdmin()
  const target = team.find((u) => u.id === id)
  const [tab, setTab] = useState<'perfil' | 'seg'>('perfil')
  if (!target) return null
  const showSecurity = can('team.manage') && target.id !== me.id
  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar name={target.name} image={target.image} size={44} />
        <div>
          <DlgTitle>{target.name}</DlgTitle>
          <div className="-mt-1 text-sm text-eg-muted">
            {ROLE_LABEL[target.role]} · {target.email}
          </div>
        </div>
      </div>
      {showSecurity && (
        <div className="mt-3">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              ['perfil', 'Perfil'],
              ['seg', 'Acceso y seguridad'],
            ]}
          />
        </div>
      )}
      {tab === 'perfil' || !showSecurity ? <ProfileForm key={target.id} target={target} /> : <Security target={target} />}
      <DlgRow>
        <B v="ghost" onClick={closeDialog}>
          Cerrar
        </B>
      </DlgRow>
    </>
  )
}
