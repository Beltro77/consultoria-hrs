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
  type Client,
  type EntryTaskType,
} from '@/lib/types'
import { upsertEntry } from '@/lib/services/hourEntries.service'
import { useSubtopics } from '@/lib/hooks/useSubtopics'

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
  const isCatalizarClient = (client: Client) => client.name === INTERNAL_CLIENT_ROOT_NAME
  const catalizar = clients.find(isCatalizarClient)
  const normalClients = clients.filter(client => !isCatalizarClient(client))
  const clientOptions = catalizar ? [catalizar, ...normalClients] : normalClients

  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedSubtopicId, setSelectedSubtopicId] = useState('')

  const { subtopics } = useSubtopics(selectedClientId || null)
  const [task, setTask] = useState<EntryTaskType>(ENTRY_TASK_TYPES[0])
  const [detail, setDetail] = useState('')
  const [hours, setHours] = useState('')
  const [date, setDate] = useState(defaultDate)

  useEffect(() => {
    setDate(defaultDate)
  }, [defaultDate])

  useEffect(() => {
    if (clientOptions.length && !selectedClientId) {
      setSelectedClientId(clientOptions[0].id)
    }
  }, [clientOptions, selectedClientId])

  useEffect(() => {
    setSelectedSubtopicId('')
  }, [selectedClientId])

  useEffect(() => {
    if (subtopics.length && !selectedSubtopicId) {
      setSelectedSubtopicId(subtopics[0].id)
    }
  }, [subtopics, selectedSubtopicId])

  const hasSubtopics = subtopics.length > 0

  async function handleSave() {
    if (!selectedClientId || !hours || !date) {
      alert('Completá cliente, horas y fecha')
      return
    }

    if (hasSubtopics && !selectedSubtopicId) {
      alert('Seleccioná un subtema')
      return
    }

    try {
      await upsertEntry({
        clientId: selectedClientId,
        subtopicId: hasSubtopics ? selectedSubtopicId : undefined,
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
      <Select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
        {clientOptions.map(client => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </Select>

      {hasSubtopics && (
        <>
          <Label>Subtema</Label>
          <Select value={selectedSubtopicId} onChange={e => setSelectedSubtopicId(e.target.value)}>
            {subtopics.length > 0 ? (
              subtopics.map(subtopic => (
                <option key={subtopic.id} value={subtopic.id}>
                  {subtopic.name}
                </option>
              ))
            ) : (
              <option disabled>Sin subtemas disponibles</option>
            )}
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