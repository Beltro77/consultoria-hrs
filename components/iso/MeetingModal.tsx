'use client'

import { useState, useEffect } from 'react'
import { BottomSheet, Btn, Input, Label, Textarea } from '@/components/ui'
import { upsertMeeting } from '@/lib/services/iso.service'
import type { Meeting, ProjectTopic, ProjectMember } from '@/lib/iso-types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  projectId: string
  topics: ProjectTopic[]
  members?: ProjectMember[]
  editing?: Meeting | null
}

function toLocalDatetimeStr(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function MeetingModal({ open, onClose, onSaved, projectId, topics, members = [], editing }: Props) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [summary, setSummary]         = useState('')
  const [nextSteps, setNextSteps]     = useState('')
  const [covered, setCovered]         = useState<Set<string>>(new Set())
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    if (open) {
      if (editing) {
        setScheduledAt(toLocalDatetimeStr(editing.scheduledAt))
        setSummary(editing.summary ?? '')
        setNextSteps(editing.nextSteps ?? '')
        setCovered(new Set(editing.topicsCovered ?? []))
      } else {
        setScheduledAt('')
        setSummary('')
        setNextSteps('')
        setCovered(new Set())
      }
    }
  }, [open, editing])

  function toggleCovered(key: string, displayName: string) {
    setCovered(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
        // Agrega el nombre del tema al textarea para que el usuario escriba su comentario
        setSummary(prev => {
          const line = `${displayName}:\n`
          if (prev.includes(displayName + ':')) return prev
          return prev ? `${prev.trimEnd()}\n\n${line}` : line
        })
      }
      return next
    })
  }

  async function handleSave() {
    if (!scheduledAt) { alert('Ingresá la fecha y hora de la reunión'); return }
    setSaving(true)
    try {
      await upsertMeeting({
        id: editing?.id,
        projectId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        summary: summary.trim() || undefined,
        nextSteps: nextSteps.trim() || undefined,
        topicsCovered: covered.size ? Array.from(covered) : undefined,
      })
      onSaved()
      onClose()
    } catch (err) {
      alert(`Error: ${(err as Error)?.message}`)
    } finally {
      setSaving(false)
    }
  }

  const applicableTopics = topics.filter(t => t.isApplicable)

  return (
    <BottomSheet open={open} onClose={onClose} title={editing ? 'Editar reunión' : 'Nueva reunión'}>
      <Label>Fecha y hora *</Label>
      <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />

      <Label>Resumen de la reunión</Label>
      <Textarea
        value={summary}
        onChange={e => setSummary(e.target.value)}
        placeholder="Seleccioná temas abajo para agregarlos aquí, o escribí directamente."
        rows={Math.max(5, summary.split('\n').length + 2)}
      />

      <Label>Próximos pasos</Label>
      <Textarea
        value={nextSteps}
        onChange={e => setNextSteps(e.target.value)}
        placeholder="¿Qué queda pendiente?"
        rows={2}
      />

      {(applicableTopics.length > 0 || members.length > 0) && (
        <>
          <Label>Temas tratados</Label>
          <div className="flex flex-wrap gap-2 mb-1">
            {applicableTopics.map(t => (
              <button
                key={t.topicKey}
                onClick={() => toggleCovered(t.topicKey, t.displayName)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  covered.has(t.topicKey)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-stone-500 border-stone-200'
                }`}
              >
                {t.displayName}
              </button>
            ))}
          </div>
          {members.length > 0 && (
            <>
              <p className="text-[10px] text-stone-400 uppercase tracking-wide mt-3 mb-1.5">Procesos del cliente</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {members.map(m => {
                  const key = `process:${m.id}`
                  return (
                    <button
                      key={key}
                      onClick={() => toggleCovered(key, m.processName)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        covered.has(key)
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-stone-500 border-stone-200'
                      }`}
                    >
                      {m.processName}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      <div className="flex flex-col gap-2 mt-2">
        <Btn onClick={handleSave}>{saving ? 'Guardando...' : 'Guardar'}</Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </BottomSheet>
  )
}
