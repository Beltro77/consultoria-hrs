'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getMyMemberRecord, listLogEntries, upsertLogEntry, deleteLogEntry,
  getProject, getCategoryLevels, upsertCategoryLevel,
} from '@/lib/services/iso.service'
import {
  type ProjectMember, type MemberLogEntry, type MemberLogCategory, type CategoryLevelMap,
  MEMBER_LOG_CATEGORIES, MEMBER_LOG_CATEGORY_LABELS, MEMBER_LOG_CATEGORY_ICONS,
  CATEGORY_LEVEL_MAX, CATEGORY_LEVEL_NA, CATEGORY_LEVEL_LABELS, CATEGORY_LEVEL_COLORS,
} from '@/lib/iso-types'

interface Props { onSignOut: () => void }

function today() { return new Date().toISOString().split('T')[0] }

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Selector de nivel con N/A ───────────────────────────────────

function LevelSelector({ level, onChange }: { level: number; onChange: (n: number) => void }) {
  const isNA = level === CATEGORY_LEVEL_NA
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 border-b border-stone-100">
      <div className="flex-1">
        <p className="text-[10px] text-stone-400 mb-1.5">Nivel de avance</p>
        {isNA ? (
          <p className="text-xs italic text-stone-400">No aplica — seguimiento suspendido</p>
        ) : (
          <div className="flex items-center gap-2">
            {Array.from({ length: CATEGORY_LEVEL_MAX + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => onChange(i)}
                title={CATEGORY_LEVEL_LABELS[i]}
                className="w-5 h-5 rounded-full transition-all border-2 flex-shrink-0"
                style={{
                  background: i <= level ? CATEGORY_LEVEL_COLORS[level] : 'transparent',
                  borderColor: i <= level ? CATEGORY_LEVEL_COLORS[level] : '#d6d3d1',
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        {!isNA && (
          <p className="text-xs font-semibold" style={{ color: CATEGORY_LEVEL_COLORS[level] }}>
            {CATEGORY_LEVEL_LABELS[level]}
          </p>
        )}
        <button
          onClick={() => onChange(isNA ? 0 : CATEGORY_LEVEL_NA)}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
            isNA
              ? 'border-stone-400 bg-stone-200 text-stone-700 font-medium'
              : 'border-stone-200 text-stone-400 hover:text-stone-600'
          }`}
        >
          {isNA ? 'Reactivar' : 'No aplica'}
        </button>
      </div>
    </div>
  )
}

// ── Sección por categoría ───────────────────────────────────────

function CategorySection({
  category,
  memberId,
  level,
  onLevelChange,
}: {
  category: MemberLogCategory
  memberId: string
  level: number
  onLevelChange: (n: number) => void
}) {
  const [entries, setEntries]   = useState<MemberLogEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [entryDate, setDate]    = useState(today())
  const [saving, setSaving]     = useState(false)
  const isNA = level === CATEGORY_LEVEL_NA

  const load = useCallback(async () => {
    setLoading(true)
    const all = await listLogEntries(memberId)
    setEntries(all.filter(e => e.category === category))
    setLoading(false)
  }, [memberId, category])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!title.trim()) { alert('Ingresá un título'); return }
    setSaving(true)
    try {
      await upsertLogEntry({
        projectMemberId: memberId, category,
        title: title.trim(),
        description: description.trim() || undefined,
        entryDate,
      })
      setTitle(''); setDesc(''); setDate(today()); setShowForm(false)
      await load()
    } catch (err) {
      alert(`Error: ${(err as Error)?.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    await deleteLogEntry(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${isNA ? 'border-stone-100 opacity-60' : 'border-stone-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50">
        <p className={`text-sm font-semibold ${isNA ? 'text-stone-400' : 'text-stone-700'}`}>
          {MEMBER_LOG_CATEGORY_ICONS[category]} {MEMBER_LOG_CATEGORY_LABELS[category]}
          {!isNA && entries.length > 0 && (
            <span className="ml-2 text-[10px] bg-stone-100 text-stone-500 rounded-full px-1.5 py-0.5 font-normal">
              {entries.length}
            </span>
          )}
        </p>
        {!isNA && (
          <button
            onClick={() => setShowForm(s => !s)}
            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
          >
            {showForm ? 'Cancelar' : '+ Agregar'}
          </button>
        )}
      </div>

      {/* Selector de nivel */}
      <LevelSelector level={level} onChange={onLevelChange} />

      {!isNA && (
        <>
          {/* Formulario */}
          {showForm && (
            <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 space-y-2">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título *"
                className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <textarea
                value={description}
                onChange={e => setDesc(e.target.value)}
                placeholder="Descripción (opcional)"
                rows={2}
                className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
              />
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={entryDate}
                  onChange={e => setDate(e.target.value)}
                  className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 flex-1"
                />
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="text-xs font-semibold bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {loading && <p className="text-xs text-stone-400 text-center py-4">Cargando...</p>}

          {!loading && entries.length === 0 && (
            <p className="text-xs text-stone-300 text-center py-4 italic">Sin registros</p>
          )}

          {!loading && entries.map(e => (
            <div key={e.id} className="px-4 py-3 border-t border-stone-50">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">{e.title}</p>
                  {e.description && <p className="text-xs text-stone-500 mt-0.5">{e.description}</p>}
                  <p className="text-[10px] text-stone-400 mt-1">{formatDate(e.entryDate)}</p>
                </div>
                <button onClick={() => handleDelete(e.id)} className="text-[11px] text-stone-300 hover:text-red-400 flex-shrink-0">✕</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ── Portal principal ────────────────────────────────────────────

export default function MemberPortal({ onSignOut }: Props) {
  const [member, setMember]           = useState<ProjectMember | null>(null)
  const [projectName, setProjectName] = useState('')
  const [levels, setLevels]           = useState<CategoryLevelMap>({})
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const m = await getMyMemberRecord()
        if (!m) { setNotFound(true); setLoading(false); return }
        setMember(m)
        const [p, lvls] = await Promise.all([getProject(m.projectId), getCategoryLevels(m.id)])
        setProjectName(p?.name ?? '')
        setLevels(lvls)
      } catch (err) {
        console.error(err); setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function handleLevelChange(cat: MemberLogCategory, val: number) {
    if (!member) return
    setLevels(prev => ({ ...prev, [cat]: val }))
    try {
      await upsertCategoryLevel(member.id, cat, val)
    } catch {
      getCategoryLevels(member.id).then(setLevels)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-400">Cargando portal...</p>
      </div>
    )
  }

  if (notFound || !member) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-stone-500 text-center">No se encontró un registro asociado a tu email.</p>
        <p className="text-xs text-stone-400 text-center">Contactá al consultor para que te asigne como responsable de proceso.</p>
        <button onClick={onSignOut} className="text-xs text-stone-400 hover:text-stone-600 underline mt-4">Cerrar sesión</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-lg mx-auto">
      <header className="bg-white border-b border-stone-100 px-4 pt-5 pb-4 sticky top-0 z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-stone-400 uppercase tracking-wide mb-0.5">
              {projectName || 'Proyecto ISO 9001'}
            </p>
            <h1 className="text-[17px] font-semibold text-stone-900">{member.processName}</h1>
            <p className="text-xs text-stone-500 mt-0.5">{member.memberName}</p>
          </div>
          <button onClick={onSignOut} className="text-[11px] uppercase tracking-[0.2em] text-stone-400 hover:text-stone-600">
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {MEMBER_LOG_CATEGORIES.map(cat => (
          <CategorySection
            key={cat}
            category={cat}
            memberId={member.id}
            level={levels[cat] ?? 0}
            onLevelChange={val => handleLevelChange(cat, val)}
          />
        ))}
      </main>
    </div>
  )
}
