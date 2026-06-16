'use client'

import { useState, useEffect } from 'react'
import { BottomSheet, Btn, Input, Label, Textarea } from '@/components/ui'
import { upsertProjectMember } from '@/lib/services/iso.service'
import type { ProjectMember } from '@/lib/iso-types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  projectId: string
  editing?: ProjectMember | null
}

export default function MemberModal({ open, onClose, onSaved, projectId, editing }: Props) {
  const [processName, setProcess] = useState('')
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [position, setPosition]   = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (open) {
      setProcess(editing?.processName ?? '')
      setName(editing?.memberName ?? '')
      setEmail(editing?.memberEmail ?? '')
      setPosition(editing?.memberPosition ?? '')
    }
  }, [open, editing])

  async function handleSave() {
    if (!processName.trim()) { alert('Ingresá el nombre del proceso'); return }
    if (!name.trim())        { alert('Ingresá el nombre del responsable'); return }
    if (!email.trim())       { alert('Ingresá el email'); return }
    setSaving(true)
    try {
      await upsertProjectMember({
        id: editing?.id,
        projectId,
        processName: processName.trim(),
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

  return (
    <BottomSheet open={open} onClose={onClose} title={editing ? 'Editar responsable' : 'Nuevo responsable de proceso'}>
      <Label>Proceso *</Label>
      <Input
        value={processName}
        onChange={e => setProcess(e.target.value)}
        placeholder="Ej: Producción, Compras, RRHH, Administración..."
      />

      <Label>Nombre del responsable *</Label>
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
            placeholder="Ej: Jefe de área"
          />
        </div>
        <div>
          <Label>Email *</Label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="responsable@empresa.com"
          />
        </div>
      </div>

      <p className="text-[10px] text-stone-400 mt-1 mb-3">
        El email será el acceso al portal. Después de guardarlo, usá "Enviar acceso" para invitar al responsable por email (crea su cuenta automáticamente si no existe).
      </p>

      <Btn onClick={handleSave}>{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar responsable'}</Btn>
    </BottomSheet>
  )
}
