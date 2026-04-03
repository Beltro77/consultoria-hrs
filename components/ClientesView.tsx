'use client'
import { useState } from 'react'
import { INTERNAL_CLIENTS, clientColor, type Client } from '@/lib/types'
import { getEntries } from '@/lib/storage'
import { Avatar, Btn, SectionTitle } from '@/components/ui'
import ClientModal from '@/components/modals/ClientModal'

interface Props { clients: Client[]; onDataChange: () => void }

export default function ClientesView({ clients, onDataChange }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const entries = getEntries()

  return (
    <div className="p-4">
      {/* Internal areas */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-3">
        <SectionTitle>Áreas internas</SectionTitle>
        {INTERNAL_CLIENTS.map(ent => {
          const col = clientColor(ent)
          const h   = entries.filter(e => e.clientId === ent.id).reduce((a, e) => a + e.hours, 0)
          return (
            <div key={ent.id} className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0">
              <Avatar name={ent.name} bg={col.bg} fg={col.fg} />
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-800">{ent.name}</p>
                <p className="text-xs text-stone-400">{h.toFixed(1)} hs totales</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Client list */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-3">
        <SectionTitle>Clientes</SectionTitle>
        {!clients.length ? (
          <p className="text-sm text-stone-400 text-center py-4">Agregá tu primer cliente</p>
        ) : clients.map(c => {
          const col    = clientColor(c)
          const h      = entries.filter(e => e.clientId === c.id).reduce((a, e) => a + e.hours, 0)
          const earned = c.rate ? h * c.rate : null
          return (
            <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0">
              <Avatar name={c.name} bg={col.bg} fg={col.fg} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">{c.name}</p>
                <p className="text-xs text-stone-400">{h.toFixed(1)} hs{c.rate ? ` · $${c.rate}/h` : ''}</p>
              </div>
              {earned !== null && (
                <p className="text-sm font-medium text-stone-700">
                  ${earned.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <Btn onClick={() => setModalOpen(true)}>+ Nuevo cliente</Btn>

      <ClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); onDataChange() }}
      />
    </div>
  )
}
