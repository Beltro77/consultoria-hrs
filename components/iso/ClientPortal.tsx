'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { listProjects, getTopicsWithSubtasks, listMeetings } from '@/lib/services/iso.service'
import {
  type Project, type ProjectTopic, type Meeting,
  computeProjectProgress, topicStatus, TOPIC_STATUS_CONFIG,
  PROJECT_STATUS_LABELS,
} from '@/lib/iso-types'

function ProgressBar({ value }: { value: number }) {
  const bg = value >= 75 ? '#22c55e' : value >= 40 ? '#f59e0b' : '#94a3b8'
  return (
    <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: bg }} />
    </div>
  )
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  onSignOut: () => void
}

export default function ClientPortal({ onSignOut }: Props) {
  const [project, setProject]   = useState<Project | null>(null)
  const [topics, setTopics]     = useState<ProjectTopic[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    async function load() {
      const projects = await listProjects()
      if (!projects.length) {
        setError('Tu proyecto aún no está disponible. Contactá a tu consultor.')
        setLoading(false)
        return
      }
      const p = projects[0]
      const [t, m] = await Promise.all([
        getTopicsWithSubtasks(p.id),
        listMeetings(p.id),
      ])
      setProject(p)
      setTopics(t)
      setMeetings(m)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-400 text-sm">Cargando tu proyecto...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-stone-500 text-sm text-center">{error || 'No se encontró un proyecto asignado.'}</p>
        <button onClick={onSignOut} className="text-xs text-stone-400 hover:text-stone-600">Cerrar sesión</button>
      </div>
    )
  }

  const progress = computeProjectProgress(topics)
  const now = new Date().toISOString()
  const pastMeetings = meetings.filter(m => m.scheduledAt < now).reverse().slice(0, 5)
  const upcoming = meetings.filter(m => m.scheduledAt >= now).slice(0, 2)
  const applicableTopics = topics.filter(t => t.isApplicable)
  const naTopics = topics.filter(t => !t.isApplicable)

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-white border-b border-stone-100 px-4 pt-5 pb-4 sticky top-0 z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] text-stone-400 uppercase tracking-wide mb-0.5">ISO 9001</p>
            <h1 className="text-[18px] font-semibold text-stone-900 leading-tight">{project.name}</h1>
          </div>
          <button onClick={onSignOut} className="text-[11px] text-stone-400 hover:text-stone-600">Salir</button>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-stone-500">Avance general</span>
            <span className="text-sm font-semibold text-stone-700">{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>

        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full">
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
          {project.startDate && (
            <span className="text-[10px] text-stone-400">
              Desde {formatDateShort(project.startDate)}
            </span>
          )}
          {project.estimatedEndDate && (
            <span className="text-[10px] text-stone-400">
              Hasta {formatDateShort(project.estimatedEndDate)}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Upcoming meetings */}
        {upcoming.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              Próximas reuniones
            </p>
            <div className="space-y-2">
              {upcoming.map(m => (
                <div key={m.id} className="bg-white rounded-lg p-3">
                  <p className="text-sm font-medium text-stone-800 capitalize">{formatDateTime(m.scheduledAt)}</p>
                  {m.topicsCovered?.length ? (
                    <p className="text-xs text-stone-500 mt-1">Temas: {m.topicsCovered.join(', ')}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topics */}
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-50">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Temas del proyecto</p>
          </div>
          {applicableTopics.map(t => {
            const st = topicStatus(t)
            const cfg = TOPIC_STATUS_CONFIG[st]
            const done = t.subtasks.filter(s => s.isCompleted).length
            const total = t.subtasks.length
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-t border-stone-50">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-700">{t.displayName}</p>
                  <p className={`text-[10px] mt-0.5 ${cfg.text}`}>{cfg.label}</p>
                </div>
                <span className="text-[11px] text-stone-400 flex-shrink-0">{done}/{total}</span>
              </div>
            )
          })}
          {naTopics.length > 0 && (
            <div className="px-4 py-2 border-t border-stone-50 flex flex-wrap gap-1.5">
              {naTopics.map(t => (
                <span key={t.id} className="text-[10px] text-stone-300 bg-stone-50 px-2 py-0.5 rounded-full line-through">
                  {t.displayName}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Past meetings */}
        {pastMeetings.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-50">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Reuniones anteriores</p>
            </div>
            {pastMeetings.map(m => (
              <div key={m.id} className="px-4 py-3 border-t border-stone-50">
                <p className="text-xs font-medium text-stone-600 capitalize">{formatDateTime(m.scheduledAt)}</p>
                {m.topicsCovered?.length ? (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {m.topicsCovered.map(k => (
                      <span key={k} className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">{k}</span>
                    ))}
                  </div>
                ) : null}
                {m.summary && <p className="text-xs text-stone-500 mt-2">{m.summary}</p>}
                {m.nextSteps && (
                  <div className="mt-2 border-l-2 border-amber-200 pl-2">
                    <p className="text-[11px] text-amber-600 font-medium">Próximos pasos</p>
                    <p className="text-xs text-stone-500 mt-0.5">{m.nextSteps}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
