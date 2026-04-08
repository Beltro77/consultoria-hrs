import { supabase, getCurrentProfile } from '@/lib/supabase'
import { listRecurringDefs } from '@/lib/services/recurringDefs.service'
import type { Task, TaskInput } from '@/lib/types'

const TABLE = 'tasks'

function mapTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    desc: row.desc ?? undefined,
    date: row.date,
    originalDate: row.original_date,
    status: row.status,
    type: row.type,
    recurDefId: row.recur_def_id ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  }
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('date', { ascending: true })

  if (error) {
    console.error('Error listing tasks:', error)
    return []
  }

  return (data ?? []).map(mapTask)
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching task:', error)
    return null
  }

  return data ? mapTask(data) : null
}

export async function upsertTask(task: TaskInput): Promise<void> {
  const profile = await getCurrentProfile()

  const payload: {
    id?: string
    title: string
    desc: string | null
    date: string
    original_date: string
    status: Task['status']
    type: Task['type']
    recur_def_id: string | null
    created_at: string
    owner_id: string
  } = {
    title: task.title,
    desc: task.desc ?? null,
    date: task.date,
    original_date: task.originalDate,
    status: task.status,
    type: task.type,
    recur_def_id: task.recurDefId ?? null,
    created_at: task.createdAt ?? new Date().toISOString(),
    owner_id: profile.id,
  }

  if (task.id) {
    payload.id = task.id
  }

  const { error } = task.id
    ? await supabase.from(TABLE).upsert(payload, { onConflict: 'id' })
    : await supabase.from(TABLE).insert(payload)

  if (error) {
    console.error('Error upserting task:', error)
    throw error
  }
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting task:', error)
  }
}

function toDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

export async function syncRecurringTasks(): Promise<void> {
  const defs = await listRecurringDefs()
  const tasks = await listTasks()
  const existing = new Set(
    tasks
      .filter(t => t.recurDefId)
      .map(t => `${t.recurDefId}_${t.originalDate}`)
  )

  const newTasks: TaskInput[] = []

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
        match = def.day !== undefined && d.getDate() === def.day
      } else if (def.type === 'weekly') {
        match = def.weekday !== undefined && d.getDay() === def.weekday
      }

      const key = `${def.id}_${dstr}`
      if (match && !existing.has(key)) {
        newTasks.push({
          title: def.title,
          desc: def.desc,
          date: dstr,
          originalDate: dstr,
          status: 'pendiente',
          type: 'recurrente',
          recurDefId: def.id,
          createdAt: new Date().toISOString(),
        })
        existing.add(key)
      }
    }
  })

  if (newTasks.length) {
    await Promise.all(newTasks.map(upsertTask))
  }
}
