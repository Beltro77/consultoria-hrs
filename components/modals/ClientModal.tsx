'use client'
import { useState } from 'react'
import { BottomSheet, Btn, Input, Label, ColorPicker } from '@/components/ui'
import { type Client } from '@/lib/types'
import { upsertClient } from '@/lib/storage'

interface Props { open: boolean; onClose: () => void; onSaved: () => void }

export default function ClientModal({ open, onClose, onSaved }: Props) {
  const [name, setName]           = useState('')
  const [rate, setRate]           = useState('')
  const [colorIndex, setColorIndex] = useState(0)

  function handleSave() {
    if (!name.trim()) { alert('Ingresá el nombre del cliente'); return }
    upsertClient({
      id: `cli_${Date.now()}`,
      name: name.trim(),
      rate: rate ? parseFloat(rate) : undefined,
      colorIndex,
    })
    setName(''); setRate(''); setColorIndex(0)
    onSaved(); onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nuevo cliente">
      <Label>Nombre del cliente</Label>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Empresa o persona" />

      <Label>Tarifa / hora (USD, opcional)</Label>
      <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="0" min={0} />

      <Label>Color</Label>
      <ColorPicker value={colorIndex} onChange={setColorIndex} />

      <div className="mt-4">
        <Btn onClick={handleSave}>Agregar cliente</Btn>
      </div>
    </BottomSheet>
  )
}
