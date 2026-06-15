'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  listProjects, getTopicsWithSubtasks,
} from '@/lib/services/iso.service'
import { listClients } from '@/lib/services/clients.service'
import {
  type Project, type ProjectTopic,
  computeProjectProgress, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS,
  trafficLight, TRAFFIC_COLORS,
} from '@/lib/iso-types'
import type { Client } from '@/lib/types'
import NewProjectModal from '@/components/iso/NewProjectModal'

interface ProjectWithProgress extends Project {
  progress: number
  topics: ProjectTopic[]
  clientName?: string
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 75 ? '#22c55e' : value >= 40 ? '#f59e0b' : '#e2e8f0'
  return (
    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  )
}

function TrafficDot({ color }: { color: string }) {
  if (color === 'transparent') return null
  return <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  onOpenProject: (id: string) => void
}

export default function ProjectsView({ onOpenProject }: Props) {
  const [projects, setProjects] = useState<ProjectWithProgress[]>([])
  const [loading, setLoading]   = useState(true)
  const [showNew, setShowNew]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [raw, allClients] = await Promise.all([listProjects(), listClients()])
    const clientMap = new Map<string, Client>(allClients.map(c => [c.id, c]))
    const enriched = await Promise.all(
      raw.map(async p => {
        const topics = await getTopicsWithSubtasks(p.id)
        const client = p.clientId ? clientMap.get(p.clientId) : undefined
        return { ...p, topics, progress: computeProjectProgress(topics), clientName: client?.name }
      })
    )
    setProjects(enriched)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-stone-400">Cargando proyectos...</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">
          Proyectos ISO 9001 · {projects.length}
        </p>
        <button
          onClick={() => setShowNew(true)}
          className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
        >
          + Nuevo
        </button>
      </div>

      {projects.length === 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
          <p className="text-sm text-stone-400">No hay proyectos todavía.</p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Crear el primero
          </button>
        </div>
      )}

      {projects.map(p => {
        const tl = trafficLight(p, p.progress)
        return (
          <button
            key={p.id}
            onClick={() => onOpenProject(p.id)}
            className="w-full bg-white border border-stone-200 rounded-xl p-4 text-left hover:border-stone-300 transition-colors"
          >
            <div className="flex items-start gap-2 mb-2">
              <TrafficDot color={TRAFFIC_COLORS[tl]} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800 truncate">{p.name}</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  {p.clientName ?? p.clientEmail ?? 'Sin cliente asignado'}
                </p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${PROJECT_STATUS_COLORS[p.status]}`}>
                {PROJECT_STATUS_LABELS[p.status]}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <ProgressBar value={p.progress} />
              <span className="text-[11px] font-medium text-stone-500 flex-shrink-0 w-9 text-right">
                {p.progress}%
              </span>
            </div>

            <div className="flex gap-4 mt-2.5">
              {p.startDate && (
                <p className="text-[10px] text-stone-400">
                  Inicio: <span className="text-stone-600">{formatDate(p.startDate)}</span>
                </p>
              )}
              {p.estimatedEndDate && (
                <p className="text-[10px] text-stone-400">
                  Fin est.: <span className="text-stone-600">{formatDate(p.estimatedEndDate)}</span>
                </p>
              )}
            </div>
          </button>
        )
      })}

      <NewProjectModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onSaved={load}
      />
    </div>
  )
}
