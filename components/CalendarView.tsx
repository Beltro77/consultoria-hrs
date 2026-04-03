'use client'
import { useState, useCallback } from 'react'
import {
  MONTHS_FULL, INTERNAL_CLIENTS, clientColor, toDateStr, todayStr,
  TASK_STATUS_CYCLE, type Client, type Task
} from '@/lib/types'
import { buildTaskMap, entriesForDate, removeEntry, upsertTask, getTasks } from '@/lib/storage'
import { StatusButton, Badge } from '@/components/ui'
import EntryModal from '@/components/modals/EntryModal'
import TaskModal  from '@/components/modals/TaskModal'

const DOWS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

interface Props { clients: Client[]; onDataChange: () => void }

export default function CalendarView({ clients, onDataChange }: Props) {
  const [month, setMonth]     = useState(new Date().getMonth())
  const [year, setYear]       = useState(new Date().getFullYear())
  const [selected, setSelected] = useState(todayStr())
  const [entryOpen, setEntryOpen] = useState(false)
  const [taskOpen, setTaskOpen]   = useState(false)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => { setTick(t => t + 1); onDataChange() }, [onDataChange])

  function chMonth(d: number) {
    let m = month + d, y = year
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    setMonth(m); setYear(y)
  }

  const today    = todayStr()
  const allEnts  = [...INTERNAL_CLIENTS, ...clients]
  const taskMap  = buildTaskMap()

  // Build calendar cells
  const firstDow   = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMon  = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  type Cell = { day: number; kind: 'prev' | 'cur' | 'next'; ds: string }
  const cells: Cell[] = []

  for (let i = firstDow - 1; i >= 0; i--) {
    const m = month === 0 ? 12 : month
    const y = month === 0 ? year - 1 : year
    cells.push({ day: daysInPrev - i, kind: 'prev', ds: `${y}-${String(m).padStart(2,'0')}-${String(daysInPrev-i).padStart(2,'0')}` })
  }
  for (let i = 1; i <= daysInMon; i++) {
    cells.push({ day: i, kind: 'cur', ds: `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}` })
  }
  while (cells.length % 7 !== 0) {
    const ex = cells.length - daysInMon - firstDow + 1
    const m  = month === 11 ? 1 : month + 2
    const y  = month === 11 ? year + 1 : year
    cells.push({ day: ex, kind: 'next', ds: `${y}-${String(m).padStart(2,'0')}-${String(ex).padStart(2,'0')}` })
  }

  // Day panel data
  const dayEntries = entriesForDate(selected)
  const dayTasks   = taskMap[selected] || []
  const dayHours   = dayEntries.reduce((a, e) => a + e.hours, 0)
  const pendTasks  = dayTasks.filter(t => t.status !== 'realizada').length
  const doneTasks  = dayTasks.filter(t => t.status === 'realizada').length
  const dispDate   = new Date(selected + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  function cycleStatus(t: Task) {
    const idx = TASK_STATUS_CYCLE.indexOf(t.status)
    const next = TASK_STATUS_CYCLE[(idx + 1) % TASK_STATUS_CYCLE.length]
    upsertTask({ ...t, status: next })
    refresh()
  }

  function delEntry(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    removeEntry(id); refresh()
  }

  function delTask(id: string) {
    if (!confirm('¿Eliminar esta tarea?')) return
    const all = getTasks().filter(t => t.id !== id)
    localStorage.setItem('chrs_tasks', JSON.stringify(all))
    refresh()
  }

  return (
    <div className="p-4">
      {/* Month nav */}
      <div className="flex items-center mb-4">
        <button onClick={() => chMonth(-1)} className="text-stone-400 px-2 text-xl">‹</button>
        <span className="flex-1 text-center text-[15px] font-medium text-stone-800">
          {MONTHS_FULL[month]} {year}
        </span>
        <button onClick={() => chMonth(1)} className="text-stone-400 px-2 text-xl">›</button>
      </div>

      {/* DOW headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {DOWS.map(d => <div key={d} className="text-center text-[11px] font-medium text-stone-400 py-1">{d}</div>)}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5 mb-3">
        {cells.map((cell, idx) => {
          const ents   = entriesForDate(cell.ds)
          const dtasks = taskMap[cell.ds] || []
          const isToday = cell.ds === today
          const isSel   = cell.ds === selected
          const isCur   = cell.kind === 'cur'
          const pend    = dtasks.filter(t => t.status !== 'realizada').length
          const done    = dtasks.filter(t => t.status === 'realizada').length

          return (
            <button key={idx} onClick={() => setSelected(cell.ds)}
              className={`min-h-[54px] rounded-lg p-1 flex flex-col items-center transition-all border ${isSel ? 'border-accent bg-stone-50' : 'border-transparent hover:bg-stone-50'}`}
              style={isSel ? { borderColor: 'var(--accent)' } : {}}>

              {/* Day number */}
              <span className={`text-xs w-5 h-5 flex items-center justify-center rounded-full mb-0.5 ${isToday ? 'text-white font-medium' : isCur ? 'text-stone-700' : 'text-stone-300'}`}
                style={isToday ? { background: 'var(--accent)' } : {}}>
                {cell.day}
              </span>

              {/* Hour dots */}
              {ents.length > 0 && isCur && (
                <div className="flex flex-wrap gap-0.5 justify-center">
                  {ents.slice(0, 3).map((e, i) => {
                    const ent = allEnts.find(c => c.id === e.clientId)
                    return <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: clientColor(ent).dot }} />
                  })}
                </div>
              )}

              {/* Task bars */}
              {dtasks.length > 0 && isCur && (
                <div className="flex gap-0.5 justify-center mt-0.5">
                  {pend > 0 && <div className="h-[3px] rounded-sm" style={{ width: `${Math.min(pend * 6, 20)}px`, background: '#EF9F27' }} />}
                  {done > 0 && <div className="h-[3px] rounded-sm" style={{ width: `${Math.min(done * 6, 16)}px`, background: '#1D9E75' }} />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Day panel */}
      <div className="rounded-xl border border-stone-200 overflow-hidden">
        {/* Hours section */}
        <div className="bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-stone-800 capitalize">{dispDate}</p>
              {dayHours > 0 && <p className="text-xs text-stone-400 mt-0.5">{dayHours.toFixed(1)} hs registradas</p>}
            </div>
            <button onClick={() => setEntryOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs border border-stone-200 text-stone-500 hover:border-accent hover:text-accent transition-all">
              + Horas
            </button>
          </div>
          {dayEntries.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-2">Sin registros de horas</p>
          ) : dayEntries.map(e => {
            const ent = allEnts.find(c => c.id === e.clientId)
            const col = clientColor(ent)
            return (
              <div key={e.id} className="flex items-start gap-2.5 py-2 border-b border-stone-100 last:border-0">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: col.dot }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">{ent?.name ?? e.clientId}</p>
                  <p className="text-xs text-stone-400">{e.task}</p>
                  {e.detail && <p className="text-xs text-stone-400 italic mt-0.5">{e.detail}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-stone-800">{e.hours}h</p>
                  <button onClick={() => delEntry(e.id)} className="text-stone-300 hover:text-red-400 text-sm transition-colors">✕</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tasks section */}
        <div className="bg-[#FAFAF7] border-t border-stone-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-stone-400 uppercase tracking-widest">
              Tareas{dayTasks.length > 0 ? ` · ${pendTasks} pendiente${pendTasks !== 1 ? 's' : ''}, ${doneTasks} realizada${doneTasks !== 1 ? 's' : ''}` : ''}
            </p>
            <button onClick={() => setTaskOpen(true)}
              className="w-7 h-7 rounded-full border-[1.5px] border-dashed flex items-center justify-center text-base transition-all hover:bg-amber-50"
              style={{ borderColor: '#BA7517', color: '#BA7517' }}>
              +
            </button>
          </div>
          {dayTasks.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-2">Sin tareas para este día</p>
          ) : dayTasks.map(t => (
            <div key={t.id} className={`flex items-start gap-2.5 py-2 border-b last:border-0 ${t.status === 'realizada' ? 'opacity-60' : ''}`}
              style={{ borderColor: 'rgba(186,117,23,0.12)' }}>
              <StatusButton status={t.status} onClick={() => cycleStatus(t)} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm text-stone-800 leading-snug ${t.status === 'realizada' ? 'line-through' : ''}`}>{t.title}</p>
                {t.desc && <p className="text-xs text-stone-400 italic mt-0.5">{t.desc}</p>}
                <div className="flex gap-1.5 flex-wrap mt-1">
                  <Badge label={t.status} />
                  {t.type === 'recurrente' && <Badge label="recurrente" />}
                </div>
              </div>
              <button onClick={() => delTask(t.id)} className="text-stone-300 hover:text-red-400 text-sm transition-colors flex-shrink-0 mt-0.5">✕</button>
            </div>
          ))}
        </div>
      </div>

      <EntryModal open={entryOpen} onClose={() => setEntryOpen(false)}
        onSaved={refresh} clients={clients} defaultDate={selected} />
      <TaskModal open={taskOpen} onClose={() => setTaskOpen(false)}
        onSaved={refresh} defaultDate={selected} />
    </div>
  )
}
