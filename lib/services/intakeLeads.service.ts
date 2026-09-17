import { supabase } from '@/lib/supabase'

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
