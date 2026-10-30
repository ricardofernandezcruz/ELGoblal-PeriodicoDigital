'use client'

import { Fragment, useState } from 'react'
import { createTeamUser, setUserRole } from '@/app/redaccion/actions'
import { PasswordInput } from '@/components/eg/password-input'
import { ROLES, type Role } from '@/lib/roles'
import { MATRIX, PERMISSION_LABEL, PERMISSIONS, ROLE_LABEL } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useAdmin } from '../store'
import { Avatar, UserDialog } from './profile'
import { B, Badge, Card, cp, DlgRow, DlgTitle, h3, hint, I, inp, pageTitle, sub, Tbl } from '../ui'

function Invite() {
  const { closeDialog, call, setTeam, dialog } = useAdmin()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('writer')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (name.trim().length < 2) return setErr('Escribe el nombre de la persona.')
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('Escribe un correo válido, por ejemplo nombre@correo.com')
        if (password && password.length < 12) return setErr('La contraseña debe tener al menos 12 caracteres, o déjala vacía.')
        setBusy(true)
        const r = await call(createTeamUser({ name, email, role, password }))
        setBusy(false)
        if (!r) return
        setTeam((t) => [...t, r.user])
        dialog(<Created email={r.user.email} password={r.password} />)
      }}
    >
      <DlgTitle>Añadir a alguien al equipo</DlgTitle>
      <p className="text-sm text-eg-muted">Pásale los datos de acceso a la persona por un canal seguro. Podrá cambiar la contraseña en «Mi cuenta».</p>
      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="in" className="text-[13px] font-semibold">
          Nombre
        </label>
        <input id="in" className={inp} value={name} onChange={(e) => (setName(e.target.value), setErr(''))} />
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="ie" className="text-[13px] font-semibold">
          Correo electrónico
        </label>
        <input id="ie" type="email" className={inp} placeholder="nombre@correo.com" value={email} aria-invalid={!!err} onChange={(e) => (setEmail(e.target.value), setErr(''))} />
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="ir" className="text-[13px] font-semibold">
          Rol
        </label>
        <select id="ir" className={inp} value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="ip" className="text-[13px] font-semibold">
          Contraseña <span className="font-normal text-eg-muted">(opcional)</span>
        </label>
        <PasswordInput id="ip" autoComplete="new-password" className={inp} value={password} onChange={(e) => (setPassword(e.target.value), setErr(''))} />
        <div className={hint}>Mínimo 12 caracteres. Si la dejas vacía, se genera una segura automáticamente.</div>
      </div>
      <div className={cn(hint, 'mt-2 min-h-5 text-eg-accent')} role="alert">
        {err}
      </div>
      <DlgRow>
        <B v="out" onClick={closeDialog}>
          Cancelar
        </B>
        <B type="submit" disabled={busy}>
          {busy ? 'Creando…' : 'Crear cuenta'}
        </B>
      </DlgRow>
    </form>
  )
}

function Created({ email, password }: { email: string; password: string }) {
  const { closeDialog, toast } = useAdmin()
  return (
    <>
      <DlgTitle>Cuenta creada</DlgTitle>
      <p className="text-sm text-eg-muted">
        Comparte estos datos con la persona. La contraseña no se vuelve a mostrar; puede cambiarla en «Mi cuenta» al entrar.
      </p>
      <div className="mt-3 grid gap-1 rounded-lg bg-eg-soft p-3 font-mono text-[13px]">
        <span>Acceso: {typeof window !== 'undefined' ? location.origin : ''}/redaccion/login</span>
        <span>Correo: {email}</span>
        <span className="select-all">Contraseña: {password}</span>
      </div>
      <DlgRow>
        <B
          v="out"
          onClick={() =>
            navigator.clipboard
              .writeText(`Acceso: ${location.origin}/redaccion/login\nCorreo: ${email}\nContraseña: ${password}`)
              .then(
                () => toast('Datos copiados'),
                () => toast('No se pudo copiar'),
              )
          }
        >
          <I n="copy" />
          Copiar datos
        </B>
        <B onClick={closeDialog}>Listo</B>
      </DlgRow>
    </>
  )
}

export function Team() {
  const { me, team, setTeam, dialog, toast, call, can } = useAdmin()
  const allowed = can('team.manage')
  const flow: [string, string, string][] = [
    ['Borrador', 'Redactor', ''],
    ['Revisión', 'Editor', 'rev'],
    ['Programada', 'Editor', 'sch'],
    ['Publicada', 'Automático', 'pub'],
  ]
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <h2 className={pageTitle}>Equipo y permisos</h2>
          <div className="text-sm text-eg-muted">Cada persona ve y hace solo lo que necesita.</div>
        </div>
        <span className="flex-1" />
        {allowed && (
          <B onClick={() => dialog(<Invite />)}>
            <I n="plus" />
            Añadir a alguien
          </B>
        )}
      </div>

      <Card className={`${cp} mb-4`}>
        <h3 className={h3}>Recorrido de una nota</h3>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {flow.map(([s, who, k], i) => (
            <Fragment key={s}>
              <Badge k={k} className="px-3.5 py-1.5">
                {s} <span className={sub}>· {who}</span>
              </Badge>
              {i < 3 && <I n="right" />}
            </Fragment>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <Card>
          <div className={cp}>
            <h3 className={h3}>Personas</h3>
          </div>
          <div className="overflow-auto">
            <Tbl>
              <tbody>
                {team.map((m) => (
                  <tr key={m.id}>
                    <td className="w-12">
                      <Avatar name={m.name} image={m.image} />
                    </td>
                    <td>
                      <b>{m.name}</b>
                      {m.id === me.id && <span className={sub}> (tú)</span>}
                      <div className={sub}>
                        {m.email} · {m.twoFactor ? '2FA activa' : 'sin 2FA'}
                      </div>
                    </td>
                    <td>
                      <select
                        className={cn(inp, 'w-[150px]')}
                        aria-label={'Rol de ' + m.name}
                        value={m.role}
                        disabled={!allowed || m.id === me.id}
                        onChange={async (e) => {
                          const role = e.target.value as Role
                          if ((await call(setUserRole(m.id, role))) === undefined) return
                          setTeam((t) => t.map((x) => (x.id === m.id ? { ...x, role } : x)))
                          toast(`${m.name} ahora es ${ROLE_LABEL[role].toLowerCase()}`)
                        }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="w-12">
                      {(allowed || m.id === me.id) && (
                        <B v="ghost" ic sm aria-label={'Editar a ' + m.name} title="Editar perfil y acceso" onClick={() => dialog(<UserDialog id={m.id} />)}>
                          <I n="type" />
                        </B>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tbl>
          </div>
        </Card>
        <Card>
          <div className={cp}>
            <h3 className={h3}>Qué puede hacer cada rol</h3>
            <div className={sub}>Definido en el código (lib/permissions.ts) para que nadie pueda saltárselo desde el navegador.</div>
          </div>
          <div className="overflow-auto">
            <Tbl>
              <thead>
                <tr>
                  <th />
                  {ROLES.map((r) => (
                    <th key={r}>{ROLE_LABEL[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p}>
                    <td>{PERMISSION_LABEL[p]}</td>
                    {ROLES.map((r) => (
                      <td key={r} className="text-center">
                        {MATRIX[r].includes(p) ? (
                          <span className="text-eg-ok" aria-label="Sí">
                            <I n="check" />
                          </span>
                        ) : (
                          <span className="text-eg-muted" aria-label="No">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Tbl>
          </div>
        </Card>
      </div>
    </>
  )
}
