'use client'

import { Fragment, useState } from 'react'
import { ArtImg } from '@/components/eg/art'
import { cn } from '@/lib/utils'
import { PERM, PM, ROLES, TEAM } from '../data'
import { useAdmin } from '../store'
import { B, Badge, Card, chk, cp, DlgRow, DlgTitle, h3, hint, I, inp, pageTitle, sub, Tbl } from '../ui'

function Invite() {
  const { closeDialog, toast } = useAdmin()
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  return (
    <>
      <DlgTitle>Invitar a alguien</DlgTitle>
      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="ie" className="text-[13px] font-semibold">
          Correo electrónico
        </label>
        <input
          id="ie"
          type="email"
          className={inp}
          placeholder="nombre@correo.com"
          value={email}
          aria-invalid={!!err}
          onChange={(e) => {
            setEmail(e.target.value)
            setErr('')
          }}
        />
        <div className={cn(hint, err && 'text-eg-accent')} role="alert">
          {err}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="ir" className="text-[13px] font-semibold">
          Rol
        </label>
        <select id="ir" className={inp}>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
      <DlgRow>
        <B v="out" onClick={closeDialog}>
          Cancelar
        </B>
        <B
          onClick={() => {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              setErr('Escribe un correo válido, por ejemplo nombre@correo.com')
              return
            }
            closeDialog()
            toast('Invitación enviada a ' + email)
          }}
        >
          Enviar invitación
        </B>
      </DlgRow>
    </>
  )
}

export function Team() {
  const { dialog, toast } = useAdmin()
  const [pm, setPm] = useState(PM)
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
        <B onClick={() => dialog(<Invite />)}>
          <I n="plus" />
          Invitar a alguien
        </B>
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
                {TEAM.map(([name, role, av]) => (
                  <tr key={name}>
                    <td className="w-14">
                      <div className="size-9 overflow-hidden rounded-full">
                        <ArtImg src={av} />
                      </div>
                    </td>
                    <td>
                      <b>{name}</b>
                    </td>
                    <td>
                      <select
                        className={cn(inp, 'w-[150px]')}
                        aria-label={'Rol de ' + name}
                        defaultValue={ROLES.find((r) => r.replace(/a$/, '') === role.replace(/a$/, ''))}
                        onChange={() => toast('Rol actualizado')}
                      >
                        {ROLES.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
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
          </div>
          <div className="overflow-auto">
            <Tbl>
              <thead>
                <tr>
                  <th />
                  {ROLES.map((r) => (
                    <th key={r}>{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERM.map((p, pi) => (
                  <tr key={p}>
                    <td>{p}</td>
                    {ROLES.map((r, ri) => (
                      <td key={r}>
                        <input
                          type="checkbox"
                          className={chk}
                          checked={!!pm[ri][pi]}
                          aria-label={`${r}: ${p}`}
                          onChange={(e) => {
                            setPm((m) => m.map((row, i) => (i === ri ? row.map((v, j) => (j === pi ? +e.target.checked : v)) : row)))
                            toast('Permiso actualizado')
                          }}
                        />
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
