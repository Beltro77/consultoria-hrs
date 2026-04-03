/**
 * storage.ts
 *
 * All data access goes through this module.
 * In Step 2 (Supabase) you replace only this file.
 * The rest of the app calls the same function signatures.
 */

import type { Client, HourEntry, Task, RecurDef, Period } from './types'
import { toDateStr, nextWorkday, effectiveDate, isWeekend, todayStr } from './types'

const K = {
  clients: 'chrs_cli',
  entries: 'chrs_ent',
  tasks: 'chrs_tasks',
  recurDefs: 'chrs_recur',
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function load<T>(key: string): T[] {
  if (!isBrowser()) return []
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function persist(key: string, data: unknown) {
  if (isBrowser()) {
    localStorage.setItem(key, JSON.stringify(data))
  }
}

// ─── Clients ──────────────────────────────────────────────────────────────────
export function getClients(): Client[] {
  return load<Client>(K.clients)
}

export function upsertClient(c: Client): void {
  const all = getClients()
  const idx = all.findIndex(x => x.id === c.id)

  if (idx >= 0) {
    all[idx] = c
  } else {
    all.push(c)
  }

  persist(K.clients, all)
}

export function removeClient(id: string): void {
  persist(K.clients, getClients().filter(c => c.id !== id))
}

// ─── Hour entries ─────────────────────────────────────────────────────────────
export function getEntries(): HourEntry[] {
  return load<HourEntry>(K.entries)
}

export function upsertEntry(e: HourEntry): void {
  const all = getEntries()
  const idx = all.findIndex(x => x.id === e.id)

  if (idx >= 0) {
    all[idx] = e
  } else {
    all.push(e)
  }

  persist(K.entries, all)
}

export function removeEntry(id: string): void {
  persist(K.entries, getEntries().filter(e => e.id !== id))
}

export function entriesForDate(date: string): HourEntry[] {
  return getEntries().filter(e => e.date === date)
}

export function entriesForMonth(month: number, year: number): HourEntry[] {
  return getEntries().filter(e => {
    const [y, m] = e.date.split('-').map(Number)
    return m - 1 === month && y === year
  })
}

export function entriesForPeriod(period: Period, refMonth: number, refYear: number): HourEntry[] {
  return getEntries().filter(e => {
    const [y, m] = e.date.split('-').map(Number)
    const monthIndex = m - 1

    if (period === 'mes') {
      return monthIndex === refMonth && y === refYear
    }

    if (period === 'trim') {
      return y === refYear && Math.floor(monthIndex / 3) === Math.floor(refMonth / 3)
    }

    if (period === 'año') {
      return y === refYear
    }

    return true
  })
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export function getTasks(): Task[] {
  return load<Task>(K.tasks)
}

export function upsertTask(t: Task): void {
  const all = getTasks()
  const idx = all.findIndex(x => x.id === t.id)

  if (idx >= 0) {
    all[idx] = t
  } else {
    all.push(t)
  }

  persist(K.tasks, all)
}

export function removeTask(id: string): void {
  persist(K.tasks, getTasks().filter(t => t.id !== id))
}

/** Returns task map: dateStr → Task[] that should appear on that date */
export function buildTaskMap(): Record<string, Task[]> {
  syncRecurring()
  const map: Record<string, Task[]> = {}

  getTasks().forEach(t => {
    const ed = effectiveDate(t)
    map[ed] = map[ed] || []
    map[ed].push(t)
  })

  return map
}

// ─── Recurring definitions ────────────────────────────────────────────────────
export function getRecurDefs(): RecurDef[] {
  return load<RecurDef>(K.recurDefs)
}

export function upsertRecurDef(def: RecurDef): void {
  const all = getRecurDefs()
  const idx = all.findIndex(x => x.id === def.id)

  if (idx >= 0) {
    all[idx] = def
  } else {
    all.push(def)
  }

  persist(K.recurDefs, all)
}

/** Generate recurring task instances for a ±7 to +45 day window */
export function syncRecurring(): void {
  const defs = getRecurDefs()
  const tasks = getTasks()
  const existing = new Set(
    tasks.filter(t => t.recurDefId).map(t => `${t.recurDefId}_${t.originalDate}`)
  )
  const newTasks: Task[] = []

  defs.forEach(def => {
    for (let i = -7; i <= 45; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      const dstr = toDateStr(d)

      if (dstr < def.startDate) continue

      let match = false

      if (def.type === 'monthly-start') {
        match = d.getDate() === 1
      } else if (def.type === 'monthly-end') {
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
        match = d.getDate() === last
      } else if (def.type === 'monthly-day') {
        match = d.getDate() === def.day
      } else if (def.type === 'weekly') {
        match = d.getDay() === def.weekday
      }

      const key = `${def.id}_${dstr}`

      if (match && !existing.has(key)) {
        newTasks.push({
          id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title: def.title,
          desc: def.desc,
          date: dstr,
          originalDate: dstr,
          status: 'pendiente',
          type: 'recurrente',
          recurDefId: def.id,
          createdAt: dstr,
        })
        existing.add(key)
      }
    }
  })

  if (newTasks.length) {
    persist(K.tasks, [...tasks, ...newTasks])
  }
}