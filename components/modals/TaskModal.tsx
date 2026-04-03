'use client'
import { useState } from 'react'
import { BottomSheet, Btn, Input, Label, Select, Tag, Textarea } from '@/components/ui'
import { upsertTask, upsertRecurDef, syncRecurring } from '@/lib/storage'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  defaultDate: string
}

type TType = 'puntual' | 'recurrente'

export default function TaskModal({ open, onClose, onSaved, defaultDate }: Props) {
  const [type, setType]     = useState<TType>('puntual')
  const [title, setTitle]   = useState('')
  const [desc, setDesc]     = useState('')
  const [date, setDate]     = useState(defaultDate)
  const [recurType, setRecurType] = useState('monthly-start')
  const [recurStart, setRecurStart] = useState(defaultDate)

  function handleSave() {
    if (!title.trim()) { alert('Ingresá un título'); return }
    if (type === 'recurrente') {
      if (!recurStart) { alert('Elegí la primera fecha'); return }
      const bd = new Date(recurStart + 'T12:00:00')
      const def = {
        id: `rd_${Date.now()}`,
        title: title.trim(),
        desc: desc.trim(),
        type: recurType as any,
        day: bd.getDate(),
        weekday: bd.getDay(),
        startDate: recurStart,
      }
      upsertRecurDef(def)
      syncRecurring()
    } else {
      if (!date) { alert('Elegí una fecha'); return }
      upsertTask({
        id: `t_${Date.now()}`,
        title: title.trim(),
        desc: desc.trim(),
        date, originalDate: date,
        status: 'pendiente',
        type: 'puntual',
        createdAt: new Date().toISOString(),
      })
    }
    setTitle(''); setDesc('')
    onSaved(); onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva tarea">
      <Label>Título</Label>
      <Input value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Ej: Emitir facturas, Análisis de costos..." />

      <Label>Descripción (opcional)</Label>
      <Textarea value={desc} onChange={e => setDesc(e.target.value)}
        placeholder="Detalles adicionales..." rows={2} />

      <Label>Tipo</Label>
      <div className="flex gap-2 mt-1">
        {(['puntual', 'recurrente'] as TType[]).map(t => (
          <Tag key={t} label={t} selected={type === t} onClick={() => setType(t)} />
        ))}
      </div>

      {type === 'puntual' ? (
        <>
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </>
      ) : (
        <>
          <Label>Recurrencia</Label>
          <Select value={recurType} onChange={e => setRecurType(e.target.value)}>
            <option value="monthly-start">Inicio de mes</option>
            <option value="monthly-end">Fin de mes</option>
            <option value="monthly-day">Mensual (mismo día)</option>
            <option value="weekly">Semanal (mismo día de semana)</option>
          </Select>
          <Label>Primera ocurrencia</Label>
          <Input type="date" value={recurStart} onChange={e => setRecurStart(e.target.value)} />
        </>
      )}

      <div className="flex flex-col gap-2 mt-4">
        <Btn onClick={handleSave}>Guardar tarea</Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </BottomSheet>
  )
}
