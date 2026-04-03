'use client'

import { useEffect, useState, useCallback } from 'react'
import { type Client, type HourEntry, Period } from '@/lib/types'
import { getEntriesDB } from '@/lib/storage'
import { SectionTitle } from '@/components/ui'

interface Props {
  clients: Client[]
}

export default function DashboardView({ clients }: Props) {
  const [entries, setEntries] = useState<HourEntry[]>([])
  const [period, setPeriod] = useState<Period>('mes')

  const today = new Date()
  const refMonth = today.getMonth()
  const refYear = today.getFullYear()

  const loadEntries = useCallback(async () => {
    const data = await getEntriesDB()
    setEntries(data)
  }, [])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  function filterEntries() {
    return entries.filter(e => {
      const [y, m] = e.date.split('-').map(Number)
      const monthIndex = m - 1

      if (period === 'mes') {
        return monthIndex === refMonth && y === refYear
      }

      if (period === 'trim') {
        return y === refYear &&
          Math.floor(monthIndex / 3) === Math.floor(refMonth / 3)
      }

      if (period === 'año') {
        return y === refYear
      }

      return true
    })
  }

  const filtered = filterEntries()

  const totalHours = filtered.reduce((acc, e) => acc + e.hours, 0)

  const byClient: Record<string, number> = {}

  filtered.forEach(e => {
    byClient[e.clientId] = (byClient[e.clientId] || 0) + e.hours
  })

  return (
    <div className="p-4">
      <SectionTitle>Dashboard</SectionTitle>

      {/* Selector período */}
      <div className="flex gap-2 mb-4">
        {['mes', 'trim', 'año'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p as Period)}
            className={`px-3 py-1.5 rounded-full border text-sm ${
              period === p
                ? 'bg-stone-800 text-white'
                : 'border-stone-200 text-stone-500'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Total */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
        <p className="text-sm text-stone-400">Horas totales</p>
        <p className="text-2xl font-semibold text-stone-800">
          {totalHours.toFixed(1)} hs
        </p>
      </div>

      {/* Por cliente */}
      <div className="bg-white border border-stone-200 rounded-xl p-4">
        <SectionTitle>Horas por cliente</SectionTitle>

        {!Object.keys(byClient).length ? (
          <p className="text-sm text-stone-400 py-4">
            Sin datos
          </p>
        ) : (
          Object.entries(byClient).map(([clientId, hours]) => {
            const client = clients.find(c => c.id === clientId)

            return (
              <div
                key={clientId}
                className="flex justify-between py-2 border-b border-stone-100 last:border-0"
              >
                <span className="text-sm text-stone-700">
                  {client?.name || 'Sin cliente'}
                </span>
                <span className="text-sm font-medium text-stone-800">
                  {hours.toFixed(1)} hs
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}