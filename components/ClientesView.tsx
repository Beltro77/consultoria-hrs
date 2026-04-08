'use client'

import { useState } from 'react'
import {
  INTERNAL_CLIENT_ROOT_NAME,
  clientColor,
  type Client,
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

export default function ClientesView({ clients, onDataChange, onDeleteClient }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [subtopicName, setSubtopicName] = useState('')
  const [showAddSubtopic, setShowAddSubtopic] = useState(false)
  const { entries } = useHourEntries()

  const catalizar = clients.find(client => client.name === INTERNAL_CLIENT_ROOT_NAME)
  const { subtopics, addSubtopic, removeSubtopic, refresh: refreshSubtopics } = useSubtopics(catalizar?.id ?? null)
  const normalClients = clients.filter(client => client.name !== INTERNAL_CLIENT_ROOT_NAME)

  const catalizarHours = subtopics
    .reduce((sum, subtopic) => {
      const h = entries.filter(e => e.clientId === subtopic.id).reduce((a, e) => a + e.hours, 0)
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
              .filter(e => e.clientId === subtopic.id)
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
          normalClients.map(c => {
            const col = clientColor(c)
            const h = entries
              .filter(e => e.clientId === c.id)
              .reduce((a, e) => a + e.hours, 0)

            const earned = c.rate ? h * c.rate : null

            return (
              <div
                key={c.id}
                className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0"
              >
                <Avatar name={c.name} bg={col.bg} fg={col.fg} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {c.name}
                  </p>
                  <p className="text-xs text-stone-400">
                    {h.toFixed(1)} hs{c.rate ? ` · $${c.rate}/h` : ''}
                  </p>
                </div>

                {earned !== null && (
                  <p className="text-sm font-medium text-stone-700">
                    ${earned.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </p>
                )}
                <button
                  onClick={async () => {
                    const confirmed = confirm(`Eliminar cliente ${c.name}? Esta acción no se puede deshacer.`)
                    if (!confirmed) return
                    try {
                      await onDeleteClient(c.id)
                      await onDataChange()
                    } catch (error) {
                      alert(`No se pudo eliminar el cliente: ${(error as Error)?.message ?? 'error desconocido'}`)
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Eliminar
                </button>
              </div>
            )
          })
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
