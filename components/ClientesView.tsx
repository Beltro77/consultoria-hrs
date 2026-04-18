'use client'

import { useState } from 'react'
import {
  INTERNAL_CLIENT_ROOT_NAME,
  clientColor,
  type Client,
  type HourEntry,
} from '@/lib/types'
import { useHourEntries } from '@/lib/hooks/useHourEntries'
import { useSubtopics } from '@/lib/hooks/useSubtopics'
import { Avatar, Btn, SectionTitle, Input } from '@/components/ui'
import ClientModal from '@/components/modals/ClientModal'

interface Props {
  clients: Client[]
  onDataChange: () => Promise<void> | void
  onDeleteClient: (id: string) => Promise<void> | void
}

interface CardProps {
  client: Client
  entries: HourEntry[]
  onDelete: () => void
  onDataChange: () => Promise<void> | void
}

function ExternalClientCard({ client, entries, onDelete, onDataChange }: CardProps) {
  const [subtopicName, setSubtopicName] = useState('')
  const [showSubtopics, setShowSubtopics] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const { subtopics, addSubtopic, removeSubtopic } = useSubtopics(client.id)

  const col = clientColor(client)
  const h = entries.filter(e => e.clientId === client.id).reduce((a, e) => a + e.hours, 0)
  const earned = client.rate ? h * client.rate : null

  async function handleAdd() {
    if (!subtopicName.trim()) return
    try {
      await addSubtopic(subtopicName)
      setSubtopicName('')
      setShowAdd(false)
      await onDataChange()
    } catch (err) {
      alert(`Error agregando subtema: ${(err as Error)?.message ?? 'error desconocido'}`)
    }
  }

  async function handleDeleteSubtopic(id: string) {
    if (!confirm('¿Eliminar este subtema?')) return
    try {
      await removeSubtopic(id)
      await onDataChange()
    } catch (err) {
      alert(`Error eliminando subtema: ${(err as Error)?.message ?? 'error desconocido'}`)
    }
  }

  return (
    <div className="border-b border-stone-100 last:border-0">
      <div className="flex items-center gap-3 py-2.5">
        <Avatar name={client.name} bg={col.bg} fg={col.fg} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 truncate">{client.name}</p>
          <p className="text-xs text-stone-400">
            {h.toFixed(1)} hs{client.rate ? ` · $${client.rate}/h` : ''}
          </p>
        </div>
        {earned !== null && (
          <p className="text-sm font-medium text-stone-700">
            ${earned.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </p>
        )}
        <button
          onClick={() => setShowSubtopics(v => !v)}
          className="text-xs text-stone-400 hover:text-stone-600 px-1"
        >
          {showSubtopics ? '▲' : '▼'} subtemas
        </button>
        <button onClick={onDelete} className="text-xs text-red-600 hover:text-red-800">
          Eliminar
        </button>
      </div>

      {showSubtopics && (
        <div className="pl-11 pb-3">
          {subtopics.length === 0 && !showAdd && (
            <p className="text-xs text-stone-400 mb-2">Sin subtemas</p>
          )}
          {subtopics.map(s => {
            const subH = entries
              .filter(e => e.clientId === client.id && e.subtopicId === s.id)
              .reduce((a, e) => a + e.hours, 0)
            return (
              <div key={s.id} className="flex items-center gap-2 py-1 border-b border-stone-50 last:border-0">
                <p className="text-xs text-stone-700 flex-1">{s.name}</p>
                <p className="text-xs text-stone-400">{subH.toFixed(1)} hs</p>
                <button
                  onClick={() => handleDeleteSubtopic(s.id)}
                  className="text-xs text-red-500 hover:text-red-700 ml-1"
                >
                  ×
                </button>
              </div>
            )
          })}
          {showAdd ? (
            <div className="flex gap-2 mt-2">
              <Input
                value={subtopicName}
                onChange={e => setSubtopicName(e.target.value)}
                placeholder="Nombre del subtema"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') { setShowAdd(false); setSubtopicName('') }
                }}
              />
              <Btn onClick={handleAdd}>Agregar</Btn>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full mt-2 py-1.5 text-xs text-stone-500 hover:bg-stone-50 rounded-lg border border-stone-200"
            >
              + Agregar subtema
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ClientesView({ clients, onDataChange, onDeleteClient }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [subtopicName, setSubtopicName] = useState('')
  const [showAddSubtopic, setShowAddSubtopic] = useState(false)
  const { entries } = useHourEntries()

  const catalizar = clients.find(client => client.name === INTERNAL_CLIENT_ROOT_NAME)
  const { subtopics, addSubtopic, removeSubtopic } = useSubtopics(catalizar?.id ?? null)
  const normalClients = clients.filter(client => client.name !== INTERNAL_CLIENT_ROOT_NAME)

  const catalizarHours = subtopics.reduce((sum, subtopic) => {
    const h = entries
      .filter(e => e.clientId === catalizar?.id && e.subtopicId === subtopic.id)
      .reduce((a, e) => a + e.hours, 0)
    return sum + h
  }, 0)

  async function handleAddSubtopic() {
    if (!subtopicName.trim()) {
      alert('Ingresá el nombre del subtema')
      return
    }
    try {
      await addSubtopic(subtopicName)
      setSubtopicName('')
      setShowAddSubtopic(false)
      await onDataChange()
    } catch (error) {
      alert(`Error agregando subtema: ${(error as Error)?.message ?? 'error desconocido'}`)
    }
  }

  async function handleDeleteSubtopic(id: string) {
    if (!confirm('¿Eliminar este subtema?')) return
    try {
      await removeSubtopic(id)
      await onDataChange()
    } catch (error) {
      alert(`Error eliminando subtema: ${(error as Error)?.message ?? 'error desconocido'}`)
    }
  }

  return (
    <div className="p-4">
      {catalizar && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-3">
          <SectionTitle>Área interna</SectionTitle>
          <div className="flex items-center gap-3 py-2.5 border-b border-stone-100">
            <Avatar name={INTERNAL_CLIENT_ROOT_NAME} bg={clientColor(catalizar).bg} fg={clientColor(catalizar).fg} />
            <div className="flex-1">
              <p className="text-sm font-medium text-stone-800">{INTERNAL_CLIENT_ROOT_NAME}</p>
              <p className="text-xs text-stone-400">{catalizarHours.toFixed(1)} hs totales</p>
            </div>
          </div>

          {subtopics.map(subtopic => {
            const col = clientColor({ id: subtopic.id, name: subtopic.name, colorIndex: 2 })
            const h = entries
              .filter(e => e.clientId === catalizar?.id && e.subtopicId === subtopic.id)
              .reduce((a, e) => a + e.hours, 0)

            return (
              <div
                key={subtopic.id}
                className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0"
              >
                <Avatar name={subtopic.name} bg={col.bg} fg={col.fg} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-800">{subtopic.name}</p>
                  <p className="text-xs text-stone-400">{h.toFixed(1)} hs</p>
                </div>
                <button
                  onClick={() => handleDeleteSubtopic(subtopic.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Eliminar
                </button>
              </div>
            )
          })}

          {showAddSubtopic ? (
            <div className="flex gap-2 mt-3">
              <Input
                value={subtopicName}
                onChange={e => setSubtopicName(e.target.value)}
                placeholder="Nombre del subtema"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddSubtopic()
                  if (e.key === 'Escape') {
                    setShowAddSubtopic(false)
                    setSubtopicName('')
                  }
                }}
              />
              <Btn onClick={handleAddSubtopic}>Agregar</Btn>
            </div>
          ) : (
            <button
              onClick={() => setShowAddSubtopic(true)}
              className="w-full mt-3 py-2 text-sm text-stone-600 hover:bg-stone-50 rounded-lg border border-stone-200"
            >
              + Agregar subtema
            </button>
          )}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-3">
        <SectionTitle>Clientes</SectionTitle>

        {!normalClients.length ? (
          <p className="text-sm text-stone-400 text-center py-4">
            Agregá tu primer cliente
          </p>
        ) : (
          normalClients.map(c => (
            <ExternalClientCard
              key={c.id}
              client={c}
              entries={entries}
              onDataChange={onDataChange}
              onDelete={async () => {
                const confirmed = confirm(`Eliminar cliente ${c.name}? Esta acción no se puede deshacer.`)
                if (!confirmed) return
                try {
                  await onDeleteClient(c.id)
                  await onDataChange()
                } catch (error) {
                  alert(`No se pudo eliminar el cliente: ${(error as Error)?.message ?? 'error desconocido'}`)
                }
              }}
            />
          ))
        )}
      </div>

      <Btn onClick={() => setModalOpen(true)}>+ Nuevo cliente</Btn>

      <ClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={async () => {
          setModalOpen(false)
          await onDataChange()
        }}
      />
    </div>
  )
}
