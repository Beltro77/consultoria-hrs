'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MONTHS_FULL,
  MONTHS_SHORT,
  INTERNAL_CLIENT_ROOT_NAME,
  clientColor,
  ENTRY_TASK_COLORS,
  type Client,
  type Period,
} from '@/lib/types'
import { useHourEntries } from '@/lib/hooks/useHourEntries'
import { useSubtopics } from '@/lib/hooks/useSubtopics'
import {
  Avatar,
  Card,
  HourBar,
  MetricCard,
  PeriodFilter,
  SectionTitle,
} from '@/components/ui'

type DashTab = 'mes' | 'cliente' | 'actividad' | 'historial'
interface Props {
  clients: Client[]
}

function entriesForMonth(entries: any[], month: number, year: number) {
  return entries.filter(entry => {
    const [entryYear, entryMonth] = entry.date.split('-').map(Number)
    return entryYear === year && entryMonth - 1 === month
  })
}

function entriesForPeriod(entries: any[], period: Period, month: number, year: number) {
  return entries.filter(entry => {
    const [entryYear, entryMonth] = entry.date.split('-').map(Number)
    const monthIndex = entryMonth - 1

    if (period === 'mes') return entryYear === year && monthIndex === month
    if (period === 'trim') return entryYear === year && Math.floor(monthIndex / 3) === Math.floor(month / 3)
    if (period === 'año') return entryYear === year
    return true
  })
}

export default function DashboardView({ clients }: Props) {
  const [tab, setTab] = useState<DashTab>('mes')
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [cliPeriod, setCliPeriod] = useState<Period>('mes')
  const [actPeriod, setActPeriod] = useState<Period>('mes')
  const donutRef = useRef<HTMLCanvasElement>(null)
  const { entries } = useHourEntries()

  // Computed once and passed to all tabs — eliminates 3 duplicate useSubtopics calls
  const catalizar = useMemo(
    () => clients.find(c => c.name === INTERNAL_CLIENT_ROOT_NAME),
    [clients]
  )
  const { subtopics } = useSubtopics(catalizar?.id ?? null)
  const internalIds = useMemo(
    () => new Set([
      ...(catalizar ? [catalizar.id] : []),
      ...subtopics.map(s => s.id),
    ]),
    [catalizar, subtopics]
  )

  const changeMonth = useCallback((delta: number) => {
    setMonth(prev => {
      let next = prev + delta
      if (next < 0) { setYear(y => y - 1); return 11 }
      if (next > 11) { setYear(y => y + 1); return 0 }
      return next
    })
  }, [])

  useEffect(() => {
    if (tab !== 'mes') return
    const canvas = donutRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const data = entriesForMonth(entries, month, year)
    const total = data.reduce((sum, entry) => sum + entry.hours, 0)
    const byClient: Record<string, number> = {}
    data.forEach(entry => {
      const key = internalIds.has(entry.clientId) ? INTERNAL_CLIENT_ROOT_NAME : entry.clientId
      byClient[key] = (byClient[key] || 0) + entry.hours
    })
    const sorted = Object.entries(byClient).sort((a, b) => b[1] - a[1])

    ctx.clearRect(0, 0, 90, 90)
    if (!sorted.length || total === 0) {
      ctx.beginPath()
      ctx.arc(45, 45, 35, 0, Math.PI * 2)
      ctx.strokeStyle = '#e7e5e4'
      ctx.lineWidth = 10
      ctx.stroke()
      return
    }

    let angle = -Math.PI / 2
    sorted.forEach(([id, hours]) => {
      const slice = (hours / total) * Math.PI * 2
      const ent = id === INTERNAL_CLIENT_ROOT_NAME
        ? { id: 'internal-root', name: INTERNAL_CLIENT_ROOT_NAME, colorIndex: 4 }
        : clients.find(item => item.id === id)
      ctx.beginPath()
      ctx.moveTo(45, 45)
      ctx.arc(45, 45, 38, angle, angle + slice)
      ctx.closePath()
      ctx.fillStyle = clientColor(ent).dot
      ctx.fill()
      angle += slice
    })
  }, [tab, month, year, entries, clients, internalIds])

  return (
    <div className="p-4">
      <div className="flex gap-0.5 bg-stone-100 rounded-lg p-0.5 mb-4">
        {(['mes', 'cliente', 'actividad', 'historial'] as DashTab[]).map(item => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`flex-1 py-1.5 text-xs rounded-md transition-all capitalize ${
              tab === item
                ? 'bg-white text-stone-800 font-medium shadow-sm'
                : 'text-stone-400'
            }`}
          >
            {item === 'mes' ? 'Mes' : item === 'cliente' ? 'Cliente' : item === 'actividad' ? 'Actividad' : 'Historial'}
          </button>
        ))}
      </div>

      {tab === 'mes' && (
        <MesTab
          month={month}
          year={year}
          changeMonth={changeMonth}
          donutRef={donutRef}
          allEnts={clients}
          entries={entries}
          internalIds={internalIds}
        />
      )}

      {tab === 'cliente' && (
        <ClienteTab
          period={cliPeriod}
          setPeriod={setCliPeriod}
          refMonth={month}
          refYear={year}
          allEnts={clients}
          entries={entries}
          internalIds={internalIds}
        />
      )}

      {tab === 'actividad' && (
        <ActividadTab
          period={actPeriod}
          setPeriod={setActPeriod}
          refMonth={month}
          refYear={year}
          allEnts={clients}
          entries={entries}
          internalIds={internalIds}
        />
      )}

      {tab === 'historial' && (
        <HistorialTab
          allEnts={clients}
          entries={entries}
          internalIds={internalIds}
        />
      )}
    </div>
  )
}

