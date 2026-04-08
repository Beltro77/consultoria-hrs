'use client'

import { useState } from 'react'
import {
  INTERNAL_CLIENT_ROOT_NAME,
  INTERNAL_CLIENT_SUBTOPIC_NAMES,
  clientColor,
  type Client,
} from '@/lib/types'
import { useHourEntries } from '@/lib/hooks/useHourEntries'
import { Avatar, Btn, SectionTitle } from '@/components/ui'
import ClientModal from '@/components/modals/ClientModal'

interface Props {
  clients: Client[]
  onDataChange: () => Promise<void> | void
  onDeleteClient: (id: string) => Promise<void> | void
}

export default function ClientesView({ clients, onDataChange, onDeleteClient }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const { entries } = useHourEntries()

  const internalClients = clients.filter(client => INTERNAL_CLIENT_SUBTOPIC_NAMES.has(client.name))
  const normalClients = clients.filter(client => !INTERNAL_CLIENT_SUBTOPIC_NAMES.has(client.name))

  return (
    <div className="p-4">
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-3">
        <SectionTitle>Área interna</SectionTitle>
        <div className="flex items-center gap-3 py-2.5 border-b border-stone-100">
          <Avatar name={INTERNAL_CLIENT_ROOT_NAME} bg={clientColor(internalClients[0]).bg} fg={clientColor(internalClients[0]).fg} />
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-800">{INTERNAL_CLIENT_ROOT_NAME}</p>
            <p className="text-xs text-stone-400">
              {internalClients
                .reduce((sum, ent) => {
                  const h = entries.filter(e => e.clientId === ent.id).reduce((a, e) => a + e.hours, 0)
                  return sum + h
                }, 0)
                .toFixed(1)} hs totales
            </p>
          </div>
        </div>

        {internalClients.map(ent => {
          const col = clientColor(ent)
          const h = entries
            .filter(e => e.clientId === ent.id)
            .reduce((a, e) => a + e.hours, 0)

          return (
            <div
              key={ent.id}
              className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0"
            >
              <Avatar name={ent.name} bg={col.bg} fg={col.fg} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-800">{ent.name}</p>
                <p className="text-xs text-stone-400">{h.toFixed(1)} hs</p>
              </div>
            </div>
          )
        })}
      </div>

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