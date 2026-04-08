import { supabase, getCurrentProfile } from '@/lib/supabase'
import type { RecurDef, RecurDefInput } from '@/lib/types'

const TABLE = 'recurring_defs'

function mapRecurringDef(row: any): RecurDef {
  return {
    id: row.id,
    title: row.title,
    desc: row.desc ?? undefined,
    type: row.type,
    day: row.day ?? undefined,
    weekday: row.weekday ?? undefined,
    startDate: row.start_date,
    active: row.active ?? true,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

export async function listRecurringDefs(): Promise<RecurDef[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('start_date', { ascending: true })

  if (error) {
    console.error('Error listing recurring defs:', error)
    return []
  }

  return (data ?? []).map(mapRecurringDef)
}

export async function getRecurringDef(id: string): Promise<RecurDef | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching recurring definition:', error)
    return null
  }

  return data ? mapRecurringDef(data) : null
}

export async function upsertRecurringDef(def: RecurDefInput): Promise<void> {
  const profile = await getCurrentProfile()

  const payload: {
    id?: string
    title: string
    desc: string | null
    type: RecurDef['type']
    day: number | null
    weekday: number | null
    start_date: string
    active: boolean
    created_at: string
    owner_id: string
  } = {
    title: def.title,
    desc: def.desc ?? null,
    type: def.type,
    day: def.day ?? null,
    weekday: def.weekday ?? null,
    start_date: def.startDate,
    active: def.active ?? true,
    created_at: def.createdAt ?? new Date().toISOString(),
    owner_id: profile.id,
  }

  if (def.id) {
    payload.id = def.id
  }

  const { error } = def.id
    ? await supabase.from(TABLE).upsert(payload, { onConflict: 'id' })
    : await supabase.from(TABLE).insert(payload)

  if (error) {
    console.error('Error upserting recurring definition:', error)
    throw error
  }
}

export async function deleteRecurringDef(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting recurring definition:', error)
  }
}
