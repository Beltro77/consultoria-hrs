'use client'

import { useState, useEffect, useMemo } from 'react'
import { BottomSheet, Btn, Input, Label, Select } from '@/components/ui'
import { createProject, findClientByEmail } from '@/lib/services/iso.service'
import { listClients } from '@/lib/services/clients.service'
import type { Client } from '@/lib/types'
import type { ProjectStatus } from '@/lib/iso-types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const ACTIVE_STATUSES = new Set(['activo', 'confirmado', 'pausado', 'inactivo'])

export default function NewProjectModal({ open, onClose, onSaved }: Props) {
  const [clients, setClients]       = useState<Client[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [name, setName]             = useState('')
  const [status, setStatus]         = useState<ProjectStatus>('active')
  const [startDate, setStart]       = useState('')
  const [endDate, setEnd]           = useState('')
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    listClients().then(all => setClients(all.filter(c => ACTIVE_STATUSES.has(c.status ?? ''))))
  }, [])

  useEffect(() => {
    if (open) {
      setSelectedId(''); setName(''); setStatus('active'); setStart(''); setEnd('')
    }
  }, [open])

  const selected = useMemo(() => clients.find(c => c.id === selectedId) ?? null, [clients, selectedId])

  function handleSelect(id: string) {
    setSelectedId(id)
    const client = clients.find(c => c.id === id)
    if (client && !name) {
      setName(`ISO 9001 — ${client.name}`)
    }
  }

  async function handleSave() {
    if (!selectedId) { alert('Seleccioná un cliente'); return }
    if (!name.trim()) { alert('Ingresá el nombre del proyecto'); return }
    setSaving(true)
    try {
      let clientUserId: string | undefined
      if (selected?.contactEmail) {
        const profile = await findClientByEmail(selected.contactEmail)
        clientUserId = profile?.userId
      }
      await createProject({
        name: name.trim(),
        clientId: selectedId,
        clientEmail: selected?.contactEmail || undefined,
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

      <Label>Cliente *</Label>
      <Select value={selectedId} onChange={e => handleSelect(e.target.value)}>
        <option value="">— Seleccioná un cliente —</option>
        {clients.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>

      {/* Info del cliente seleccionado */}
      {selected && (
        <div className="bg-stone-50 rounded-xl px-3 py-2.5 mb-3 space-y-1">
          {selected.contactName && (
            <p className="text-xs text-stone-600">
              <span className="text-stone-400">Contacto:</span>{' '}
              {selected.contactName}
              {selected.contactPosition && <span className="text-stone-400"> · {selected.contactPosition}</span>}
            </p>
          )}
          {selected.contactEmail && (
            <p className="text-xs text-stone-600">
              <span className="text-stone-400">Email:</span>{' '}
              {selected.contactEmail}
            </p>
          )}
          {selected.contactPhone && (
            <p className="text-xs text-stone-600">
              <span className="text-stone-400">Teléfono:</span>{' '}
              {selected.contactPhone}
            </p>
          )}
          {selected.website && (
            <p className="text-xs text-stone-600">
              <span className="text-stone-400">Web:</span>{' '}
              {selected.website}
            </p>
          )}
          {!selected.contactEmail && (
            <p className="text-[11px] text-amber-600">
              ⚠️ Este cliente no tiene email. El portal no podrá vincularse hasta que lo agregues en su legajo.
            </p>
          )}
        </div>
      )}

      <Label>Nombre del proyecto *</Label>
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Ej: ISO 9001 — Acme S.A."
      />

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
