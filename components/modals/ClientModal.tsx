'use client'

import { useState, useEffect } from 'react'
import { BottomSheet, Btn, Input, Label, ColorPicker, Select, Textarea } from '@/components/ui'
import { upsertClient } from '@/lib/services/clients.service'
import {
  CLIENT_SERVICE_CATEGORIES,
  CLIENT_SERVICE_CATEGORY_LABELS,
  CLIENT_SOURCE_LABELS,
  CLIENT_SOURCE_TYPES,
  CLIENT_STATUS_LABELS,
  INTERNAL_CLIENT_NAME_ALIASES,
  type ClientServiceCategory,
  type ClientSourceType,
  type ClientStatus,
} from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => Promise<void> | void
  initialStatus?: ClientStatus
  initialServiceCategory?: ClientServiceCategory
}

const ACTIVE_STATUS_OPTIONS: ClientStatus[] = ['activo', 'confirmado', 'pausado', 'inactivo']
const POTENTIAL_STATUS_OPTIONS: ClientStatus[] = ['lead', 'contacto_inicial', 'propuesta_enviada', 'negociacion', 'perdido']

function isPotential(s: ClientStatus) {
  return POTENTIAL_STATUS_OPTIONS.includes(s)
}

export default function ClientModal({ open, onClose, onSaved, initialStatus = 'activo', initialServiceCategory }: Props) {
  const [name, setName]               = useState('')
  const [rate, setRate]               = useState('')
  const [colorIndex, setColorIndex]   = useState(0)
  const [clientType, setClientType]   = useState<'activo' | 'potencial'>(isPotential(initialStatus) ? 'potencial' : 'activo')
  const [status, setStatus]           = useState<ClientStatus>(initialStatus)
  const [sourceType, setSourceType]         = useState<ClientSourceType | ''>('')
  const [description, setDescription]       = useState('')
  const [serviceCategory, setServiceCategory] = useState<ClientServiceCategory | ''>('')
  const [contactName, setContactName] = useState('')
  const [contactPos, setContactPos]   = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // Sync state when modal opens (same fix as TaskModal)
  useEffect(() => {
    if (open) {
      setClientType(isPotential(initialStatus) ? 'potencial' : 'activo')
      setStatus(initialStatus)
      setName('')
      setRate('')
      setColorIndex(0)
      setSourceType('')
      setDescription('')
      setServiceCategory(initialServiceCategory ?? '')
      setContactName('')
      setContactPos('')
      setContactEmail('')
      setContactPhone('')
    }
  }, [open, initialStatus, initialServiceCategory])

  function handleTypeChange(type: 'activo' | 'potencial') {
    setClientType(type)
    setStatus(type === 'activo' ? 'activo' : 'lead')
  }

  async function handleSave() {
    if (!name.trim()) { alert('Ingresá el nombre del cliente'); return }
    if (INTERNAL_CLIENT_NAME_ALIASES.has(name.trim())) {
      alert('Este nombre está reservado para el cliente interno Catalizar.')
      return
    }

    try {
      await upsertClient({
        name: name.trim(),
        rate: rate ? parseFloat(rate) : undefined,
        colorIndex,
        status,
        sourceType: sourceType || undefined,
        description: description.trim() || undefined,
        serviceCategory: serviceCategory || undefined,
        contactName: contactName.trim() || undefined,
        contactPosition: contactPos.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      })
    } catch (error) {
      alert(`Error guardando cliente: ${(error as Error)?.message ?? 'error desconocido'}`)
      return
    }

    await onSaved()
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nuevo cliente">
      {/* Tipo */}
      <Label>Tipo de cliente</Label>
      <div className="flex gap-2 mb-3">
        {(['activo', 'potencial'] as const).map(t => (
          <button
            key={t}
            onClick={() => handleTypeChange(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              clientType === t ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500'
            }`}
          >
            {t === 'activo' ? 'Cliente activo' : 'Potencial / Lead'}
          </button>
        ))}
      </div>

      <Label>Etapa</Label>
      <Select value={status} onChange={e => setStatus(e.target.value as ClientStatus)}>
        {(clientType === 'activo' ? ACTIVE_STATUS_OPTIONS : POTENTIAL_STATUS_OPTIONS).map(s => (
          <option key={s} value={s}>{CLIENT_STATUS_LABELS[s]}</option>
        ))}
      </Select>

      <Label>Nombre de la empresa / persona *</Label>
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Ej: Acme S.A."
      />

      <Label>{clientType === 'potencial' ? 'Servicio requerido' : 'Categoría de servicio'}</Label>
      <Select value={serviceCategory} onChange={e => setServiceCategory(e.target.value as ClientServiceCategory | '')}>
        <option value="">Sin especificar</option>
        {CLIENT_SERVICE_CATEGORIES.map(c => (
          <option key={c} value={c}>{CLIENT_SERVICE_CATEGORY_LABELS[c]}</option>
        ))}
      </Select>

      {clientType === 'potencial' && (
        <>
          <Label>Descripción del cliente (opcional)</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Rubro, tamaño, contexto, necesidades..."
            rows={3}
          />
        </>
      )}

      {/* Campos de contacto — siempre visibles pero más relevantes para potenciales */}
      <Label>Nombre del contacto</Label>
      <Input
        value={contactName}
        onChange={e => setContactName(e.target.value)}
        placeholder="Ej: Juan Pérez"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Posición / cargo</Label>
          <Input
            value={contactPos}
            onChange={e => setContactPos(e.target.value)}
            placeholder="Ej: CEO"
          />
        </div>
        <div>
          <Label>Teléfono / WhatsApp</Label>
          <Input
            value={contactPhone}
            onChange={e => setContactPhone(e.target.value)}
            placeholder="+54 9 11..."
          />
        </div>
      </div>

      <Label>Email</Label>
      <Input
        type="email"
        value={contactEmail}
        onChange={e => setContactEmail(e.target.value)}
        placeholder="contacto@empresa.com"
      />

      <Label>Cómo llegó</Label>
      <Select value={sourceType} onChange={e => setSourceType(e.target.value as ClientSourceType | '')}>
        <option value="">Sin especificar</option>
        {CLIENT_SOURCE_TYPES.map(s => (
          <option key={s} value={s}>{CLIENT_SOURCE_LABELS[s]}</option>
        ))}
      </Select>

      <Label>Tarifa / hora (USD, opcional)</Label>
      <Input
        type="number"
        value={rate}
        onChange={e => setRate(e.target.value)}
        placeholder="0"
        min={0}
      />

      <Label>Color</Label>
      <ColorPicker value={colorIndex} onChange={setColorIndex} />

      <div className="mt-4">
        <Btn onClick={handleSave}>Agregar cliente</Btn>
      </div>
    </BottomSheet>
  )
}
