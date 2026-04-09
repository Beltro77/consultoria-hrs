import { supabase, getCurrentProfile } from '@/lib/supabase'
import {
  INTERNAL_CLIENT_NAME_ALIASES,
  INTERNAL_CLIENT_PRESETS,
  INTERNAL_CLIENT_ROOT_NAME,
  INTERNAL_CLIENT_SUBTOPICS,
  type Client,
  type ClientInput,
} from '@/lib/types'

const TABLE = 'clients'

function mapClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    rate: row.rate ?? undefined,
    colorIndex: row.color_index ?? 0,
  }
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error listing clients:', error)
    return []
  }

  return (data ?? []).map(mapClient)
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching client:', error)
    return null
  }

  return data ? mapClient(data) : null
}

export async function upsertClient(client: ClientInput): Promise<void> {
  if (INTERNAL_CLIENT_NAME_ALIASES.has(client.name.trim())) {
    throw new Error('Ese nombre está reservado para el cliente interno Catalizar.')
  }

  const profile = await getCurrentProfile()

  const payload: { id?: string; name: string; rate: number | null; color_index: number; owner_id: string } = {
    name: client.name,
    rate: client.rate ?? null,
    color_index: client.colorIndex ?? 0,
    owner_id: profile.id,
  }

  if (client.id) {
    payload.id = client.id
  }

  const { error } = client.id
    ? await supabase.from(TABLE).upsert(payload, { onConflict: 'id' })
    : await supabase.from(TABLE).insert(payload)

  if (error) {
    console.error('Error upserting client:', error)
    throw error
  }
}

export async function deleteClient(id: string): Promise<void> {
  const { data: client, error: clientError } = await supabase
    .from(TABLE)
    .select('name')
    .eq('id', id)
    .single()

  if (clientError) {
    console.error('Error fetching client before delete:', clientError)
    throw clientError
  }

  if (!client) {
    throw new Error('Cliente no encontrado.')
  }

  if (INTERNAL_CLIENT_NAME_ALIASES.has(client.name)) {
    throw new Error('No se puede eliminar un cliente interno.')
  }

  const { count, error: countError } = await supabase
    .from('hour_entries')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', id)

  if (countError) {
    console.error('Error checking client entries before delete:', countError)
    throw countError
  }

  if ((count ?? 0) > 0) {
    throw new Error('No se puede eliminar un cliente con registros asociados.')
  }

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting client:', error)
    throw error
  }
}

export async function ensureInternalClients(): Promise<void> {
  const profile = await getCurrentProfile()

  for (const preset of INTERNAL_CLIENT_PRESETS) {
    const { data: existing, error: fetchError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('owner_id', profile.id)
      .eq('name', preset.name)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching internal client:', preset.name, fetchError)
      throw fetchError
    }

    if (existing) {
      // Already exists, skip
      continue
    }

    const { error: insertError } = await supabase
      .from(TABLE)
      .insert({
        name: preset.name,
        rate: null,
        color_index: preset.colorIndex,
        owner_id: profile.id,
      })

    if (insertError) {
      console.error('Error inserting internal client:', preset.name, insertError)
      throw insertError
    }
  }
}

export async function ensureInternalSubtopics(): Promise<void> {
  const profile = await getCurrentProfile()

  // Find Catalizar client
  const { data: catalizar, error: catError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('owner_id', profile.id)
    .eq('name', INTERNAL_CLIENT_ROOT_NAME)
    .maybeSingle()

  if (catError) {
    console.error('Error fetching Catalizar client:', catError)
    throw catError
  }

  if (!catalizar) {
    console.warn('Catalizar client not found, skipping subtopic creation')
    return
  }

  // Ensure default subtopics: Administración, Desarrollo, Marketing, Comercial
  const defaultSubtopics = Array.from(INTERNAL_CLIENT_SUBTOPICS)

  for (const subtopicName of defaultSubtopics) {
    const { data: existing, error: fetchError } = await supabase
      .from('client_subtopics')
      .select('*')
      .eq('client_id', catalizar.id)
      .eq('name', subtopicName)
      .eq('owner_id', profile.id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching subtopic:', subtopicName, fetchError)
      throw fetchError
    }

    if (existing) {
      // Already exists, skip
      continue
    }

    // Create it
    const { error: insertError } = await supabase
      .from('client_subtopics')
      .insert({
        name: subtopicName,
        client_id: catalizar.id,
        owner_id: profile.id,
      })

    if (insertError) {
      console.error('Error inserting subtopic:', subtopicName, insertError)
      throw insertError
    }
  }
}
