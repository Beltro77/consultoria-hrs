'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  listProjectMembers, listLogEntries,
  deleteProjectMember, sendMemberAccess,
  getCategoryLevels, upsertCategoryLevel,
} from '@/lib/services/iso.service'
import {
  type ProjectMember, type MemberLogEntry, type CategoryLevelMap,
  MEMBER_LOG_CATEGORIES, MEMBER_LOG_CATEGORY_LABELS, MEMBER_LOG_CATEGORY_ICONS,
  CATEGORY_LEVEL_MAX, CATEGORY_LEVEL_LABELS, CATEGORY_LEVEL_COLORS,
} from '@/lib/iso-types'
import MemberModal from '@/components/iso/MemberModal'

interface Props {
  projectId: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Dots de nivel ──────────────────────────────────────────────

function LevelDots({
  level,
  onChange,
  readonly = false,
}: {
  level: number
  onChange?: (n: number) => void
  readonly?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: CATEGORY_LEVEL_MAX + 1 }).map((_, i) => (
        <button
          key={i}
          disabled={readonly}
          onClick={() => onChange?.(i === level ? 0 : i)}
          title={CATEGORY_LEVEL_LABELS[i]}
          className={`w-3 h-3 rounded-full transition-colors flex-shrink-0 ${readonly ? 'cursor-default' : 'cursor-pointer hover:opacity-70'}`}
          style={{ background: i <= level ? CATEGORY_LEVEL_COLORS[level] : '#e7e5e4' }}
        />
      ))}
    </div>
  )
}

// ── Grid compacto de niveles ────────────────────────────────────

