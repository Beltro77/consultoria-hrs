'use client'
import { useState } from 'react'
import { BottomSheet, Btn, Input, Label, Select, Textarea, Tag } from '@/components/ui'
import { ENTRY_TASK_TYPES, INTERNAL_CLIENTS, type Client, type HourEntry, type EntryTaskType } from '@/lib/types'
import { upsertEntry } from '@/lib/storage'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clients: Client[]
  defaultDate: string
}

export default function EntryModal({ open, onClose, onSaved, clients, defaultDate }: Props) {
  const allEntities = [...INTERNAL_CLIENTS, ...clients]
  const [clientId, setClientId] = useState(allEntities[0]?.id ?? '')
  const [task, setTask]         = useState<EntryTaskType>(ENTRY_TASK_TYPES[0])
  const [detail, setDetail]     = useState('')
  const [hours, setHours]       = useState('')
  const [date, setDate]         = useState(defaultDate)

  // Sync date when defaultDate changes
  if (date !== defaultDate && !hours) setDate(defaultDate)

  function handleSave() {
    if (!clientId || !hours || !date) { alert('Completá cliente, horas y fecha'); return }
    upsertEntry({
      id: `e_${Date.now()}`,
      clientId, task,
      detail: detail.trim(),
      hours: parseFloat(hours),
      date,
      createdAt: new Date().toISOString(),
    })
    setHours(''); setDetail('')
    onSaved(); onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Registrar horas">
      <Label>Cliente / Área</Label>
      <Select value={clientId} onChange={e => setClientId(e.target.value)}>
        {allEntities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </Select>

      <Label>Tipo de tarea</Label>
      <div className="flex flex-wrap gap-2 mt-1">
        {ENTRY_TASK_TYPES.map(t => (
          <Tag key={t} label={t} selected={task === t} onClick={() => setTask(t)} />
        ))}
      </div>

      <Label>Detalle (opcional)</Label>
      <Textarea value={detail} onChange={e => setDetail(e.target.value)}
        placeholder="Ej: revisión contrato, kick-off..." rows={2} />

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <Label>Horas</Label>
          <Input type="number" value={hours} onChange={e => setHours(e.target.value)}
            placeholder="0" min={0.25} step={0.25} />
        </div>
        <div>
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <Btn onClick={handleSave}>Guardar</Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </BottomSheet>
  )
}