const MesTab = memo(function MesTab({
  month,
  year,
  changeMonth,
  donutRef,
  allEnts,
  entries,
  internalIds,
}: {
  month: number
  year: number
  changeMonth: (delta: number) => void
  donutRef: React.RefObject<HTMLCanvasElement>
  allEnts: Client[]
  entries: any[]
  internalIds: Set<string>
}) {
  const data = useMemo(() => entriesForMonth(entries, month, year), [entries, month, year])
  const total = useMemo(() => data.reduce((sum, e) => sum + e.hours, 0), [data])

  const { clientTotal, internalTotal, activeDays } = useMemo(() => {
    const clientTotal = data.filter(e => !internalIds.has(e.clientId)).reduce((s, e) => s + e.hours, 0)
    return {
      clientTotal,
      internalTotal: total - clientTotal,
      activeDays: new Set(data.map(e => e.date)).size,
    }
  }, [data, internalIds, total])

  const sparks = useMemo(() => {
    const arr = Array.from({ length: 6 }, (_, index) => {
      let m = month - (5 - index)
      let y = year
      if (m < 0) { m += 12; y -= 1 }
      return {
        month: m,
        year: y,
        hours: entriesForMonth(entries, m, y).reduce((sum, e) => sum + e.hours, 0),
      }
    })
    return { arr, max: Math.max(...arr.map(s => s.hours), 1) }
  }, [entries, month, year])

  const donutSorted = useMemo(() => {
    const byClient: Record<string, number> = {}
    data.forEach(entry => {
      const key = internalIds.has(entry.clientId) ? INTERNAL_CLIENT_ROOT_NAME : entry.clientId
      byClient[key] = (byClient[key] || 0) + entry.hours
    })
    return Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [data, internalIds])

  return (
    <>
      <div className="flex items-center mb-4">
        <button onClick={() => changeMonth(-1)} className="text-stone-400 px-2 text-xl">‹</button>
        <span className="flex-1 text-center text-sm font-medium text-stone-800">
          {MONTHS_FULL[month]} {year}
        </span>
        <button onClick={() => changeMonth(1)} className="text-stone-400 px-2 text-xl">›</button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <MetricCard label="Horas totales" value={total.toFixed(1)} sub="este mes" />
        <MetricCard label="Facturables" value={clientTotal.toFixed(1)} sub="clientes" />
        <MetricCard label="Catalizar" value={internalTotal.toFixed(1)} sub="interno" />
        <MetricCard label="Días activos" value={String(activeDays)} sub="con registro" />
      </div>

      <Card className="mb-3">
        <SectionTitle>Evolución últimos 6 meses</SectionTitle>
        <div className="flex items-end gap-1 h-12 mb-1">
          {sparks.arr.map((spark) => (
            <div
              key={`${spark.year}-${spark.month}`}
              className="flex-1 rounded-t-sm min-h-[3px]"
              style={{
                height: `${Math.max(3, Math.round((spark.hours / sparks.max) * 48))}px`,
                background: spark.month === month && spark.year === year ? '#1D9E75' : '#9FE1CB',
              }}
              title={`${spark.hours.toFixed(1)}h`}
            />
          ))}
        </div>
        <div className="flex gap-1">
          {sparks.arr.map((spark) => (
            <div key={`${spark.year}-${spark.month}-label`} className="flex-1 text-center text-[9px] text-stone-400">
              {MONTHS_SHORT[spark.month]}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Distribución del mes</SectionTitle>
        {!donutSorted.length ? (
          <p className="text-sm text-stone-400 text-center py-4">Sin registros</p>
        ) : (
          <div className="flex items-center gap-4">
            <canvas ref={donutRef} width={90} height={90} className="flex-shrink-0" />
            <div className="flex-1">
              {donutSorted.map(([id, hours]) => {
                const ent = id === INTERNAL_CLIENT_ROOT_NAME
                  ? { id: 'internal-root', name: INTERNAL_CLIENT_ROOT_NAME, colorIndex: 4 }
                  : allEnts.find(item => item.id === id)
                const col = clientColor(ent)
                const pct = total > 0 ? Math.round((hours / total) * 100) : 0
                return (
                  <div key={id} className="flex items-center gap-2 mb-1.5 last:mb-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.dot }} />
                    <span className="text-xs text-stone-700 flex-1 truncate">{ent?.name ?? id}</span>
                    <span className="text-xs text-stone-400 font-medium">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    </>
  )
})

const ClienteTab = memo(function ClienteTab({
  period,
  setPeriod,
  refMonth,
  refYear,
  allEnts,
  entries,
  internalIds,
}: {
  period: Period
  setPeriod: (p: Period) => void
  refMonth: number
  refYear: number
  allEnts: Client[]
  entries: any[]
  internalIds: Set<string>
}) {
  const [localMonth, setLocalMonth] = useState(refMonth)
  const [localYear, setLocalYear] = useState(refYear)
  const [clientFilter, setClientFilter] = useState('')

  const changeMonth = useCallback((delta: number) => {
    setLocalMonth(prev => {
      let next = prev + delta
      if (next < 0) { setLocalYear(y => y - 1); return 11 }
      if (next > 11) { setLocalYear(y => y + 1); return 0 }
      return next
    })
  }, [])

  const activeMonth = period === 'mes' ? localMonth : refMonth
  const activeYear  = period === 'mes' ? localYear  : refYear

  const data = useMemo(
    () => entriesForPeriod(entries, period, activeMonth, activeYear),
    [entries, period, activeMonth, activeYear]
  )

  const { sorted, totalAll } = useMemo(() => {
    const byClient: Record<string, { hours: number; tasks: Record<string, number> }> = {}
    data.forEach(entry => {
      const key = internalIds.has(entry.clientId) ? INTERNAL_CLIENT_ROOT_NAME : entry.clientId
      byClient[key] = byClient[key] || { hours: 0, tasks: {} }
      byClient[key].hours += entry.hours
      const taskLabel = entry.task ?? 'Sin tarea'
      byClient[key].tasks[taskLabel] = (byClient[key].tasks[taskLabel] || 0) + entry.hours
    })
    const sorted = Object.entries(byClient).sort((a, b) => b[1].hours - a[1].hours)
    return { sorted, totalAll: sorted.reduce((sum, [, v]) => sum + v.hours, 0) }
  }, [data, internalIds])

  const filtered = useMemo(() => {
    if (!clientFilter) return sorted
    const q = clientFilter.toLowerCase()
    return sorted.filter(([id]) => {
      const ent = id === INTERNAL_CLIENT_ROOT_NAME
        ? INTERNAL_CLIENT_ROOT_NAME
        : (allEnts.find(c => c.id === id)?.name ?? id)
      return ent.toLowerCase().includes(q)
    })
  }, [sorted, clientFilter, allEnts])

  return (
    <>
      <PeriodFilter value={period} onChange={p => { setPeriod(p) }} />

      {period === 'mes' && (
        <div className="flex items-center mb-3">
          <button onClick={() => changeMonth(-1)} className="text-stone-400 px-2 text-xl">‹</button>
          <span className="flex-1 text-center text-sm font-medium text-stone-800">
            {MONTHS_FULL[localMonth]} {localYear}
          </span>
          <button onClick={() => changeMonth(1)} className="text-stone-400 px-2 text-xl">›</button>
        </div>
      )}

      <div className="relative mb-3">
        <input
          type="text"
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          placeholder="Filtrar cliente..."
          className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white text-stone-800 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
        />
        {clientFilter && (
          <button
            onClick={() => setClientFilter('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 text-lg leading-none"
          >×</button>
        )}
      </div>

      {!filtered.length ? (
        <p className="text-sm text-stone-400 text-center py-8">Sin registros en este período</p>
      ) : (
        filtered.map(([id, data]) => {
          const ent = id === INTERNAL_CLIENT_ROOT_NAME
            ? { id: 'internal-root', name: INTERNAL_CLIENT_ROOT_NAME, colorIndex: 4 }
            : allEnts.find(item => item.id === id)
          const col = clientColor(ent)
          const name = ent?.name ?? id
          const pct = totalAll > 0 ? Math.round((data.hours / totalAll) * 100) : 0
          const topTasks = Object.entries(data.tasks).sort((a, b) => b[1] - a[1]).slice(0, 3)

          return (
            <Card key={id} className="mb-3">
              <div className="flex items-center gap-2.5 mb-3">
                <Avatar name={name} bg={col.bg} fg={col.fg} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{name}</p>
                  <p className="text-xs text-stone-400">{pct}% del período</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-medium text-stone-800">{data.hours.toFixed(1)}h</p>
                  {ent?.rate != null && (
                    <p className="text-xs text-stone-400">
                      ${Math.round(data.hours * ent.rate).toLocaleString('es-AR')}
                    </p>
                  )}
                </div>
              </div>
              {topTasks.map(([taskLabel, hours]) => (
                <div key={taskLabel} className="flex items-center gap-2 mb-1.5 last:mb-0">
                  <span className="text-xs text-stone-400 w-32 truncate flex-shrink-0">{taskLabel}</span>
                  <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round((hours / data.hours) * 100)}%`, background: col.dot }}
                    />
                  </div>
                  <span className="text-xs text-stone-400 w-8 text-right">{hours.toFixed(1)}h</span>
                </div>
              ))}
            </Card>
          )
        })
      )}
    </>
  )
})

const ActividadTab = memo(function ActividadTab({
  period,
  setPeriod,
  refMonth,
  refYear,
  allEnts,
  entries,
  internalIds,
}: {
  period: Period
  setPeriod: (p: Period) => void
  refMonth: number
  refYear: number
  allEnts: Client[]
  entries: any[]
  internalIds: Set<string>
}) {
  const data = useMemo(
    () => entriesForPeriod(entries, period, refMonth, refYear),
    [entries, period, refMonth, refYear]
  )

  const { taskSorted, maxTask, clientSorted } = useMemo(() => {
    const byTask: Record<string, number> = {}
    const byClient: Record<string, Record<string, number>> = {}
    data.forEach(entry => {
      const taskLabel = entry.task ?? 'Sin tarea'
      byTask[taskLabel] = (byTask[taskLabel] || 0) + entry.hours
      const clientKey = internalIds.has(entry.clientId) ? INTERNAL_CLIENT_ROOT_NAME : entry.clientId
      byClient[clientKey] = byClient[clientKey] || {}
      byClient[clientKey][taskLabel] = (byClient[clientKey][taskLabel] || 0) + entry.hours
    })
    const taskSorted = Object.entries(byTask).sort((a, b) => b[1] - a[1])
    const clientSorted = Object.entries(byClient).sort((a, b) => {
      const totalA = Object.values(a[1]).reduce((s, v) => s + v, 0)
      const totalB = Object.values(b[1]).reduce((s, v) => s + v, 0)
      return totalB - totalA
    })
    return { taskSorted, maxTask: taskSorted[0]?.[1] ?? 1, clientSorted }
  }, [data, internalIds])

  return (
    <>
      <PeriodFilter value={period} onChange={setPeriod} />
      <Card className="mb-3">
        <SectionTitle>Horas por tipo de actividad</SectionTitle>
        {!taskSorted.length ? (
          <p className="text-sm text-stone-400 text-center py-2">Sin registros</p>
        ) : (
          taskSorted.map(([taskLabel, hours]) => (
            <HourBar
              key={taskLabel}
              label={taskLabel}
              hours={hours}
              maxHours={maxTask}
              color={ENTRY_TASK_COLORS[taskLabel as keyof typeof ENTRY_TASK_COLORS] ?? '#1D9E75'}
            />
          ))
        )}
      </Card>
      <Card>
        <SectionTitle>Actividades por cliente</SectionTitle>
        {!clientSorted.length ? (
          <p className="text-sm text-stone-400 text-center py-2">Sin registros</p>
        ) : (
          clientSorted.map(([id, tasks]) => {
            const ent = id === INTERNAL_CLIENT_ROOT_NAME
              ? { id: 'internal-root', name: INTERNAL_CLIENT_ROOT_NAME, colorIndex: 4 }
              : allEnts.find(item => item.id === id)
            const col = clientColor(ent)
            const name = ent?.name ?? id
            const totalHours = Object.values(tasks).reduce((sum, value) => sum + value, 0)
            return (
              <div key={id} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={name} bg={col.bg} fg={col.fg} size="sm" />
                  <span className="text-xs font-medium text-stone-700 flex-1 truncate">{name}</span>
                  <span className="text-xs text-stone-400">{totalHours.toFixed(1)}h</span>
                </div>
                {Object.entries(tasks)
                  .sort((a, b) => b[1] - a[1])
                  .map(([taskLabel, hours]) => (
                    <div key={taskLabel} className="flex items-center gap-2 mb-1 last:mb-0 pl-8">
                      <span className="text-xs text-stone-400 w-28 truncate flex-shrink-0">{taskLabel}</span>
                      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((hours / totalHours) * 100)}%`,
                            background: ENTRY_TASK_COLORS[taskLabel as keyof typeof ENTRY_TASK_COLORS] ?? '#9FE1CB',
                          }}
                        />
                      </div>
                      <span className="text-xs text-stone-400 w-8 text-right">{hours.toFixed(1)}h</span>
                    </div>
                  ))}
              </div>
            )
          })
        )}
      </Card>
    </>
  )
})

// ─── Historial Tab ────────────────────────────────────────────────────────────

function getLast12Months(): { month: number; year: number; label: string }[] {
  const result = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    let m = now.getMonth() - i
    let y = now.getFullYear()
    if (m < 0) { m += 12; y -= 1 }
    result.push({ month: m, year: y, label: MONTHS_SHORT[m] + ' ' + String(y).slice(2) })
  }
  return result
}

const HistorialTab = memo(function HistorialTab({
  allEnts,
  entries,
  internalIds,
}: {
  allEnts: Client[]
  entries: any[]
  internalIds: Set<string>
}) {
  const [numMonths, setNumMonths] = useState<6 | 12>(6)
  const months = useMemo(() => getLast12Months().slice(numMonths === 6 ? 6 : 0), [numMonths])

  const { rows, totals } = useMemo(() => {
    const byClient: Record<string, Record<string, number>> = {}
    entries.forEach(entry => {
      const [y, m] = entry.date.split('-').map(Number)
      const key = `${y}-${String(m).padStart(2, '0')}`
      const clientKey = internalIds.has(entry.clientId) ? INTERNAL_CLIENT_ROOT_NAME : entry.clientId
      byClient[clientKey] = byClient[clientKey] || {}
      byClient[clientKey][key] = (byClient[clientKey][key] || 0) + entry.hours
    })

    const monthKeys = months.map(({ month, year }) => `${year}-${String(month + 1).padStart(2, '0')}`)

    const rows = Object.entries(byClient)
      .map(([id, mMap]) => ({
        id,
        total: monthKeys.reduce((s, k) => s + (mMap[k] ?? 0), 0),
        values: monthKeys.map(k => mMap[k] ?? 0),
      }))
      .filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total)

    const totals = monthKeys.map((_, i) => rows.reduce((s, r) => s + r.values[i], 0))

    return { rows, totals }
  }, [entries, months, internalIds])

  const maxVal = useMemo(() => Math.max(...rows.flatMap(r => r.values), 1), [rows])

  return (
    <>
      <div className="flex gap-1 mb-3">
        {([6, 12] as const).map(n => (
          <button
            key={n}
            onClick={() => setNumMonths(n)}
            className={`flex-1 py-1.5 text-xs rounded-lg transition-all ${
              numMonths === n
                ? 'bg-accent text-white font-medium'
                : 'bg-stone-100 text-stone-400'
            }`}
          >
            {n} meses
          </button>
        ))}
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-xs border-collapse" style={{ minWidth: `${months.length * 52 + 100}px` }}>
          <thead>
            <tr>
              <th className="text-left text-stone-400 font-normal pb-2 pr-2 sticky left-0 bg-white z-10 min-w-[90px]">
                Cliente
              </th>
              {months.map(({ month, year, label }) => (
                <th
                  key={`${year}-${month}`}
                  className="text-center text-stone-400 font-normal pb-2 px-1 min-w-[48px]"
                >
                  {label}
                </th>
              ))}
              <th className="text-right text-stone-400 font-normal pb-2 pl-2 min-w-[40px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td colSpan={months.length + 2} className="text-center text-stone-400 py-8">
                  Sin registros
                </td>
              </tr>
            ) : (
              rows.map(row => {
                const ent = row.id === INTERNAL_CLIENT_ROOT_NAME
                  ? { id: 'internal-root', name: INTERNAL_CLIENT_ROOT_NAME, colorIndex: 4 }
                  : allEnts.find(c => c.id === row.id)
                const col = clientColor(ent)
                const name = ent?.name ?? row.id

                return (
                  <tr key={row.id} className="border-t border-stone-100">
                    <td className="py-2 pr-2 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.dot }} />
                        <span className="truncate text-stone-700 max-w-[72px]">{name}</span>
                      </div>
                    </td>
                    {row.values.map((val, i) => (
                      <td key={i} className="text-center px-1 py-2">
                        {val > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <div
                              className="w-7 rounded-sm mx-auto"
                              style={{
                                height: `${Math.max(3, Math.round((val / maxVal) * 20))}px`,
                                background: col.dot,
                                opacity: 0.7,
                              }}
                            />
                            <span className="text-stone-600">{val % 1 === 0 ? val : val.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-stone-200">—</span>
                        )}
                      </td>
                    ))}
                    <td className="text-right pl-2 py-2 font-medium text-stone-700">
                      {row.total % 1 === 0 ? row.total : row.total.toFixed(1)}h
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-stone-200">
                <td className="py-2 pr-2 sticky left-0 bg-white z-10 text-stone-500 font-medium">Total</td>
                {totals.map((t, i) => (
                  <td key={i} className="text-center px-1 py-2 font-medium text-stone-600">
                    {t > 0 ? (t % 1 === 0 ? t : t.toFixed(1)) : <span className="text-stone-200">—</span>}
                  </td>
                ))}
                <td className="text-right pl-2 py-2 font-medium text-stone-800">
                  {totals.reduce((s, t) => s + t, 0).toFixed(1)}h
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  )
})
