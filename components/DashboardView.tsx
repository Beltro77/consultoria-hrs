'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { type Client, type HourEntry, Period, MONTHS_SHORT, ENTRY_TASK_TYPES } from '@/lib/types'
import { getEntriesDB } from '@/lib/storage'
import { SectionTitle } from '@/components/ui'
import HistorialView from '@/components/HistorialView'

interface Props {
  clients: Client[]
}

export default function DashboardView({ clients }: Props) {
  const [entries, setEntries] = useState<HourEntry[]>([])
  const [tab, setTab] = useState<'mes' | 'cliente' | 'actividad' | 'historial'>('mes')
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

  const byTask: Record<string, number> = {}
  filtered.forEach(e => {
    byTask[e.task] = (byTask[e.task] || 0) + e.hours
  })

  const monthlyClientStatus = useMemo(() => {
    const firstSeenByClient = new Map<string, string>()
    const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date))

    sortedEntries.forEach(e => {
      if (!firstSeenByClient.has(e.clientId)) {
        firstSeenByClient.set(e.clientId, e.date.slice(0, 7))
      }
    })

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - index, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthEntries = entries.filter(e => e.date.startsWith(monthKey))
      const activeClientIds = new Set(monthEntries.map(e => e.clientId))
      const newActive = [...activeClientIds].filter(id => firstSeenByClient.get(id) === monthKey).length

      return {
        key: monthKey,
        label: `${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`,
        active: activeClientIds.size,
        potential: Math.max(0, clients.length - activeClientIds.size),
        newActive,
      }
    })
  }, [clients.length, entries, today])

  return (
    <div className="p-4">
      <SectionTitle>Dashboard</SectionTitle>

      {/* Top tabs */}
      <div className="flex items-center justify-center gap-3 mb-4">
        {[
          { id: 'mes', label: 'Mes' },
          { id: 'cliente', label: 'Cliente' },
          { id: 'actividad', label: 'Actividad' },
          { id: 'historial', label: 'Historial' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-full text-sm transition ${tab === t.id ? 'bg-white border border-stone-200 text-stone-800' : 'bg-stone-100 text-stone-400'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Render tab content */}
      {tab === 'mes' && (
        <>
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

        </>
      )}

      {tab === 'cliente' && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
          <SectionTitle>Distribución del mes</SectionTitle>
          {!Object.keys(byClient).length ? (
            <p className="text-sm text-stone-400 py-4">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(byClient)
                .sort((a, b) => b[1] - a[1])
                .map(([clientId, hours]) => {
                  const client = clients.find(c => c.id === clientId)
                  return (
                    <div key={clientId} className="flex justify-between py-2 border-b border-stone-100 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{client?.name || clientId}</p>
                        <p className="text-xs text-stone-400">{hours.toFixed(1)} hs</p>
                      </div>
                      <div className="text-sm font-semibold text-stone-700">{Math.round((hours / Math.max(1, Object.values(byClient).reduce((a,b)=>a+b,0))) * 100)}%</div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {tab === 'actividad' && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
          <SectionTitle>Actividad</SectionTitle>
          {!Object.keys(byTask).length ? (
            <p className="text-sm text-stone-400 py-4">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {ENTRY_TASK_TYPES.map(t => (
                <div key={t} className="flex justify-between py-2 border-b border-stone-100 last:border-0">
                  <div className="text-sm text-stone-700">{t}</div>
                  <div className="text-sm font-semibold text-stone-800">{(byTask[t] || 0).toFixed(1)} hs</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div className="bg-white border border-stone-200 rounded-xl p-0 mb-4">
          <HistorialView clients={clients} onDataChange={async () => { await loadEntries() }} />
        </div>
      )}

      {/* Clientes potenciales vs activos */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
        <SectionTitle>Clientes potenciales vs. activos</SectionTitle>
        <p className="text-sm text-stone-400 mb-3">
          Resumen mensual de clientes que ya están activos y los que siguen como potenciales.
        </p>

        {!clients.length ? (
          <p className="text-sm text-stone-400 py-4">Agregá clientes para ver este tablero</p>
        ) : (
          <div className="space-y-3">
            {monthlyClientStatus.map(item => (
              <div key={item.key} className="rounded-lg border border-stone-100 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-stone-700">{item.label}</span>
                  <span className="text-xs text-stone-400">{item.newActive} pasaron a activos</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-stone-800"
                      style={{ width: `${Math.min(100, (item.active / Math.max(1, clients.length)) * 100)}%` }}
                    />
                  </div>
                  <div className="text-right min-w-[92px]">
                    <p className="text-sm font-semibold text-stone-800">{item.active} activos</p>
                    <p className="text-xs text-stone-400">{item.potential} potenciales</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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