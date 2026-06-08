import { supabase, getCurrentProfile } from '@/lib/supabase'
import type { Idea, IdeaInput } from '@/lib/types'

const TABLE = 'ideas'

function mapIdea(row: any): Idea {
  return {
    id:               row.id,
    itemType:         row.item_type ?? 'idea',
    clientId:         row.client_id ?? null,
    subtopicId:       row.subtopic_id ?? null,
    title:            row.title,
    description:      row.description ?? undefined,
    category:         row.category ?? undefined,
    impactEstimated:  row.impact_estimated ?? undefined,
    effortEstimated:  row.effort_estimated ?? undefined,
    priority:         row.priority ?? 'normal',
    status:           row.status ?? 'nueva',
    dueDate:          row.due_date ?? undefined,
    nextStep:         row.next_step ?? undefined,
    notes:            row.notes ?? undefined,
    createdAt:        row.created_at ?? new Date().toISOString(),
    updatedAt:        row.updated_at ?? new Date().toISOString(),
  }
}

export async function listIdeas(): Promise<Idea[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error listing ideas:', error)
    return []
  }

  return (data ?? []).map(mapIdea)
}

export async function createIdea(input: IdeaInput): Promise<Idea> {
  const profile = await getCurrentProfile()

  const payload = {
    owner_id:         profile.id,
    item_type:        input.itemType ?? 'idea',
    client_id:        input.clientId ?? null,
    subtopic_id:      input.subtopicId ?? null,
    title:            input.title,
    description:      input.description ?? null,
    category:         input.category ?? null,
    impact_estimated: input.impactEstimated ?? null,
    effort_estimated: input.effortEstimated ?? null,
    priority:         input.priority ?? 'normal',
    status:           input.status ?? 'nueva',
    due_date:         input.dueDate || null,
    next_step:        input.nextStep ?? null,
    notes:            input.notes ?? null,
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating idea:', error)
    throw error
  }

  return mapIdea(data)
}

export async function updateIdea(id: string, input: Partial<IdeaInput>): Promise<void> {
  const payload: Record<string, any> = { updated_at: new Date().toISOString() }

  if (input.title !== undefined)            payload.title            = input.title
  if (input.description !== undefined)      payload.description      = input.description
  if (input.category !== undefined)         payload.category         = input.category
  if (input.impactEstimated !== undefined)  payload.impact_estimated = input.impactEstimated
  if (input.effortEstimated !== undefined)  payload.effort_estimated = input.effortEstimated
  if (input.priority !== undefined)         payload.priority         = input.priority
  if (input.status !== undefined)           payload.status           = input.status
  if (input.dueDate !== undefined)          payload.due_date         = input.dueDate || null
  if (input.nextStep !== undefined)         payload.next_step        = input.nextStep
  if (input.notes !== undefined)            payload.notes            = input.notes
  if (input.itemType !== undefined)         payload.item_type        = input.itemType
  if (input.clientId !== undefined)         payload.client_id        = input.clientId
  if (input.subtopicId !== undefined)       payload.subtopic_id      = input.subtopicId

  const { error } = await supabase.from(TABLE).update(payload).eq('id', id)

  if (error) {
    console.error('Error updating idea:', error)
    throw error
  }
}

export async function deleteIdea(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)

  if (error) {
    console.error('Error deleting idea:', error)
    throw error
  }
}
