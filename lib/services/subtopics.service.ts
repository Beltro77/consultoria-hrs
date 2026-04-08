import { supabase, getCurrentProfile } from '@/lib/supabase'
import type { Subtopic, SubtopicInput } from '@/lib/types'

const TABLE = 'client_subtopics'

function mapSubtopic(row: any): Subtopic {
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id,
    createdAt: row.created_at ?? new Date().toISOString(),
  }
}

export async function listSubtopics(clientId: string): Promise<Subtopic[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('client_id', clientId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error listing subtopics:', error)
    return []
  }

  return (data ?? []).map(mapSubtopic)
}

export async function createSubtopic(name: string, clientId: string): Promise<Subtopic> {
  const profile = await getCurrentProfile()

  const payload = {
    name: name.trim(),
    client_id: clientId,
    owner_id: profile.id,
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating subtopic:', error)
    throw error
  }

  return mapSubtopic(data)
}

export async function deleteSubtopic(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting subtopic:', error)
    throw error
  }
}
