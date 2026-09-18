import { supabase } from '@/lib/supabase'
import { createClientFromLead } from '@/lib/services/clients.service'

const TABLE = 'intake_leads'

export interface IntakeLeadInput {
  empresa: string
  contactoNombre: string
  contactoPosicion?: string
  sitioWeb?: string
  direccion?: string
  cantidadSucursales?: number
  cantidadPersonal?: number
  plazoProyecto?: string
  necesidad: string
  leadRef?: string | null
}

export interface IntakeLead {
  id: string
  createdAt: string
  empresa: string
  contactoNombre: string
  contactoPosicion?: string
  sitioWeb?: string
  direccion?: string
  cantidadSucursales?: number
  cantidadPersonal?: number
  plazoProyecto?: string
  necesidad: string
  leadRef?: string
  convertedClientId?: string
}

function mapIntakeLead(row: any): IntakeLead {
  return {
    id:                 row.id,
    createdAt:          row.created_at,
    empresa:            row.empresa,
    contactoNombre:     row.contacto_nombre,
    contactoPosicion:   row.contacto_posicion ?? undefined,
    sitioWeb:           row.sitio_web ?? undefined,
    direccion:          row.direccion ?? undefined,
    cantidadSucursales: row.cantidad_sucursales ?? undefined,
    cantidadPersonal:   row.cantidad_personal ?? undefined,
    plazoProyecto:      row.plazo_proyecto ?? undefined,
    necesidad:          row.necesidad,
    leadRef:            row.lead_ref ?? undefined,
    convertedClientId:  row.converted_client_id ?? undefined,
  }
}

export async function submitIntakeLead(input: IntakeLeadInput): Promise<void> {
  const payload = {
    empresa:              input.empresa.trim(),
    contacto_nombre:      input.contactoNombre.trim(),
    contacto_posicion:    input.contactoPosicion?.trim() || null,
    sitio_web:            input.sitioWeb?.trim() || null,
    direccion:            input.direccion?.trim() || null,
    cantidad_sucursales:  input.cantidadSucursales ?? null,
    cantidad_personal:    input.cantidadPersonal ?? null,
    plazo_proyecto:       input.plazoProyecto?.trim() || null,
    necesidad:            input.necesidad.trim(),
    lead_ref:             input.leadRef || null,
  }

  const { error } = await supabase.from(TABLE).insert(payload)

  if (error) {
    console.error('Error submitting intake lead:', error)
    throw error
  }
}

export async function listPendingIntakeLeads(): Promise<IntakeLead[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .is('converted_client_id', null)
    .eq('dismissed', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error listing pending intake leads:', error)
    return []
  }

  return (data ?? []).map(mapIntakeLead)
}

export async function dismissIntakeLead(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ dismissed: true }).eq('id', id)

  if (error) {
    console.error('Error dismissing intake lead:', error)
    throw error
  }
}

export async function convertIntakeLeadToClient(lead: IntakeLead): Promise<string> {
  const notes = [
    lead.plazoProyecto && `Plazo estimado: ${lead.plazoProyecto}`,
    lead.direccion && `Dirección: ${lead.direccion}`,
    lead.cantidadSucursales != null && `Sucursales: ${lead.cantidadSucursales}`,
    lead.cantidadPersonal != null && `Personal: ${lead.cantidadPersonal}`,
    lead.leadRef && `Ref. de envío: ${lead.leadRef}`,
  ].filter(Boolean).join('\n')

  const clientId = await createClientFromLead({
    name: lead.empresa,
    contactName: lead.contactoNombre,
    contactPosition: lead.contactoPosicion,
    website: lead.sitioWeb,
    description: lead.necesidad,
    notes: notes || undefined,
  })

  const { error } = await supabase
    .from(TABLE)
    .update({ converted_client_id: clientId })
    .eq('id', lead.id)

  if (error) {
    console.error('Error marking intake lead as converted:', error)
    throw error
  }

  return clientId
}
