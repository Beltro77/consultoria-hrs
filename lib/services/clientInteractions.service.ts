import { supabase, getCurrentProfile } from '@/lib/supabase'
import type { ClientInteraction, ClientInteractionInput } from '@/lib/types'

const TABLE = 'client_interactions'

function mapInteraction(row: any): ClientInteraction {
  return {
    id:             row.id,
    clientId:       row.client_id,
    date:           row.date,
    type:           row.type,
    summary:        row.summary ?? undefined,
    nextSteps:      row.next_steps ?? undefined,
    status:         row.status ?? 'abierto',
    priority:       row.priority ?? 'normal',
    nextActionDate: row.next_action_date ?? undefined,
    notes:          row.notes ?? undefined,
    createdAt:      row.created_at ?? new Date().toISOString(),
    updatedAt:      row.updated_at ?? new Date().toISOString(),
  }
}

export async function listInteractions(clientId: string): Promise<ClientInteraction[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error listing interactions:', error)
    return []
  }

  return (data ?? []).map(mapInteraction)
}

export async function createInteraction(input: ClientInteractionInput): Promise<ClientInteraction> {
  const profile = await getCurrentProfile()

  const payload = {
    client_id:        input.clientId,
    date:             input.date,
    type:             input.type,
    summary:          input.summary ?? null,
    next_steps:       input.nextSteps ?? null,
    status:           input.status ?? 'abierto',
    priority:         input.priority ?? 'normal',
    next_action_date: input.nextActionDate || null,
    notes:            input.notes ?? null,
    owner_id:         profile.id,
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating interaction:', error)
    throw error
  }

  return mapInteraction(data)
}

export async function updateInteraction(id: string, input: Partial<ClientInteractionInput>): Promise<void> {
  const payload: Record<string, any> = { updated_at: new Date().toISOString() }

  if (input.date !== undefined)           payload.date             = input.date
  if (input.type !== undefined)           payload.type             = input.type
  if (input.summary !== undefined)        payload.summary          = input.summary
  if (input.nextSteps !== undefined)      payload.next_steps       = input.nextSteps
  if (input.status !== undefined)         payload.status           = input.status
  if (input.priority !== undefined)       payload.priority         = input.priority
  if (input.nextActionDate !== undefined) payload.next_action_date = input.nextActionDate || null
  if (input.notes !== undefined)          payload.notes            = input.notes

  const { error } = await supabase.from(TABLE).update(payload).eq('id', id)

  if (error) {
    console.error('Error updating interaction:', error)
    throw error
  }
}

export async function deleteInteraction(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)

  if (error) {
    console.error('Error deleting interaction:', error)
    throw error
  }
}
