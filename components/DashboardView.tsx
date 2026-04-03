'use client'
import { useState, useEffect, useRef } from 'react'
import {
  MONTHS_FULL, MONTHS_SHORT, INTERNAL_CLIENTS, clientColor,
  ENTRY_TASK_COLORS, type Client, type Period
} from '@/lib/types'
import { entriesForPeriod, entriesForMonth } from '@/lib/storage'
import { Card, SectionTitle, MetricCard, HourBar, Avatar, PeriodFilter } from '@/components/ui'

type DashTab = 'mes' | 'cliente' | 'actividad'
interface Props { clients: Client[] }

export default function DashboardView({ clients }: Props) {
  const [tab, setTab]         = useState<DashTab>('mes')
  const [month, setMonth]     = useState(new Date().getMonth())
  const [year, setYear]       = useState(new Date().getFullYear())
  const [cliPeriod, setCp]    = useState<Period>('mes')
  const [actPeriod, setAp]    = useState<Period>('mes')
  const donutRef              = useRef<HTMLCanvasElement>(null)
  const allEnts               = [...INTERNAL_CLIENTS, ...clients]

  function chMonth(d: number) {
    let m = month + d, y = year
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    setMonth(m); setYear(y)
  }

  useEffect(() => {
    if (tab !== 'mes') return
    const canvas = donutRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const me    = entriesForMonth(month, year)
    const total = me.reduce((a, e) => a + e.hours, 0)
    const byE: Record<string, number> = {}
    me.forEach(e => { byE[e.clientId] = (byE[e.clientId] || 0) + e.hours })
    const sorted = Object.entries(byE).sort((a, b) => b[1] - a[1])
    ctx.clearRect(0, 0, 90, 90)
    if (!sorted.length || total === 0) {
      ctx.beginPath(); ctx.arc(45, 45, 35, 0, Math.PI * 2)
      ctx.strokeStyle = '#e7e5e4'; ctx.lineWidth = 10; ctx.stroke(); return
    }
    let angle = -Math.PI / 2
    sorted.forEach(([id, h]) => {
      const ent   = allEnts.find(c => c.id === id)
      const slice = (h / total) * Math.PI * 2
      ctx.beginPath(); ctx.moveTo(45, 45)
      ctx.arc(45, 45, 38, angle, angle + slice)
      ctx.closePath(); ctx.fillStyle = clientColor(ent).dot; ctx.fill()
      angle += slice
    })
  }, [tab, month, year, clients])

  return (
    <div className="p-4">
      {/* Tab bar */}
      <div className="flex gap-0.5 bg-stone-100 rounded-lg p-0.5 mb-4">
        {(['mes', 'cliente', 'actividad'] as DashTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-xs rounded-md transition-all capitalize ${tab === t ? 'bg-white text-stone-800 font-medium shadow-sm' : 'text-stone-400'}`}>
            {t === 'mes' ? 'Por mes' : t === 'cliente' ? 'Por cliente' : 'Por actividad'}
          </button>
        ))}
      </div>

      {tab === 'mes'       && <MesTab       month={month} year={year} chMonth={chMonth} donutRef={donutRef} allEnts={allEnts} />}
      {tab === 'cliente'   && <ClienteTab   period={cliPeriod} setPeriod={setCp} refMonth={month} refYear={year} allEnts={allEnts} />}
      {tab === 'actividad' && <ActividadTab period={actPeriod} setPeriod={setAp} refMonth={month} refYear={year} allEnts={allEnts} />}
    </div>
  )
}

// ─── Por Mes ──────────────────────────────────────────────────────────────────
function MesTab({ month, year, chMonth, donutRef, allEnts }: {
  month: number; year: number; chMonth: (d: number) => void
  donutRef: React.RefObject<HTMLCanvasElement>; allEnts: Client[]
}) {
  const me      = entriesForMonth(month, year)
  const total   = me.reduce((a, e) => a + e.hours, 0)
  const clientH = me.filter(e => !['admin','tools'].includes(e.clientId)).reduce((a, e) => a + e.hours, 0)
  const intH    = total - clientH
  const dias    = new Set(me.map(e => e.date)).size

  const sparks = Array.from({ length: 6 }, (_, i) => {
    let m = month - (5 - i), y = year
    if (m < 0) { m += 12; y-- }
    return { m, y, h: entriesForMonth(m, y).reduce((a, e) => a + e.hours, 0) }
  })
  const maxSpark = Math.max(...sparks.map(s => s.h), 1)

  const byEnt: Record<string, number> = {}
  me.forEach(e => { byEnt[e.clientId] = (byEnt[e.clientId] || 0) + e.hours })
  const donutSorted = Object.entries(byEnt).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <>
      <div className="flex items-center mb-4">
        <button onClick={() => chMonth(-1)} className="text-stone-400 px-2 text-xl">‹</button>
        <span className="flex-1 text-center text-sm font-medium text-stone-800">{MONTHS_FULL[month]} {year}</span>
        <button onClick={() => chMonth(1)} className="text-stone-400 px-2 text-xl">›</button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <MetricCard label="Horas totales" value={total.toFixed(1)}   sub="este mes" />
        <MetricCard label="Facturables"   value={clientH.toFixed(1)} sub="clientes" />
        <MetricCard label="Internas"      value={intH.toFixed(1)}    sub="admin + tools" />
        <MetricCard label="Días activos"  value={String(dias)}        sub="con registro" />
      </div>

      <Card className="mb-3">
        <SectionTitle>Evolución últimos 6 meses</SectionTitle>
        <div className="flex items-end gap-1 h-12 mb-1">
          {sparks.map((s, i) => (
            <div key={i} className="flex-1 rounded-t-sm min-h-[3px]"
              style={{ height: `${Math.max(3, Math.round((s.h / maxSpark) * 48))}px`, background: s.m === month && s.y === year ? '#1D9E75' : '#9FE1CB' }}
              title={`${s.h.toFixed(1)}h`} />
          ))}
        </div>
        <div className="flex gap-1">
          {sparks.map((s, i) => <div key={i} className="flex-1 text-center text-[9px] text-stone-400">{MONTHS_SHORT[s.m]}</div>)}
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
              {donutSorted.map(([id, h]) => {
                const ent = allEnts.find(c => c.id === id)
                const col = clientColor(ent)
                const pct = total > 0 ? Math.round((h / total) * 100) : 0
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
}

// ─── Por Cliente ──────────────────────────────────────────────────────────────
function ClienteTab({ period, setPeriod, refMonth, refYear, allEnts }: {
  period: Period; setPeriod: (p: Period) => void
  refMonth: number; refYear: number; allEnts: Client[]
}) {
  const entries = entriesForPeriod(period, refMonth, refYear)
  const byC: Record<string, { hours: number; tasks: Record<string, number> }> = {}
  entries.forEach(e => {
    byC[e.clientId] = byC[e.clientId] || { hours: 0, tasks: {} }
    byC[e.clientId].hours += e.hours
    byC[e.clientId].tasks[e.task] = (byC[e.clientId].tasks[e.task] || 0) + e.hours
  })
  const sorted   = Object.entries(byC).sort((a, b) => b[1].hours - a[1].hours)
  const totalAll = sorted.reduce((a, [, d]) => a + d.hours, 0)

  return (
    <>
      <PeriodFilter value={period} onChange={setPeriod} />
      {!sorted.length ? (
        <p className="text-sm text-stone-400 text-center py-8">Sin registros en este período</p>
      ) : sorted.map(([id, data]) => {
        const ent  = allEnts.find(c => c.id === id)
        const col  = clientColor(ent)
        const name = ent?.name ?? id
        const pct  = totalAll > 0 ? Math.round((data.hours / totalAll) * 100) : 0
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
                {ent?.rate && <p className="text-xs text-stone-400">${(data.hours * ent.rate).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>}
              </div>
            </div>
            {topTasks.map(([t, h]) => (
              <div key={t} className="flex items-center gap-2 mb-1.5 last:mb-0">
                <span className="text-xs text-stone-400 w-32 truncate flex-shrink-0">{t}</span>
                <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((h / data.hours) * 100)}%`, background: col.dot }} />
                </div>
                <span className="text-xs text-stone-400 w-8 text-right">{h.toFixed(1)}h</span>
              </div>
            ))}
          </Card>
        )
      })}
    </>
  )
}

