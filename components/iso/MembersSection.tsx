'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  listProjectMembers, listLogEntries,
  deleteProjectMember, sendMemberAccess,
  getCategoryLevels, upsertCategoryLevel,
  listCoordinatorItems, addCoordinatorItem, toggleCoordinatorItem, deleteCoordinatorItem,
} from '@/lib/services/iso.service'
import {
  type ProjectMember, type MemberLogEntry, type CategoryLevelMap, type CoordinatorItem,
  MEMBER_LOG_CATEGORIES, MEMBER_LOG_CATEGORY_LABELS, MEMBER_LOG_CATEGORY_ICONS,
  CATEGORY_LEVEL_MAX, CATEGORY_LEVEL_NA, CATEGORY_LEVEL_LABELS, CATEGORY_LEVEL_COLORS,
} from '@/lib/iso-types'
import MemberModal from '@/components/iso/MemberModal'

interface Props { projectId: string }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Dots + N/A ──────────────────────────────────────────────────

function LevelControl({
  level,
  onChange,
}: {
  level: number
  onChange: (n: number) => void
}) {
  const isNA = level === CATEGORY_LEVEL_NA

  return (
    <div className="flex items-center gap-1.5">
      {isNA ? (
        <span className="text-[9px] italic text-stone-400">No aplica</span>
      ) : (
        <>
          {Array.from({ length: CATEGORY_LEVEL_MAX + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              title={CATEGORY_LEVEL_LABELS[i]}
              className="w-2.5 h-2.5 rounded-full transition-colors cursor-pointer hover:opacity-70 flex-shrink-0"
              style={{ background: i <= level ? CATEGORY_LEVEL_COLORS[level] : '#e7e5e4' }}
            />
          ))}
          {level > 0 && (
            <span className="text-[9px] ml-0.5" style={{ color: CATEGORY_LEVEL_COLORS[level] }}>
              {CATEGORY_LEVEL_LABELS[level]}
            </span>
          )}
        </>
      )}
      <button
        onClick={() => onChange(isNA ? 0 : CATEGORY_LEVEL_NA)}
        className={`ml-1 text-[9px] px-1 py-0.5 rounded border transition-colors flex-shrink-0 ${
          isNA
            ? 'border-stone-400 bg-stone-200 text-stone-600'
            : 'border-stone-200 text-stone-300 hover:text-stone-500'
        }`}
      >
        N/A
      </button>
    </div>
  )
}

// ── Grid de 8 categorías ────────────────────────────────────────

function LevelsGrid({
  levels,
  onLevelChange,
}: {
  levels: CategoryLevelMap
  onLevelChange: (cat: typeof MEMBER_LOG_CATEGORIES[number], val: number) => void
}) {
  return (
    <div className="mt-2 pt-2 border-t border-stone-50 space-y-1.5">
      {MEMBER_LOG_CATEGORIES.map(cat => {
        const lvl = levels[cat] ?? 0
        return (
          <div key={cat} className="flex items-center gap-2">
            <span className="text-[10px] text-stone-400 w-44 flex-shrink-0 truncate">
              {MEMBER_LOG_CATEGORY_ICONS[cat]} {MEMBER_LOG_CATEGORY_LABELS[cat]}
            </span>
            <LevelControl level={lvl} onChange={val => onLevelChange(cat, val)} />
          </div>
        )
      })}
    </div>
  )
}

// ── Coordinadora de proyecto ────────────────────────────────────

