'use client'

import { useState } from 'react'
import { clientColor, type Client, type HourEntry } from '@/lib/types'
import { useHourEntries } from '@/lib/hooks/useHourEntries'
import { Tag } from '@/components/ui'

interface Props {
  clients: Client[]
  onDataChange: () => Promise<void> | void
}

export default function HistorialView({ clients, onDataChange }: Props) {
  const [filter, setFilter] = useState('all')
  const { entries, refresh, removeEntry } = useHourEntries()

  const allEnts = clients

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este registro?')) return

    await removeEntry(id)
    await refresh()
    await onDataChange()
  }

  function fmtDate(s: string) {
    return new Date(`${s}T12:00:00`).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  }

  const filtered = (filter === 'all'
    ? entries
    : entries.filter(e => e.clientId === filter)
  )
    .slice()
    .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`))

  return (
    <div className="p-4">
      <div className="flex gap-2 flex-wrap mb-4">
        <Tag
          label="Todos"
          selected={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        {allEnts.map(entity => (
          <Tag
            key={entity.id}
            label={entity.name}
            selected={filter === entity.id}
            onClick={() => setFilter(entity.id)}
          />
        ))}
      </div>

      {!filtered.length ? (
        <p className="text-sm text-stone-400 text-center py-12">Sin registros</p>
      ) : (
        filtered.map(entry => {
          const ent = allEnts.find(c => c.id === entry.clientId)
          const col = ent
            ? clientColor(ent)
            : { dot: '#d6d3d1', bg: '#f5f5f4', fg: '#57534e' }

          return (
            <div
              key={entry.id}
              className="bg-white border border-stone-200 rounded-xl p-3.5 mb-2"
            >
              <div className="flex items-start gap-2.5">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: col.dot }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">
                    {ent?.name ?? entry.clientId}
                  </p>
                  <p className="text-xs text-stone-400">{entry.task}</p>
                  {entry.detail && (
                    <p className="text-xs text-stone-400 italic mt-0.5">
                      {entry.detail}
                    </p>
                  )}
                  <p className="text-xs text-stone-300 mt-1">
                    {fmtDate(entry.date)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-stone-800">
                    {entry.hours}h
                  </p>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-stone-300 hover:text-red-400 text-base mt-0.5 transition-colors block ml-auto"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}