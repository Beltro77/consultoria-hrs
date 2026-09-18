import { supabase } from '@/lib/supabase'
import { createClientFromLead } from '@/lib/services/clients.service'
import type { ClientServiceCategory } from '@/lib/types'

const TABLE = 'intake_leads'

// Claves compartidas con las 3 primeras opciones de ClientServiceCategory
// (lib/types.ts), así la respuesta del intake mapea directo al cliente al convertir.
export const NECESIDAD_OPTIONS: { value: string; label: string }[] = [
  { value: 'iso9001',           label: 'Implementación ISO 9001' },
  { value: 'upgrade_iso2026',   label: 'Migración a ISO 9001 2026' },
  { value: 'auditoria_interna', label: 'Auditoría interna' },
  { value: 'otra',              label: 'Otra' },
]

const NECESIDAD_LABELS: Record<string, string> = Object.fromEntries(
  NECESIDAD_OPTIONS.map(o => [o.value, o.label])
)

export function necesidadLabel(value: string): string {
  return NECESIDAD_LABELS[value] ?? value
}

const NECESIDAD_TO_SERVICE_CATEGORY: Record<string, ClientServiceCategory> = {
  iso9001: 'iso9001',
  upgrade_iso2026: 'upgrade_iso2026',
  auditoria_interna: 'auditoria_interna',
}

export interface IntakeLeadInput {
  empresa: string
  contactoNombre: string
  contactoPosicion?: string
  sitioWeb?: string
  direccion?: string
  cantidadSucursales?: string
  cantidadPersonal?: number
  plazoProyecto?: string
  necesidad: string
  observaciones?: string
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
  cantidadSucursales?: string
  cantidadPersonal?: number
  plazoProyecto?: string
  necesidad: string
  observaciones?: string
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
    observaciones:      row.observaciones ?? undefined,
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
    cantidad_sucursales:  input.cantidadSucursales || null,
    cantidad_personal:    input.cantidadPersonal ?? null,
    plazo_proyecto:       input.plazoProyecto?.trim() || null,
    necesidad:            input.necesidad.trim(),
    observaciones:        input.observaciones?.trim() || null,
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
    lead.cantidadSucursales && `Sucursales: ${lead.cantidadSucursales}`,
    lead.cantidadPersonal != null && `Personal: ${lead.cantidadPersonal}`,
    lead.observaciones && `Observaciones: ${lead.observaciones}`,
    lead.leadRef && `Ref. de envío: ${lead.leadRef}`,
  ].filter(Boolean).join('\n')

  const clientId = await createClientFromLead({
    name: lead.empresa,
    contactName: lead.contactoNombre,
    contactPosition: lead.contactoPosicion,
    website: lead.sitioWeb,
    serviceCategory: NECESIDAD_TO_SERVICE_CATEGORY[lead.necesidad],
    description: necesidadLabel(lead.necesidad),
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
