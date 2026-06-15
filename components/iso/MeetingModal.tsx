'use client'

import { useState, useEffect } from 'react'
import { BottomSheet, Btn, Input, Label, Textarea } from '@/components/ui'
import { upsertMeeting } from '@/lib/services/iso.service'
import type { Meeting, ProjectTopic } from '@/lib/iso-types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  projectId: string
  topics: ProjectTopic[]
  editing?: Meeting | null
}

function toLocalDatetimeStr(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Genera el template de resumen con los temas activos (al menos "Intro" completado)
function buildSummaryTemplate(topics: ProjectTopic[]): string {
  const active = topics.filter(t => {
    if (!t.isApplicable) return false
    // Tiene al menos el primer subtask completado
    const sorted = [...t.subtasks].sort((a, b) => a.orderIndex - b.orderIndex)
    return sorted[0]?.isCompleted === true
  })
  if (!active.length) return ''
  return active.map(t => {
    const done = t.subtasks.filter(s => s.isCompleted).length
    const last = [...t.subtasks]
      .sort((a, b) => b.orderIndex - a.orderIndex)
      .find(s => s.isCompleted)
    const progress = `${done}/${t.subtasks.length} — ${last?.label ?? ''}`
    return `${t.displayName} (${progress})\n`
  }).join('\n')
}

export default function MeetingModal({ open, onClose, onSaved, projectId, topics, editing }: Props) {
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
        setSummary(buildSummaryTemplate(topics))
        setNextSteps('')
        setCovered(new Set())
      }
    }
  }, [open, editing])

  function toggleCovered(key: string) {
    setCovered(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
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

      <Label>
        Resumen de la reunión
        {!editing && summary && (
          <span className="ml-2 text-[10px] text-stone-400 font-normal normal-case tracking-normal">
            (template generado con temas activos)
          </span>
        )}
      </Label>
      <Textarea
        value={summary}
        onChange={e => setSummary(e.target.value)}
        placeholder="¿Qué se trabajó?"
        rows={Math.max(5, summary.split('\n').length + 2)}
      />

      <Label>Próximos pasos</Label>
      <Textarea
        value={nextSteps}
        onChange={e => setNextSteps(e.target.value)}
        placeholder="¿Qué queda pendiente?"
        rows={2}
      />

      {applicableTopics.length > 0 && (
        <>
          <Label>Temas tratados</Label>
          <div className="flex flex-wrap gap-2 mb-4">
            {applicableTopics.map(t => (
              <button
                key={t.topicKey}
                onClick={() => toggleCovered(t.topicKey)}
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
        </>
      )}

      <div className="flex flex-col gap-2 mt-2">
        <Btn onClick={handleSave}>{saving ? 'Guardando...' : 'Guardar'}</Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </BottomSheet>
  )
}
