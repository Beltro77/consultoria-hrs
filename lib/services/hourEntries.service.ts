import { supabase, getCurrentProfile } from '@/lib/supabase'
import type { HourEntry, HourEntryInput } from '@/lib/types'

const TABLE = 'hour_entries'

function mapHourEntry(row: any): HourEntry {
  const taskName = row.task_name ?? undefined

  return {
    id: row.id,
    clientId: row.client_id,
    subtopicId: row.subtopic_id ?? undefined,
    taskId: row.task_id ?? undefined,
    taskName,
    task: taskName,
    detail: row.detail ?? undefined,
    hours: row.hours,
    date: row.date,
    createdAt: row.created_at ?? new Date().toISOString(),
  }
}

export async function listEntries(): Promise<HourEntry[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error('Error listing entries:', error)
    return []
  }

  return (data ?? []).map(mapHourEntry)
}

export async function getEntry(id: string): Promise<HourEntry | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching entry:', error)
    return null
  }

  return data ? mapHourEntry(data) : null
}

export async function upsertEntry(entry: HourEntryInput): Promise<void> {
  const profile = await getCurrentProfile()

  const payload: {
    id?: string
    client_id: string
    subtopic_id: string | null
    task_id: string | null
    task_name: string | null
    detail: string | null
    hours: number
    date: string
    created_at: string
    owner_id: string
  } = {
    client_id: entry.clientId,
    subtopic_id: entry.subtopicId ?? null,
    task_id: entry.taskId ?? null,
    task_name: entry.taskName ?? entry.task ?? null,
    detail: entry.detail ?? null,
    hours: entry.hours,
    date: entry.date,
    created_at: entry.createdAt ?? new Date().toISOString(),
    owner_id: profile.id,
  }

  if (entry.id) {
    payload.id = entry.id
  }

  const { error } = entry.id
    ? await supabase.from(TABLE).upsert(payload, { onConflict: 'id' })
    : await supabase.from(TABLE).insert(payload)

  if (error) {
    console.error('Error upserting entry:', error)
    throw error
  }
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting entry:', error)
    throw error
  }
}
