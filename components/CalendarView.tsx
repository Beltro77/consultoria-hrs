'use client'

import { useState, useCallback } from 'react'
import {
  MONTHS_FULL,
  MONTHS_SHORT,
  INTERNAL_CLIENT_ROOT_NAME,
  clientColor,
  todayStr,
  TASK_STATUS_CYCLE,
  type Client,
  type Task,
  type HourEntry,
} from '@/lib/types'
import { useHourEntries } from '@/lib/hooks/useHourEntries'
import { useSubtopics } from '@/lib/hooks/useSubtopics'
import { useTasks } from '@/lib/hooks/useTasks'
import { StatusButton, Badge } from '@/components/ui'
import EntryModal from '@/components/modals/EntryModal'
import TaskModal from '@/components/modals/TaskModal'

const DOWS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

interface Props {
  clients: Client[]
  onDataChange: () => Promise<void> | void
}

function buildTaskMap(tasks: Task[]): Record<string, Task[]> {
  return tasks.reduce((acc, task) => {
    const key = task.date
    acc[key] = acc[key] || []
    acc[key].push(task)
    return acc
  }, {} as Record<string, Task[]>)
}

export default function CalendarView({ clients, onDataChange }: Props) {
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [selected, setSelected] = useState(todayStr())
  const [entryOpen, setEntryOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)

  const { entries, refresh: refreshEntries, removeEntry } = useHourEntries()
  const { tasks, refresh: refreshTasks, saveTask, removeTask } = useTasks()

  const refreshEntriesAndParent = useCallback(async () => {
    await refreshEntries()
    await onDataChange()
  }, [refreshEntries, onDataChange])

  const refreshTasksAndParent = useCallback(async () => {
    await refreshTasks()
    await onDataChange()
  }, [refreshTasks, onDataChange])

  function chMonth(delta: number) {
    let m = month + delta
    let y = year

    if (m < 0) {
      m = 11
      y--
    }
    if (m > 11) {
      m = 0
      y++
    }

    setMonth(m)
    setYear(y)
  }

  const today = todayStr()
  const catalizar = clients.find(c => c.name === INTERNAL_CLIENT_ROOT_NAME)
  const { subtopics } = useSubtopics(catalizar?.id ?? null)
  const allEntities = clients
  const taskMap = buildTaskMap(tasks)

  function resolveEntryEntity(entry: HourEntry) {
    const entrySubtopic = entry.subtopicId
      ? subtopics.find(s => s.id === entry.subtopicId)
      : subtopics.find(s => s.id === entry.clientId)

    return allEntities.find(x => x.id === entry.clientId)
      ?? (entrySubtopic ? { id: entrySubtopic.id, name: entrySubtopic.name, colorIndex: 2 } : undefined)
  }

  function entriesForDateLocal(date: string) {
    return entries.filter(e => e.date === date)
  }

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  type Cell = { day: number; kind: 'prev' | 'cur' | 'next'; ds: string }
  const cells: Cell[] = []

  for (let i = firstDow - 1; i >= 0; i--) {
    const m = month === 0 ? 12 : month
    const y = month === 0 ? year - 1 : year

    cells.push({
      day: daysInPrevMonth - i,
      kind: 'prev',
      ds: `${y}-${String(m).padStart(2, '0')}-${String(daysInPrevMonth - i).padStart(2, '0')}`,
    })
  }

  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      day: i,
      kind: 'cur',
      ds: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
    })
  }

  while (cells.length % 7 !== 0) {
    const ex = cells.length - daysInMonth - firstDow + 1
    const m = month === 11 ? 1 : month + 2
    const y = month === 11 ? year + 1 : year

    cells.push({
      day: ex,
      kind: 'next',
      ds: `${y}-${String(m).padStart(2, '0')}-${String(ex).padStart(2, '0')}`,
    })
  }

  const dayEntries = entriesForDateLocal(selected)
  const dayTasks = taskMap[selected] || []
  const dayHours = dayEntries.reduce((a, e) => a + e.hours, 0)
  const pendingTasks = dayTasks.filter(t => t.status !== 'realizada').length
  const doneTasks = dayTasks.filter(t => t.status === 'realizada').length

  const displayDate = new Date(`${selected}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  async function cycleStatus(task: Task) {
    const idx = TASK_STATUS_CYCLE.indexOf(task.status)
    const next = TASK_STATUS_CYCLE[(idx + 1) % TASK_STATUS_CYCLE.length]
    await saveTask({ ...task, status: next })
    await refreshTasksAndParent()
  }

  async function delEntry(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    await removeEntry(id)
    await refreshEntriesAndParent()
  }

  async function delTask(id: string) {
    if (!confirm('¿Eliminar esta tarea?')) return
    await removeTask(id)
    await refreshTasksAndParent()
  }

  return (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <button onClick={() => chMonth(-1)} className="text-stone-400 px-2 text-xl">
          ‹
        </button>
        <span className="flex-1 text-center text-[15px] font-medium text-stone-800">
          {MONTHS_FULL[month]} {year}
        </span>
        <button onClick={() => chMonth(1)} className="text-stone-400 px-2 text-xl">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {DOWS.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-stone-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-3">
        {cells.map((cell, idx) => {
          const ents = entriesForDateLocal(cell.ds)
          const tasksForDay = taskMap[cell.ds] || []
          const isToday = cell.ds === today
          const isSelected = cell.ds === selected
          const isCurrentMonth = cell.kind === 'cur'
          const pending = tasksForDay.filter(t => t.status !== 'realizada').length
          const done = tasksForDay.filter(t => t.status === 'realizada').length

          return (
            <button
              key={idx}
              onClick={() => setSelected(cell.ds)}
              className={`min-h-[54px] rounded-lg p-1 flex flex-col items-center transition-all border ${
                isSelected ? 'border-accent bg-stone-50' : 'border-transparent hover:bg-stone-50'
              }`}
              style={isSelected ? { borderColor: 'var(--accent)' } : {}}
            >
              <span
                className={`text-xs w-5 h-5 flex items-center justify-center rounded-full mb-0.5 ${
                  isToday
                    ? 'text-white font-medium'
                    : isCurrentMonth
                    ? 'text-stone-700'
                    : 'text-stone-300'
                }`}
                style={isToday ? { background: 'var(--accent)' } : {}}
              >
                {cell.day}
              </span>

              {ents.length > 0 && (
                <div className="flex gap-0.5 mb-0.5">
                  {ents.slice(0, 3).map(entry => {
                    const entity = resolveEntryEntity(entry)
                    const col = entity ? clientColor(entity) : { bg: '#d6d3d1' }

                    return (
                      <span
                        key={entry.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: col.bg }}
                      />
                    )
                  })}
                </div>
              )}

              {(pending > 0 || done > 0) && (
                <div className="flex gap-0.5">
                  {pending > 0 && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                  {done > 0 && <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-medium text-stone-800 capitalize">{displayDate}</h3>
              <p className="text-sm text-stone-400">{dayHours.toFixed(1)} hs registradas</p>
            </div>

            <button
              onClick={() => setEntryOpen(true)}
              className="px-3 py-1.5 rounded-full border border-stone-200 text-sm text-stone-600 hover:bg-stone-50"
            >
              + Horas
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {!dayEntries.length ? (
              <p className="text-sm text-stone-400">Sin horas registradas</p>
            ) : (
              dayEntries.map(entry => {
                const entity = resolveEntryEntity(entry)
                const col = entity ? clientColor(entity) : { bg: '#d6d3d1', fg: '#57534e' }

                return (
                  <div key={entry.id} className="flex items-start gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: col.bg }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-3">
                        <p className="text-[15px] font-medium text-stone-800">
                          {entity?.name || 'Sin cliente'}
                        </p>
                        <p className="text-[15px] font-medium text-stone-800">{entry.hours}h</p>
                      </div>

                      <p className="text-sm text-stone-400">{entry.task}</p>

                      {entry.detail && (
                        <p className="text-sm italic text-stone-400">{entry.detail}</p>
                      )}
                    </div>

                    <button
                      onClick={() => delEntry(entry.id)}
                      className="text-stone-300 hover:text-stone-500 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Tareas</p>
              <p className="text-sm text-stone-400">
                {pendingTasks} pendientes, {doneTasks} realizada{doneTasks === 1 ? '' : 's'}
              </p>
            </div>

            <button
              onClick={() => setTaskOpen(true)}
              className="w-8 h-8 rounded-full border border-dashed border-amber-400 text-amber-500 hover:bg-amber-50"
            >
              +
            </button>
          </div>

          {!dayTasks.length ? (
            <p className="text-sm text-stone-400 text-center py-4">Sin tareas para este día</p>
          ) : (
            <div className="space-y-3">
              {dayTasks.map(task => (
                <div key={task.id} className="flex items-start gap-3">
                  <StatusButton status={task.status} onClick={() => cycleStatus(task)} />

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[15px] ${
                        task.status === 'realizada'
                          ? 'line-through text-stone-300'
                          : 'text-stone-700'
                      }`}
                    >
                      {task.title}
                    </p>

                    {task.desc && (
                      <p className="text-sm text-stone-400">{task.desc}</p>
                    )}

                    <div className="mt-1">
                      <Badge label={task.status} />
                    </div>
                  </div>

                  <button
                    onClick={() => delTask(task.id)}
                    className="text-stone-300 hover:text-stone-500 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <EntryModal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        defaultDate={selected}
        clients={clients}
        onSaved={async () => {
          setEntryOpen(false)
          await refreshEntriesAndParent()
        }}
      />

      <TaskModal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        defaultDate={selected}
        onSaved={async () => {
          setTaskOpen(false)
          await refreshTasksAndParent()
        }}
      />
    </div>
  )
}
