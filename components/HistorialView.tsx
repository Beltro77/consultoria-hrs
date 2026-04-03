'use client'
import { useState } from 'react'
import { INTERNAL_CLIENTS, clientColor, type Client } from '@/lib/types'
import { getEntries, removeEntry } from '@/lib/storage'
import { Tag } from '@/components/ui'

interface Props { clients: Client[]; onDataChange: () => void }

export default function HistorialView({ clients, onDataChange }: Props) {
  const [filter, setFilter] = useState('all')
  const [, forceUpdate]     = useState(0)

  const allEnts  = [...INTERNAL_CLIENTS, ...clients]
  const entries  = getEntries()
  const filtered = (filter === 'all' ? entries : entries.filter(e => e.clientId === filter))
    .slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    removeEntry(id)
    forceUpdate(n => n + 1)
    onDataChange()
  }

  function fmtDate(s: string) {
    return new Date(s + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  return (
    <div className="p-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        <Tag label="Todos" selected={filter === 'all'} onClick={() => setFilter('all')} />
        {allEnts.map(e => (
          <Tag key={e.id} label={e.name} selected={filter === e.id} onClick={() => setFilter(e.id)} />
        ))}
      </div>

      {!filtered.length ? (
        <p className="text-sm text-stone-400 text-center py-12">Sin registros</p>
      ) : filtered.map(e => {
        const ent = allEnts.find(c => c.id === e.clientId)
        const col = clientColor(ent)
        return (
          <div key={e.id} className="bg-white border border-stone-200 rounded-xl p-3.5 mb-2">
            <div className="flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: col.dot }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800">{ent?.name ?? e.clientId}</p>
                <p className="text-xs text-stone-400">{e.task}</p>
                {e.detail && <p className="text-xs text-stone-400 italic mt-0.5">{e.detail}</p>}
                <p className="text-xs text-stone-300 mt-1">{fmtDate(e.date)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-stone-800">{e.hours}h</p>
                <button onClick={() => handleDelete(e.id)}
                  className="text-stone-300 hover:text-red-400 text-base mt-0.5 transition-colors block ml-auto">✕</button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