function CoordinatorRow({
  member,
  onEdit,
  onDeleted,
}: {
  member: ProjectMember
  onEdit: (m: ProjectMember) => void
  onDeleted: () => void
}) {
  const [items, setItems]       = useState<CoordinatorItem[]>([])
  const [newText, setNewText]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [accessSent, setAccessSent] = useState(false)

  useEffect(() => {
    listCoordinatorItems(member.id).then(data => { setItems(data); setLoading(false) })
  }, [member.id])

  async function handleAdd() {
    if (!newText.trim()) return
    setSaving(true)
    try {
      await addCoordinatorItem(member.id, newText.trim())
      setNewText('')
      setItems(await listCoordinatorItems(member.id))
    } finally { setSaving(false) }
  }

  async function handleToggle(item: CoordinatorItem) {
    await toggleCoordinatorItem(item.id, !item.done)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, done: !i.done } : i))
  }

  async function handleDelete(id: string) {
    await deleteCoordinatorItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleSendAccess() {
    try {
      await sendMemberAccess(member.memberEmail)
      setAccessSent(true)
      setTimeout(() => setAccessSent(false), 5000)
    } catch (err) { alert(`Error: ${(err as Error)?.message}`) }
  }

  async function handleDeleteMember() {
    if (!confirm(`¿Eliminar a ${member.memberName} como coordinadora?`)) return
    await deleteProjectMember(member.id)
    onDeleted()
  }

  const pending = items.filter(i => !i.done).length

  return (
    <div className="mx-4 mb-3 bg-sky-50 border border-sky-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-sky-100">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-sky-500 uppercase tracking-wide mb-0.5">Coordinadora de proyecto</p>
            <p className="text-sm font-semibold text-stone-800">{member.memberName}</p>
            {member.memberPosition && <p className="text-xs text-stone-500">{member.memberPosition}</p>}
            <p className="text-[11px] text-stone-400">{member.memberEmail}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex gap-2">
              <button onClick={() => onEdit(member)} className="text-[11px] text-stone-400 hover:text-stone-600">Editar</button>
              <button onClick={handleDeleteMember} className="text-[11px] text-stone-300 hover:text-red-400">✕</button>
            </div>
            <button
              onClick={handleSendAccess}
              disabled={accessSent}
              className={`text-[10px] ${accessSent ? 'text-emerald-500' : 'text-sky-500 hover:text-sky-700'}`}
            >
              {accessSent ? '✓ Email enviado' : 'Enviar acceso'}
            </button>
          </div>
        </div>
      </div>

      {/* Pendientes generales */}
      <div className="px-4 pt-3 pb-4">
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-2">
          Pendientes generales
          {pending > 0 && (
            <span className="ml-1.5 bg-sky-100 text-sky-600 rounded-full px-1.5 py-0.5 normal-case font-normal">{pending}</span>
          )}
        </p>

        {loading ? (
          <p className="text-xs text-stone-300 py-2">Cargando...</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {items.length === 0 && (
              <p className="text-xs text-stone-300 italic">Sin pendientes</p>
            )}
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(item)}
                  className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                    item.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300'
                  }`}
                >
                  {item.done && <span className="text-[9px] leading-none">✓</span>}
                </button>
                <span className={`text-xs flex-1 ${item.done ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                  {item.text}
                </span>
                <button onClick={() => handleDelete(item.id)} className="text-[10px] text-stone-200 hover:text-red-400 flex-shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Input nuevo pendiente */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder="Agregar pendiente..."
            className="flex-1 text-xs border border-sky-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !newText.trim()}
            className="text-xs font-semibold text-sky-600 hover:text-sky-800 disabled:opacity-40 px-1"
          >
            + Agregar
          </button>
        </div>
      </div>
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
  const [levels, setLevels]         = useState<CategoryLevelMap>({})
  const [expanded, setExpanded]     = useState(false)
  const [entries, setEntries]       = useState<MemberLogEntry[]>([])
  const [loadingLog, setLoadingLog] = useState(false)
  const [accessSent, setAccessSent] = useState(false)

  useEffect(() => {
    getCategoryLevels(member.id).then(setLevels)
  }, [member.id])

  async function handleLevelChange(cat: typeof MEMBER_LOG_CATEGORIES[number], val: number) {
    setLevels(prev => ({ ...prev, [cat]: val }))
    try {
      await upsertCategoryLevel(member.id, cat, val)
    } catch {
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
    } catch (err) { alert(`Error: ${(err as Error)?.message}`) }
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
        {/* Header */}
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

        {/* Niveles — siempre visibles */}
        <LevelsGrid levels={levels} onLevelChange={handleLevelChange} />
      </div>

      {/* Log expandible */}
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

  const coordinators = members.filter(m => m.memberRole === 'coordinator')
  const owners       = members.filter(m => m.memberRole !== 'coordinator')

  return (
    <div className="mb-4">
      {/* Coordinadoras */}
      {coordinators.map(m => (
        <CoordinatorRow key={m.id} member={m} onEdit={openEdit} onDeleted={load} />
      ))}

      {/* Responsables de proceso */}
      <div className="mx-4 bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">
            Responsables de proceso
            {owners.length > 0 && (
              <span className="ml-1.5 bg-stone-100 text-stone-500 rounded-full px-1.5 py-0.5 text-[10px]">
                {owners.length}
              </span>
            )}
          </p>
          <button onClick={openAdd} className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700">
            + Agregar
          </button>
        </div>

        {owners.length === 0 && (
          <p className="text-xs text-stone-300 text-center py-6 italic">Sin responsables asignados</p>
        )}

        {owners.map(m => (
          <MemberRow key={m.id} member={m} onEdit={openEdit} onDeleted={load} />
        ))}
      </div>

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
