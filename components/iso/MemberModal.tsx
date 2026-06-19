'use client'

import { useState, useEffect } from 'react'
import { BottomSheet, Btn, Input, Label } from '@/components/ui'
import { upsertProjectMember } from '@/lib/services/iso.service'
import type { ProjectMember, MemberRole } from '@/lib/iso-types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  projectId: string
  editing?: ProjectMember | null
}

export default function MemberModal({ open, onClose, onSaved, projectId, editing }: Props) {
  const [role, setRole]           = useState<MemberRole>('owner')
  const [processName, setProcess] = useState('')
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [position, setPosition]   = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (open) {
      setRole(editing?.memberRole ?? 'owner')
      setProcess(editing?.processName ?? '')
      setName(editing?.memberName ?? '')
      setEmail(editing?.memberEmail ?? '')
      setPosition(editing?.memberPosition ?? '')
    }
  }, [open, editing])

  async function handleSave() {
    if (!name.trim())  { alert('Ingresá el nombre'); return }
    if (!email.trim()) { alert('Ingresá el email'); return }
    if (role === 'owner' && !processName.trim()) { alert('Ingresá el nombre del proceso'); return }
    setSaving(true)
    try {
      await upsertProjectMember({
        id: editing?.id,
        projectId,
        memberRole:  role,
        processName: role === 'coordinator' ? (processName.trim() || 'Coordinación') : processName.trim(),
        memberName:  name.trim(),
        memberEmail: email.trim().toLowerCase(),
        memberPosition: position.trim() || undefined,
      })
      onSaved()
      onClose()
    } catch (err) {
      alert(`Error: ${(err as Error)?.message}`)
    } finally {
      setSaving(false)
    }
  }

  const isCoordinator = role === 'coordinator'

  return (
    <BottomSheet open={open} onClose={onClose} title={editing ? 'Editar referente' : 'Nuevo referente'}>

      {/* Selector de rol */}
      <div className="flex border border-stone-200 rounded-xl overflow-hidden mb-4">
        {([
          { id: 'owner',       label: 'Responsable de proceso' },
          { id: 'coordinator', label: 'Coordinadora de proyecto' },
        ] as { id: MemberRole; label: string }[]).map(r => (
          <button
            key={r.id}
            onClick={() => setRole(r.id)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              role === r.id ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!isCoordinator && (
        <>
          <Label>Proceso *</Label>
          <Input
            value={processName}
            onChange={e => setProcess(e.target.value)}
            placeholder="Ej: Producción, Compras, RRHH, Administración..."
          />
        </>
      )}

      <Label>Nombre *</Label>
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nombre completo"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Posición / cargo</Label>
          <Input
            value={position}
            onChange={e => setPosition(e.target.value)}
            placeholder="Ej: Jefa de proyecto"
          />
        </div>
        <div>
          <Label>Email *</Label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="coordinadora@empresa.com"
          />
        </div>
      </div>

      <p className="text-[10px] text-stone-400 mt-1 mb-3">
        El email será el acceso al portal. Usá "Enviar acceso" para invitar por email.
      </p>

      <Btn onClick={handleSave}>{saving ? 'Guardando...' : editing ? 'Guardar cambios' : isCoordinator ? 'Agregar coordinadora' : 'Agregar responsable'}</Btn>
    </BottomSheet>
  )
}