function LevelsGrid({
  memberId,
  levels,
  onLevelChange,
}: {
  memberId: string
  levels: CategoryLevelMap
  onLevelChange: (cat: typeof MEMBER_LOG_CATEGORIES[number], val: number) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 pt-2 border-t border-stone-50">
      {MEMBER_LOG_CATEGORIES.map(cat => {
        const lvl = levels[cat] ?? 0
        return (
          <div key={cat} className="flex flex-col gap-1">
            <p className="text-[10px] text-stone-400">
              {MEMBER_LOG_CATEGORY_ICONS[cat]} {MEMBER_LOG_CATEGORY_LABELS[cat]}
            </p>
            <div className="flex items-center gap-2">
              <LevelDots level={lvl} onChange={val => onLevelChange(cat, val)} />
              <span className="text-[9px]" style={{ color: CATEGORY_LEVEL_COLORS[lvl] }}>
                {CATEGORY_LEVEL_LABELS[lvl]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Fila de un responsable ──────────────────────────────────────

function MemberRow({
  member,
  onEdit,
  onDeleted,
}: {
  member: ProjectMember
  onEdit: (m: ProjectMember) => void
  onDeleted: () => void
}) {
  const [levels, setLevels]           = useState<CategoryLevelMap>({})
  const [expanded, setExpanded]       = useState(false)
  const [entries, setEntries]         = useState<MemberLogEntry[]>([])
  const [loadingLog, setLoadingLog]   = useState(false)
  const [accessSent, setAccessSent]   = useState(false)

  useEffect(() => {
    getCategoryLevels(member.id).then(setLevels)
  }, [member.id])

  async function handleLevelChange(cat: typeof MEMBER_LOG_CATEGORIES[number], val: number) {
    setLevels(prev => ({ ...prev, [cat]: val }))
    try {
      await upsertCategoryLevel(member.id, cat, val)
    } catch {
      // revert on error
      getCategoryLevels(member.id).then(setLevels)
    }
  }

  async function handleExpand() {
    if (!expanded) {
      setLoadingLog(true)
      const data = await listLogEntries(member.id)
      setEntries(data)
      setLoadingLog(false)
    }
    setExpanded(e => !e)
  }

  async function handleSendAccess() {
    try {
      await sendMemberAccess(member.memberEmail)
      setAccessSent(true)
      setTimeout(() => setAccessSent(false), 5000)
    } catch (err) {
      alert(`Error: ${(err as Error)?.message}`)
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar a ${member.memberName} como responsable?`)) return
    await deleteProjectMember(member.id)
    onDeleted()
  }

  const entriesByCategory = MEMBER_LOG_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = entries.filter(e => e.category === cat)
    return acc
  }, {} as Record<string, MemberLogEntry[]>)

  return (
    <div className="border-t border-stone-50 first:border-0">
      <div className="px-4 pt-3 pb-2">
        {/* Header: nombre + acciones */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-800">{member.processName}</p>
            <p className="text-xs text-stone-500 mt-0.5">
              {member.memberName}
              {member.memberPosition && <span className="text-stone-400"> · {member.memberPosition}</span>}
            </p>
            <p className="text-[11px] text-stone-400">{member.memberEmail}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex gap-2">
              <button onClick={() => onEdit(member)} className="text-[11px] text-stone-400 hover:text-stone-600">Editar</button>
              <button onClick={handleDelete} className="text-[11px] text-stone-300 hover:text-red-400">✕</button>
            </div>
            <button
              onClick={handleSendAccess}
              disabled={accessSent}
              className={`text-[10px] ${accessSent ? 'text-emerald-500' : 'text-sky-500 hover:text-sky-700'}`}
            >
              {accessSent ? '✓ Email enviado' : 'Enviar acceso'}
            </button>
            <button onClick={handleExpand} className="text-[10px] text-stone-400 hover:text-stone-600">
              {expanded ? 'Ocultar log ▾' : 'Ver log ▸'}
            </button>
          </div>
        </div>

        {/* Niveles: siempre visibles */}
        <LevelsGrid memberId={member.id} levels={levels} onLevelChange={handleLevelChange} />
      </div>

      {/* Log de seguimiento (expandible) */}
      {expanded && (
        <div className="px-4 pb-4 bg-stone-50">
          {loadingLog ? (
            <p className="text-xs text-stone-400 py-3">Cargando...</p>
          ) : (
            <div className="space-y-3 pt-2">
              {MEMBER_LOG_CATEGORIES.map(cat => {
                const catEntries = entriesByCategory[cat] ?? []
                return (
                  <div key={cat}>
                    <p className="text-[11px] font-semibold text-stone-500 mb-1.5">
                      {MEMBER_LOG_CATEGORY_ICONS[cat]} {MEMBER_LOG_CATEGORY_LABELS[cat]}
                      <span className="ml-1.5 text-stone-300 font-normal">({catEntries.length})</span>
                    </p>
                    {catEntries.length === 0 ? (
                      <p className="text-[10px] text-stone-300 italic pl-2">Sin registros</p>
                    ) : (
                      <div className="space-y-2">
                        {catEntries.map(e => (
                          <div key={e.id} className="bg-white rounded-lg p-2.5 border border-stone-100">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-medium text-stone-700">{e.title}</p>
                              <span className="text-[10px] text-stone-400 flex-shrink-0">{formatDate(e.entryDate)}</span>
                            </div>
                            {e.description && (
                              <p className="text-xs text-stone-500 mt-1">{e.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MembersSection({ projectId }: Props) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [showModal, setModal] = useState(false)
  const [editing, setEditing] = useState<ProjectMember | null>(null)

  const load = useCallback(async () => {
    const data = await listProjectMembers(projectId)
    setMembers(data)
  }, [projectId])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditing(null); setModal(true) }
  function openEdit(m: ProjectMember) { setEditing(m); setModal(true) }

  return (
    <div className="mx-4 mb-4 bg-white border border-stone-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50">
        <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">
          Responsables de proceso
          {members.length > 0 && (
            <span className="ml-1.5 bg-stone-100 text-stone-500 rounded-full px-1.5 py-0.5 text-[10px]">
              {members.length}
            </span>
          )}
        </p>
        <button onClick={openAdd} className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700">
          + Agregar
        </button>
      </div>

      {members.length === 0 && (
        <p className="text-xs text-stone-300 text-center py-6 italic">Sin responsables asignados</p>
      )}

      {members.map(m => (
        <MemberRow key={m.id} member={m} onEdit={openEdit} onDeleted={load} />
      ))}

      <MemberModal
        open={showModal}
        onClose={() => setModal(false)}
        onSaved={load}
        projectId={projectId}
        editing={editing}
      />
    </div>
  )
}