// ─── Por Actividad ────────────────────────────────────────────────────────────
function ActividadTab({ period, setPeriod, refMonth, refYear, allEnts }: {
  period: Period; setPeriod: (p: Period) => void
  refMonth: number; refYear: number; allEnts: Client[]
}) {
  const entries = entriesForPeriod(period, refMonth, refYear)
  const byTask: Record<string, number> = {}
  entries.forEach(e => { byTask[e.task] = (byTask[e.task] || 0) + e.hours })
  const taskSorted = Object.entries(byTask).sort((a, b) => b[1] - a[1])
  const maxTask    = taskSorted[0]?.[1] ?? 1

  const byClient: Record<string, Record<string, number>> = {}
  entries.forEach(e => {
    byClient[e.clientId] = byClient[e.clientId] || {}
    byClient[e.clientId][e.task] = (byClient[e.clientId][e.task] || 0) + e.hours
  })
  const clientSorted = Object.entries(byClient)
    .sort((a, b) => Object.values(b[1]).reduce((x,y)=>x+y,0) - Object.values(a[1]).reduce((x,y)=>x+y,0))

  return (
    <>
      <PeriodFilter value={period} onChange={setPeriod} />
      <Card className="mb-3">
        <SectionTitle>Horas por tipo de actividad</SectionTitle>
        {!taskSorted.length ? (
          <p className="text-sm text-stone-400 text-center py-2">Sin registros</p>
        ) : taskSorted.map(([t, h]) => (
          <HourBar key={t} label={t} hours={h} maxHours={maxTask}
            color={ENTRY_TASK_COLORS[t as keyof typeof ENTRY_TASK_COLORS] ?? '#1D9E75'} />
        ))}
      </Card>
      <Card>
        <SectionTitle>Actividades por cliente</SectionTitle>
        {!clientSorted.length ? (
          <p className="text-sm text-stone-400 text-center py-2">Sin registros</p>
        ) : clientSorted.map(([id, tasks]) => {
          const ent    = allEnts.find(c => c.id === id)
          const col    = clientColor(ent)
          const name   = ent?.name ?? id
          const totalH = Object.values(tasks).reduce((a, h) => a + h, 0)
          return (
            <div key={id} className="mb-4 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <Avatar name={name} bg={col.bg} fg={col.fg} size="sm" />
                <span className="text-xs font-medium text-stone-700 flex-1 truncate">{name}</span>
                <span className="text-xs text-stone-400">{totalH.toFixed(1)}h</span>
              </div>
              {Object.entries(tasks).sort((a, b) => b[1] - a[1]).map(([t, h]) => (
                <div key={t} className="flex items-center gap-2 mb-1 last:mb-0 pl-8">
                  <span className="text-xs text-stone-400 w-28 truncate flex-shrink-0">{t}</span>
                  <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.round((h / totalH) * 100)}%`, background: ENTRY_TASK_COLORS[t as keyof typeof ENTRY_TASK_COLORS] ?? '#9FE1CB' }} />
                  </div>
                  <span className="text-xs text-stone-400 w-8 text-right">{h.toFixed(1)}h</span>
                </div>
              ))}
            </div>
          )
        })}
      </Card>
    </>
  )
}
