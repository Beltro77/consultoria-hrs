'use client'

import { useEffect, useState } from 'react'
import {
  BottomSheet,
  Btn,
  Input,
  Label,
  Select,
  Textarea,
  Tag,
} from '@/components/ui'
import {
  ENTRY_TASK_TYPES,
  INTERNAL_CLIENT_ROOT_NAME,
  INTERNAL_CLIENT_SUBTOPIC_NAMES,
  type Client,
  type EntryTaskType,
} from '@/lib/types'
import { upsertEntry } from '@/lib/services/hourEntries.service'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => Promise<void> | void
  clients: Client[]
  defaultDate: string
}

export default function EntryModal({
  open,
  onClose,
  onSaved,
  clients,
  defaultDate,
}: Props) {
  const internalSubtopics = clients.filter(client => INTERNAL_CLIENT_SUBTOPIC_NAMES.has(client.name))
  const normalClients = clients.filter(client => !INTERNAL_CLIENT_SUBTOPIC_NAMES.has(client.name))
  const CATALIZAR_OPTION_ID = 'catalizar-root'
  const clientOptions = [{ id: CATALIZAR_OPTION_ID, name: INTERNAL_CLIENT_ROOT_NAME }, ...normalClients]

  const [selectedClientOption, setSelectedClientOption] = useState('')
  const [selectedSubtopicId, setSelectedSubtopicId] = useState('')
  const [task, setTask] = useState<EntryTaskType>(ENTRY_TASK_TYPES[0])
  const [detail, setDetail] = useState('')
  const [hours, setHours] = useState('')
  const [date, setDate] = useState(defaultDate)

  useEffect(() => {
    setDate(defaultDate)
  }, [defaultDate])

  useEffect(() => {
    if (clientOptions.length && !selectedClientOption) {
      setSelectedClientOption(clientOptions[0].id)
    }
  }, [clientOptions, selectedClientOption])

  useEffect(() => {
    if (internalSubtopics.length && !selectedSubtopicId) {
      setSelectedSubtopicId(internalSubtopics[0].id)
    }
  }, [internalSubtopics, selectedSubtopicId])

  const effectiveClientId = selectedClientOption === CATALIZAR_OPTION_ID
    ? selectedSubtopicId
    : selectedClientOption

  async function handleSave() {
    if (!effectiveClientId || !hours || !date) {
      alert('Completá cliente, horas y fecha')
      return
    }

    if (selectedClientOption === CATALIZAR_OPTION_ID && !selectedSubtopicId) {
      alert('Seleccioná un subtema para Catalizar')
      return
    }

    try {
      await upsertEntry({
        clientId: effectiveClientId,
        taskName: task,
        detail: detail.trim(),
        hours: parseFloat(hours),
        date,
        createdAt: new Date().toISOString(),
      })
    } catch (error) {
      alert(`Error guardando registro: ${(error as Error)?.message ?? 'error desconocido'}`)
      return
    }

    setHours('')
    setDetail('')

    await onSaved()
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Registrar horas">
      <Label>Cliente / Área</Label>
      <Select value={selectedClientOption} onChange={e => setSelectedClientOption(e.target.value)}>
        {clientOptions.map(entity => (
          <option key={entity.id} value={entity.id}>
            {entity.name}
          </option>
        ))}
      </Select>

      {selectedClientOption === CATALIZAR_OPTION_ID && (
        <>
          <Label>Subtema Catalizar</Label>
          <Select value={selectedSubtopicId} onChange={e => setSelectedSubtopicId(e.target.value)}>
            {internalSubtopics.map(subtopic => (
              <option key={subtopic.id} value={subtopic.id}>
                {subtopic.name}
              </option>
            ))}
          </Select>
        </>
      )}

      <Label>Tipo de tarea</Label>
      <div className="flex flex-wrap gap-2 mt-1">
        {ENTRY_TASK_TYPES.map(t => (
          <Tag
            key={t}
            label={t}
            selected={task === t}
            onClick={() => setTask(t)}
          />
        ))}
      </div>

      <Label>Detalle (opcional)</Label>
      <Textarea
        value={detail}
        onChange={e => setDetail(e.target.value)}
        placeholder="Ej: revisión contrato, kick-off..."
        rows={2}
      />

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <Label>Horas</Label>
          <Input
            type="number"
            value={hours}
            onChange={e => setHours(e.target.value)}
            placeholder="0"
            min={0.25}
            step={0.25}
          />
        </div>

        <div>
          <Label>Fecha</Label>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <Btn onClick={handleSave}>Guardar</Btn>
        <Btn variant="ghost" onClick={onClose}>
          Cancelar
        </Btn>
      </div>
    </BottomSheet>
  )
}