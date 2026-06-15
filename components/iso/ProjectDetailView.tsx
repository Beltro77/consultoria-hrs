'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getProject, getTopicsWithSubtasks, listMeetings,
  toggleSubtask, setTopicApplicable, moveTopicOrder,
  updateProject, deleteProject, deleteMeeting,
} from '@/lib/services/iso.service'
import { getClient } from '@/lib/services/clients.service'
import { supabase } from '@/lib/supabase'
import {
  type Project, type ProjectTopic, type Meeting,
  computeProjectProgress, computeTopicProgress, topicStatus,
  TOPIC_STATUS_CONFIG, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS,
  trafficLight, TRAFFIC_COLORS,
} from '@/lib/iso-types'
import type { Client } from '@/lib/types'
import { Btn, Label, Select } from '@/components/ui'
import MeetingModal from '@/components/iso/MeetingModal'
import MembersSection from '@/components/iso/MembersSection'

interface Props {
  projectId: string
  onBack: () => void
}

function ProgressBar({ value, height = 'h-2' }: { value: number; height?: string }) {
  const bg = value >= 75 ? '#22c55e' : value >= 40 ? '#f59e0b' : '#94a3b8'
  return (
    <div className={`w-full ${height} bg-stone-100 rounded-full overflow-hidden`}>
      <div className={`h-full rounded-full transition-all`} style={{ width: `${value}%`, background: bg }} />
    </div>
  )
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function TopicRow({
  topic, index, total, onToggleSubtask, onToggleApplicable, onMove,
}: {
  topic: ProjectTopic
  index: number
  total: number
  onToggleSubtask: (id: string, val: boolean, topic: ProjectTopic) => void
  onToggleApplicable: (id: string, val: boolean) => void
  onMove: (id: string, dir: 'up' | 'down') => void
}) {
  const [expanded, setExpanded] = useState(false)
  const st = topicStatus(topic)
  const cfg = TOPIC_STATUS_CONFIG[st]
  const pct = computeTopicProgress(topic)

  return (
    <div className="border-t border-stone-50 first:border-0">
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Reorder */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button
            onClick={() => onMove(topic.id, 'up')}
            disabled={index === 0}
            className="text-[10px] text-stone-300 hover:text-stone-500 disabled:opacity-0 leading-none"
          >▲</button>
          <button
            onClick={() => onMove(topic.id, 'down')}
            disabled={index === total - 1}
            className="text-[10px] text-stone-300 hover:text-stone-500 disabled:opacity-0 leading-none"
          >▼</button>
        </div>

        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />

        {/* Name + progress */}
        <button
          onClick={() => topic.isApplicable && setExpanded(e => !e)}
          className="flex-1 min-w-0 text-left"
        >
          <p className={`text-sm font-medium ${topic.isApplicable ? 'text-stone-700' : 'text-stone-300 line-through'}`}>
            {topic.displayName}
          </p>
          {topic.isApplicable && (
            <div className="flex items-center gap-1.5 mt-1">
              <ProgressBar value={pct} height="h-1" />
              <span className="text-[10px] text-stone-400 flex-shrink-0">{pct}%</span>
            </div>
          )}
        </button>

        {/* N/A toggle */}
        <button
          onClick={() => onToggleApplicable(topic.id, !topic.isApplicable)}
          className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${
            topic.isApplicable
              ? 'border-stone-200 text-stone-400 hover:bg-stone-50'
              : 'border-stone-200 bg-stone-100 text-stone-400'
          }`}
        >
          {topic.isApplicable ? '···' : 'N/A'}
        </button>

        {/* Expand */}
        {topic.isApplicable && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-stone-400 text-xs flex-shrink-0 w-5 text-center"
          >
            {expanded ? '▾' : '▸'}
          </button>
        )}
      </div>

      {expanded && topic.isApplicable && (
        <div className="px-4 pb-3 pl-10 space-y-2">
          {[...topic.subtasks]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((s, idx, arr) => {
              const canInteract = idx === 0 || arr[idx - 1].isCompleted
              const isLast = idx === arr.length - 1 && s.isCompleted
              return (
                <label
                  key={s.id}
                  className={`flex items-center gap-2 ${canInteract ? 'cursor-pointer' : 'cursor-not-allowed opacity-35'}`}
                >
                  <input
                    type="checkbox"
                    checked={s.isCompleted}
                    disabled={!canInteract}
                    onChange={e => canInteract && onToggleSubtask(s.id, e.target.checked, topic)}
                    className="w-4 h-4 rounded accent-emerald-600 disabled:opacity-50"
                  />
                  <span className={`text-xs ${
                    isLast ? 'text-emerald-600 font-medium' :
                    s.isCompleted ? 'text-stone-400 line-through' : 'text-stone-700'
                  }`}>
                    {s.label}
                    {isLast && ' ✓'}
                  </span>
                  {s.isCompleted && s.completedAt && (
                    <span className="text-[10px] text-stone-300 ml-auto">
                      {new Date(s.completedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </label>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default function ProjectDetailView({ projectId, onBack }: Props) {
  const [project, setProject]     = useState<Project | null>(null)
  const [client, setClient]       = useState<Client | null>(null)
  const [topics, setTopics]       = useState<ProjectTopic[]>([])
  const [meetings, setMeetings]   = useState<Meeting[]>([])
  const [loading, setLoading]     = useState(true)
  const [meetingModal, setMeetingModal]     = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [editingHeader, setEditingHeader]   = useState(false)
  const [resetSent, setResetSent]           = useState(false)
  const [editStatus, setEditStatus] = useState<string>('active')
  const [editStart, setEditStart]   = useState('')
  const [editEnd, setEditEnd]       = useState('')

  const load = useCallback(async () => {
    const [p, t, m] = await Promise.all([
      getProject(projectId),
      getTopicsWithSubtasks(projectId),
      listMeetings(projectId),
    ])
    setProject(p)
    setTopics(t)
    setMeetings(m)
    if (p?.clientId) {
      const c = await getClient(p.clientId)
      setClient(c)
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function handleToggleSubtask(subtaskId: string, val: boolean, topic: ProjectTopic) {
    const sorted = [...topic.subtasks].sort((a, b) => a.orderIndex - b.orderIndex)

    if (val) {
      // Check solo este subtask
      await toggleSubtask(subtaskId, true)
      setTopics(prev => prev.map(t => t.id !== topic.id ? t : {
        ...t,
        subtasks: t.subtasks.map(s => s.id === subtaskId
          ? { ...s, isCompleted: true, completedAt: new Date().toISOString() }
          : s
        ),
      }))
    } else {
      // Desmarcar este y todos los siguientes en cascada
      const idx = sorted.findIndex(s => s.id === subtaskId)
      const toUncheck = sorted.slice(idx).filter(s => s.isCompleted)
      await Promise.all(toUncheck.map(s => toggleSubtask(s.id, false)))
      const uncheckIds = new Set(toUncheck.map(s => s.id))
      setTopics(prev => prev.map(t => t.id !== topic.id ? t : {
        ...t,
        subtasks: t.subtasks.map(s => uncheckIds.has(s.id)
          ? { ...s, isCompleted: false, completedAt: undefined }
          : s
        ),
      }))
    }
  }

  async function handleToggleApplicable(topicId: string, val: boolean) {
    await setTopicApplicable(topicId, val)
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, isApplicable: val } : t))
  }

  async function handleMove(topicId: string, dir: 'up' | 'down') {
    await moveTopicOrder(topicId, dir, topics)
    await load()
  }

  async function handleSaveHeader() {
    if (!project) return
    await updateProject(project.id, {
      status: editStatus,
      startDate: editStart || undefined,
      estimatedEndDate: editEnd || undefined,
    })
    setEditingHeader(false)
    await load()
  }

  function openEditMeeting(m: Meeting) {
    setEditingMeeting(m)
    setMeetingModal(true)
  }

  async function handleDeleteMeeting(id: string) {
    if (!confirm('¿Eliminar esta reunión?')) return
    await deleteMeeting(id)
    setMeetings(prev => prev.filter(m => m.id !== id))
  }

  async function handleQuickStatus(newStatus: 'active' | 'paused' | 'completed') {
    if (!project) return
    const label = newStatus === 'paused' ? 'suspender' : newStatus === 'completed' ? 'concluir' : 'reactivar'
    if (!confirm(`¿Querés ${label} este proyecto?`)) return
    await updateProject(project.id, { status: newStatus })
    await load()
  }

  async function handleDeleteProject() {
    if (!project) return
    if (!confirm(`¿Eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`)) return
    await deleteProject(project.id)
    onBack()
  }

  async function handleSendPasswordReset() {
    const email = client?.contactEmail ?? project?.clientEmail
    if (!email) { alert('No hay email de contacto para este cliente.'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) { alert(`Error: ${error.message}`); return }
    setResetSent(true)
    setTimeout(() => setResetSent(false), 5000)
  }

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-stone-400">Cargando proyecto...</p>
      </div>
    )
  }

  const progress = computeProjectProgress(topics)
  const tl = trafficLight(project, progress)
  const now = new Date().toISOString()
  const pastMeetings = meetings.filter(m => m.scheduledAt < now).reverse()
  const upcoming = meetings.filter(m => m.scheduledAt >= now)

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <button onClick={onBack} className="text-[11px] text-stone-400 hover:text-stone-600 mb-3 flex items-center gap-1">
          ← Volver a proyectos
        </button>

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {tl !== 'none' && (
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: TRAFFIC_COLORS[tl] }} />
              )}
              <h2 className="text-lg font-semibold text-stone-900 truncate">{project.name}</h2>
            </div>
            <p className="text-xs text-stone-400">
              {client?.name ?? project.clientEmail ?? 'Sin cliente asignado'}
            </p>
          </div>
          <button
            onClick={() => {
              setEditStatus(project.status)
              setEditStart(project.startDate ?? '')
              setEditEnd(project.estimatedEndDate ?? '')
              setEditingHeader(true)
            }}
            className="text-[11px] text-stone-400 hover:text-stone-600 flex-shrink-0"
          >
            Editar
          </button>
        </div>

        {editingHeader ? (
          <div className="mt-3 bg-stone-50 rounded-xl p-3 space-y-2">
            <Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
              <option value="active">Activo</option>
              <option value="paused">Suspendido</option>
              <option value="completed">Concluido</option>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 w-full" />
              <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 w-full" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveHeader} className="text-[11px] font-medium text-emerald-600">Guardar</button>
              <button onClick={() => setEditingHeader(false)} className="text-[11px] text-stone-400">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PROJECT_STATUS_COLORS[project.status]}`}>
              {PROJECT_STATUS_LABELS[project.status]}
            </span>
            {project.startDate && (
              <p className="text-[10px] text-stone-400">{formatDate(project.startDate)} → {formatDate(project.estimatedEndDate)}</p>
            )}
            {project.status === 'active' && (
              <>
                <button onClick={() => handleQuickStatus('paused')}
                  className="text-[10px] text-amber-500 hover:text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                  Suspender
                </button>
                <button onClick={() => handleQuickStatus('completed')}
                  className="text-[10px] text-emerald-600 hover:text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Concluir
                </button>
              </>
            )}
            {project.status !== 'active' && (
              <button onClick={() => handleQuickStatus('active')}
                className="text-[10px] text-stone-500 hover:text-stone-700 border border-stone-200 px-2 py-0.5 rounded-full">
                Reactivar
              </button>
            )}
            <button onClick={handleDeleteProject}
              className="text-[10px] text-red-400 hover:text-red-600 ml-auto">
              Eliminar
            </button>
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-2">
          <ProgressBar value={progress} height="h-2.5" />
          <span className="text-sm font-semibold text-stone-700 flex-shrink-0">{progress}%</span>
        </div>
      </div>

      {/* Panel de contacto del cliente */}
      {client && (
        <div className="mx-4 mb-4 bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Contacto</p>
            <button
              onClick={handleSendPasswordReset}
              disabled={resetSent}
              className={`text-[11px] font-medium transition-colors ${
                resetSent
                  ? 'text-emerald-500'
                  : 'text-stone-400 hover:text-sky-600'
              }`}
            >
              {resetSent ? '✓ Email enviado' : 'Reenviar acceso'}
            </button>
          </div>
          <div className="space-y-1">
            {client.contactName && (
              <p className="text-xs text-stone-700 font-medium">
                {client.contactName}
                {client.contactPosition && <span className="text-stone-400 font-normal"> · {client.contactPosition}</span>}
              </p>
            )}
            {client.contactEmail && (
              <a href={`mailto:${client.contactEmail}`} className="block text-xs text-sky-500">{client.contactEmail}</a>
            )}
            {client.contactPhone && (
              <a href={`tel:${client.contactPhone}`} className="block text-xs text-stone-500">{client.contactPhone}</a>
            )}
            {client.website && (
              <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                target="_blank" rel="noopener noreferrer"
                className="block text-xs text-sky-500">{client.website}</a>
            )}
            {!client.contactEmail && (
              <p className="text-[11px] text-amber-500">⚠️ Sin email — el cliente no podrá acceder al portal hasta agregar uno en su legajo.</p>
            )}
          </div>
        </div>
      )}

      {/* Members / process owners */}
      <MembersSection projectId={projectId} />

      {/* Topics checklist */}
      <div className="mx-4 bg-white border border-stone-200 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-stone-50">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Temas</p>
        </div>
        {topics.map((t, i) => (
          <TopicRow
            key={t.id}
            topic={t}
            index={i}
            total={topics.length}
            onToggleSubtask={handleToggleSubtask}
            onToggleApplicable={handleToggleApplicable}
            onMove={handleMove}
          />
        ))}
      </div>

      {/* Upcoming meetings */}
      <div className="mx-4 bg-white border border-stone-200 rounded-xl overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">
            Próximas reuniones {upcoming.length > 0 && `· ${upcoming.length}`}
          </p>
          <button
            onClick={() => { setEditingMeeting(null); setMeetingModal(true) }}
            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
          >
            + Agregar
          </button>
        </div>
        {upcoming.length === 0 && (
          <p className="text-xs text-stone-300 text-center py-6">Sin reuniones programadas</p>
        )}
        {upcoming.map(m => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-t border-stone-50">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-stone-700">{formatDateTime(m.scheduledAt)}</p>
              {m.topicsCovered?.length ? (
                <p className="text-[10px] text-stone-400 mt-0.5">{m.topicsCovered.join(', ')}</p>
              ) : null}
            </div>
            <button onClick={() => openEditMeeting(m)} className="text-[11px] text-stone-400 hover:text-stone-600">Editar</button>
            <button onClick={() => handleDeleteMeeting(m.id)} className="text-[11px] text-stone-300 hover:text-red-400">✕</button>
          </div>
        ))}
      </div>

      {/* Past meetings */}
      {pastMeetings.length > 0 && (
        <div className="mx-4 bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-50">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">
              Reuniones pasadas · {pastMeetings.length}
            </p>
          </div>
          {pastMeetings.map(m => (
            <div key={m.id} className="px-4 py-3 border-t border-stone-50">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-stone-600">{formatDateTime(m.scheduledAt)}</p>
                  {m.topicsCovered?.length ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.topicsCovered.map(k => (
                        <span key={k} className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">{k}</span>
                      ))}
                    </div>
                  ) : null}
                  {m.summary && <p className="text-xs text-stone-500 mt-1.5">{m.summary}</p>}
                  {m.nextSteps && <p className="text-xs text-stone-400 mt-1">→ {m.nextSteps}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEditMeeting(m)} className="text-[11px] text-stone-400 hover:text-stone-600">Editar</button>
                  <button onClick={() => handleDeleteMeeting(m.id)} className="text-[11px] text-stone-300 hover:text-red-400">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <MeetingModal
        open={meetingModal}
        onClose={() => { setMeetingModal(false); setEditingMeeting(null) }}
        onSaved={load}
        projectId={projectId}
        topics={topics}
        editing={editingMeeting}
      />
    </div>
  )
}
