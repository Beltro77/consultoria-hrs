'use client'

import { useState, useEffect } from 'react'
import { BottomSheet, Btn, Input, Label, Select } from '@/components/ui'
import { createProject, findClientByEmail } from '@/lib/services/iso.service'
import type { ProjectStatus } from '@/lib/iso-types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export default function NewProjectModal({ open, onClose, onSaved }: Props) {
  const [name, setName]           = useState('')
  const [clientEmail, setEmail]   = useState('')
  const [status, setStatus]       = useState<ProjectStatus>('active')
  const [startDate, setStart]     = useState('')
  const [endDate, setEnd]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [lookup, setLookup]       = useState<string>('')  // feedback on email lookup

  useEffect(() => {
    if (open) {
      setName(''); setEmail(''); setStatus('active')
      setStart(''); setEnd(''); setLookup('')
    }
  }, [open])

  async function handleSave() {
    if (!name.trim()) { alert('Ingresá el nombre del proyecto'); return }
    setSaving(true)
    try {
      // Try to find client by email
      let clientUserId: string | undefined
      if (clientEmail.trim()) {
        const profile = await findClientByEmail(clientEmail.trim())
        clientUserId = profile?.userId
        if (clientEmail.trim() && !clientUserId) {
          setLookup('⚠️ No se encontró un usuario cliente con ese email. El proyecto se crea sin vincular portal.')
        }
      }
      await createProject({
        name: name.trim(),
        clientEmail: clientEmail.trim() || undefined,
        clientUserId,
        status,
        startDate: startDate || undefined,
        estimatedEndDate: endDate || undefined,
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
    <BottomSheet open={open} onClose={onClose} title="Nuevo proyecto ISO 9001">
      <Label>Nombre del proyecto *</Label>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Implementación ISO — Acme S.A." />

      <Label>Email del cliente (para portal)</Label>
      <Input
        type="email"
        value={clientEmail}
        onChange={e => { setEmail(e.target.value); setLookup('') }}
        placeholder="cliente@empresa.com"
      />
      {lookup && <p className="text-[11px] text-amber-600 -mt-1 mb-2">{lookup}</p>}
      <p className="text-[10px] text-stone-400 -mt-1 mb-3">
        El usuario cliente debe crearse primero en Supabase con metadata <code>{"{"}"role": "client"{"}"}</code>
      </p>

      <Label>Estado</Label>
      <Select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}>
        <option value="active">Activo</option>
        <option value="paused">Pausado</option>
        <option value="completed">Completado</option>
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Fecha de inicio</Label>
          <Input type="date" value={startDate} onChange={e => setStart(e.target.value)} />
        </div>
        <div>
          <Label>Fecha estimada de fin</Label>
          <Input type="date" value={endDate} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>

      <div className="mt-4">
        <Btn onClick={handleSave}>{saving ? 'Guardando...' : 'Crear proyecto'}</Btn>
      </div>
    </BottomSheet>
  )
}
