'use client'

import { useEffect, useState } from 'react'
import {
  IDEA_CATEGORIES,
  IDEA_CATEGORY_LABELS,
  IDEA_STATUS_LABELS,
  INTERNAL_CLIENT_ROOT_NAME,
  todayStr,
  type Idea,
  type IdeaCategory,
  type IdeaInput,
  type IdeaItemType,
  type IdeaStatus,
  type Priority,
} from '@/lib/types'
import { useIdeas } from '@/lib/hooks/useIdeas'
import { useClients } from '@/lib/hooks/useClients'
import { useSubtopics } from '@/lib/hooks/useSubtopics'
import { useHourEntries } from '@/lib/hooks/useHourEntries'
import { Btn, BottomSheet, Input, Label, Select, Textarea } from '@/components/ui'

const ARCHIVE_STATUSES = new Set<IdeaStatus>(['implementada', 'descartada'])

const STATUS_ORDER: IdeaStatus[] = [
  'nueva', 'en_revision', 'aprobada', 'en_progreso', 'pausada', 'descartada', 'implementada',
]

const PRIORITY_COLORS: Record<Priority, string> = {
  baja:    'bg-stone-100 text-stone-500',
  normal:  'bg-blue-50 text-blue-600',
  alta:    'bg-amber-50 text-amber-600',
  critica: 'bg-red-50 text-red-600',
}

const STATUS_COLORS: Record<IdeaStatus, string> = {
  nueva:        'bg-stone-100 text-stone-500',
  en_revision:  'bg-blue-50 text-blue-600',
  aprobada:     'bg-green-50 text-green-600',
  en_progreso:  'bg-amber-50 text-amber-600',
  pausada:      'bg-stone-100 text-stone-400',
  descartada:   'bg-red-50 text-red-400',
  implementada: 'bg-emerald-50 text-emerald-600',
}

const EMPTY: IdeaInput = {
  itemType:        'idea',
  title:           '',
  description:     '',
  category:        undefined,
  impactEstimated: undefined,
  effortEstimated: undefined,
  priority:        'normal',
  status:          'nueva',
  dueDate:         '',
  nextStep:        '',
  notes:           '',
  clientId:        null,
  subtopicId:      null,
}

interface LogForm {
  clientId: string
  hours: string
  date: string
  taskName: string
  detail: string
  markDone: boolean
}

function SubtopicSelect({
  clientId, value, onChange,
}: {
  clientId: string
  value: string | null | undefined
  onChange: (v: string | null) => void
}) {
  const { subtopics } = useSubtopics(clientId)
  if (!subtopics.length) return null
  return (
    <div>
      <Label>Subtema</Label>
      <Select value={value ?? ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">Sin subtema</option>
        {subtopics.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
    </div>
  )
}

export default function IdeasView() {
  const { ideas, loading, addIdea, editIdea, removeIdea } = useIdeas()
  const { clients } = useClients()
  const { saveEntry } = useHourEntries()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Idea | null>(null)
  const [form, setForm] = useState<IdeaInput>(EMPTY)
  const [activeTab, setActiveTab] = useState<IdeaItemType>('backlog')
  const [filterStatus, setFilterStatus] = useState<IdeaStatus | 'todas'>('todas')
  const [filterCat, setFilterCat] = useState<IdeaCategory | 'todas'>('todas')
  const [showArchive, setShowArchive] = useState(false)

  // Log hours modal
  const [logOpen, setLogOpen] = useState(false)
  const [logTarget, setLogTarget] = useState<Idea | null>(null)
  const [logForm, setLogForm] = useState<LogForm>({
    clientId: '', hours: '1', date: todayStr(), taskName: '', detail: '', markDone: true,
  })
  const [logSaving, setLogSaving] = useState(false)

  const allClients = clients.filter(c => c.name !== INTERNAL_CLIENT_ROOT_NAME)

  useEffect(() => {
    if (!form.clientId) setForm(f => ({ ...f, subtopicId: null }))
  }, [form.clientId])

  useEffect(() => {
    setFilterStatus('todas')
    setFilterCat('todas')
    setShowArchive(false)
  }, [activeTab])

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY, itemType: activeTab })
    setModalOpen(true)
  }

  function openEdit(idea: Idea) {
    setEditing(idea)
    setForm({
      itemType:        idea.itemType,
      title:           idea.title,
      description:     idea.description ?? '',
      category:        idea.category,
      impactEstimated: idea.impactEstimated,
      effortEstimated: idea.effortEstimated,
      priority:        idea.priority,
      status:          idea.status,
      dueDate:         idea.dueDate ?? '',
      nextStep:        idea.nextStep ?? '',
      notes:           idea.notes ?? '',
      clientId:        idea.clientId ?? null,
      subtopicId:      idea.subtopicId ?? null,
    })
    setModalOpen(true)
  }

  function openLog(idea: Idea) {
    setLogTarget(idea)
    setLogForm({
      clientId: idea.clientId ?? '',
      hours:    '1',
      date:     todayStr(),
      taskName: idea.title,
      detail:   '',
      markDone: true,
    })
    setLogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { alert('Ingresá un título'); return }
    try {
      editing ? await editIdea(editing.id, form) : await addIdea(form)
      setModalOpen(false)
    } catch (err) {
      alert(`Error: ${(err as Error)?.message ?? 'error desconocido'}`)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar?')) return
    try { await removeIdea(id) } catch (err) {
      alert(`Error: ${(err as Error)?.message}`)
    }
  }

  async function cycleStatus(idea: Idea) {
    const idx = STATUS_ORDER.indexOf(idea.status)
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
    try { await editIdea(idea.id, { status: next }) } catch {}
  }

  async function handleLogSave() {
    if (!logTarget) return
    if (!logForm.clientId) { alert('Seleccioná un cliente'); return }
    const hrs = parseFloat(logForm.hours)
    if (!hrs || hrs <= 0) { alert('Ingresá las horas'); return }

    setLogSaving(true)
    try {
      await saveEntry({
        clientId:  logForm.clientId,
        hours:     hrs,
        date:      logForm.date,
        task:      logForm.taskName,
        detail:    logForm.detail || undefined,
        entryType: 'operativo',
      })
      if (logForm.markDone) {
        await editIdea(logTarget.id, { status: 'implementada' })
      }
      setLogOpen(false)
    } catch (err) {
      alert(`Error: ${(err as Error)?.message ?? 'error desconocido'}`)
    } finally {
      setLogSaving(false)
    }
  }

  function clientLabel(idea: Idea) {
    if (!idea.clientId) return null
    return clients.find(c => c.id === idea.clientId)?.name ?? null
  }

  const tabItems = ideas.filter(i => i.itemType === activeTab)
  const archivedCount = tabItems.filter(i => ARCHIVE_STATUSES.has(i.status)).length

  const filtered = tabItems.filter(i => {
    if (!showArchive && ARCHIVE_STATUSES.has(i.status)) return false
    if (filterStatus !== 'todas' && i.status !== filterStatus) return false
    if (filterCat !== 'todas' && i.category !== filterCat) return false
    return true
  })

  const backlogCount = ideas.filter(i => i.itemType === 'backlog' && !ARCHIVE_STATUSES.has(i.status)).length
  const ideaCount = ideas.filter(i => i.itemType === 'idea' && !ARCHIVE_STATUSES.has(i.status)).length

  return (
    <div className="flex flex-col min-h-full">
      {/* Tabs principales */}
      <div className="flex border-b border-stone-200 bg-white sticky top-0 z-10">
        {(['backlog', 'idea'] as IdeaItemType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? 'text-stone-800 border-b-2 border-stone-800'
                : 'text-stone-400'
            }`}
          >
            {tab === 'backlog' ? '⚡ Backlog' : '💡 Ideas'}
            {tab === 'backlog' && backlogCount > 0 && (
              <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-600 rounded-full px-1.5 py-0.5">
                {backlogCount}
              </span>
            )}
            {tab === 'idea' && ideaCount > 0 && (
              <span className="ml-1.5 text-[10px] bg-stone-100 text-stone-500 rounded-full px-1.5 py-0.5">
                {ideaCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-4">
        <p className="text-xs text-stone-400 mb-3">
          {activeTab === 'backlog'
            ? 'Tareas pendientes a ejecutar en el corto plazo.'
            : 'Conceptos a largo plazo, requieren presupuesto o el momento oportuno.'}
        </p>

        {/* Filtro por estado */}
        <div className="flex gap-1.5 flex-wrap mb-2">
          {(['todas', ...STATUS_ORDER.filter(s => !ARCHIVE_STATUSES.has(s))] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                filterStatus === s ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500'
              }`}
            >
              {s === 'todas' ? 'Todas' : IDEA_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Filtro por categoría */}
        <div className="flex gap-1.5 flex-wrap mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterCat('todas')}
            className={`text-[10px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
              filterCat === 'todas' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500'
            }`}
          >
            Todas
          </button>
          {IDEA_CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                filterCat === c ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500'
              }`}
            >
              {IDEA_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-stone-400 text-center py-8">Cargando...</p>}

        {!loading && !filtered.length && (
          <p className="text-sm text-stone-400 text-center py-12">
            {tabItems.filter(i => !ARCHIVE_STATUSES.has(i.status)).length === 0
              ? activeTab === 'backlog' ? 'No hay tareas en el backlog' : 'No hay ideas cargadas'
              : 'Sin resultados para este filtro'}
          </p>
        )}

        {filtered.map(idea => (
          <div key={idea.id} className="bg-white border border-stone-200 rounded-xl p-3.5 mb-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 leading-snug">{idea.title}</p>
                {idea.description && (
                  <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{idea.description}</p>
                )}
                {idea.nextStep && (
                  <p className="text-xs text-stone-500 mt-1">→ {idea.nextStep}</p>
                )}
                <div className="flex gap-1.5 flex-wrap mt-1.5 text-[10px] text-stone-400">
                  <span>Cargado: {idea.createdAt.split('T')[0]}</span>
                  {idea.dueDate && (
                    <span className={`font-medium ${idea.dueDate < todayStr() ? 'text-red-400' : 'text-amber-500'}`}>
                      · Plazo: {idea.dueDate}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5 flex-wrap mt-1.5">
                  <button
                    onClick={() => cycleStatus(idea)}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[idea.status]}`}
                  >
                    {IDEA_STATUS_LABELS[idea.status]}
                  </button>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[idea.priority]}`}>
                    {idea.priority}
                  </span>
                  {idea.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                      {IDEA_CATEGORY_LABELS[idea.category]}
                    </span>
                  )}
                  {clientLabel(idea) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-500">
                      {clientLabel(idea)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                {idea.itemType === 'backlog' && !ARCHIVE_STATUSES.has(idea.status) && (
                  <button
                    onClick={() => openLog(idea)}
                    className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg font-medium hover:bg-emerald-100"
                  >
                    ▶ Registrar
                  </button>
                )}
                <button onClick={() => openEdit(idea)} className="text-xs text-stone-400 hover:text-stone-600">Editar</button>
                <button onClick={() => handleDelete(idea.id)} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
              </div>
            </div>
          </div>
        ))}

        {/* Archivo toggle */}
        {!loading && archivedCount > 0 && (
          <button
            onClick={() => setShowArchive(v => !v)}
            className="w-full text-xs text-stone-400 hover:text-stone-600 py-2 text-center"
          >
            {showArchive ? '▲ Ocultar archivo' : `▼ Ver archivo (${archivedCount})`}
          </button>
        )}

        <div className="mt-2">
          <Btn onClick={openNew}>
            + {activeTab === 'backlog' ? 'Nueva tarea' : 'Nueva idea'}
          </Btn>
        </div>
      </div>

      {/* Modal editar/crear */}
      <BottomSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing
          ? `Editar ${form.itemType === 'backlog' ? 'tarea' : 'idea'}`
          : `Nueva ${form.itemType === 'backlog' ? 'tarea' : 'idea'}`}
      >
        <Label>Tipo</Label>
        <div className="flex gap-2 mb-1">
          {(['backlog', 'idea'] as IdeaItemType[]).map(t => (
            <button
              key={t}
              onClick={() => setForm(f => ({ ...f, itemType: t }))}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                form.itemType === t
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {t === 'backlog' ? '⚡ Backlog' : '💡 Idea'}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-stone-400 mb-3">
          {form.itemType === 'backlog'
            ? 'Tarea a ejecutar en el corto plazo'
            : 'Concepto a largo plazo, requiere presupuesto o timing'}
        </p>

        <Label>Título *</Label>
        <Input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder={form.itemType === 'backlog' ? 'Ej: Actualizar informe mensual' : 'Ej: Integración con Google Sheets'}
        />

        <Label>Descripción</Label>
        <Textarea
          value={form.description ?? ''}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={3}
        />

        <Label>Cliente (opcional)</Label>
        <Select
          value={form.clientId ?? ''}
          onChange={e => setForm(f => ({ ...f, clientId: e.target.value || null, subtopicId: null }))}
        >
          <option value="">Sin cliente</option>
          {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>

        {form.clientId && (
          <SubtopicSelect
            clientId={form.clientId}
            value={form.subtopicId}
            onChange={v => setForm(f => ({ ...f, subtopicId: v }))}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Categoría</Label>
            <Select
              value={form.category ?? ''}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as IdeaCategory || undefined }))}
            >
              <option value="">Sin categoría</option>
              {IDEA_CATEGORIES.map(c => <option key={c} value={c}>{IDEA_CATEGORY_LABELS[c]}</option>)}
            </Select>
          </div>
          <div>
            <Label>Prioridad</Label>
            <Select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
            >
              <option value="baja">Baja</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </Select>
          </div>
        </div>

        {form.itemType === 'idea' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Impacto estimado</Label>
              <Select
                value={form.impactEstimated ?? ''}
                onChange={e => setForm(f => ({ ...f, impactEstimated: e.target.value as any || undefined }))}
              >
                <option value="">-</option>
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
              </Select>
            </div>
            <div>
              <Label>Esfuerzo estimado</Label>
              <Select
                value={form.effortEstimated ?? ''}
                onChange={e => setForm(f => ({ ...f, effortEstimated: e.target.value as any || undefined }))}
              >
                <option value="">-</option>
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
              </Select>
            </div>
          </div>
        )}

        <Label>Estado</Label>
        <Select
          value={form.status}
          onChange={e => setForm(f => ({ ...f, status: e.target.value as IdeaStatus }))}
        >
          {STATUS_ORDER.map(s => <option key={s} value={s}>{IDEA_STATUS_LABELS[s]}</option>)}
        </Select>

        <Label>Plazo de ejecución (fecha límite)</Label>
        <Input
          type="date"
          value={form.dueDate ?? ''}
          onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
        />

        <Label>Siguiente paso</Label>
        <Input
          value={form.nextStep ?? ''}
          onChange={e => setForm(f => ({ ...f, nextStep: e.target.value }))}
          placeholder="Ej: Investigar opciones disponibles"
        />

        <Label>Notas</Label>
        <Textarea
          value={form.notes ?? ''}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={2}
        />

        <div className="flex flex-col gap-2 mt-4">
          <Btn onClick={handleSave}>Guardar</Btn>
          <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Btn>
        </div>
      </BottomSheet>

      {/* Modal registrar horas */}
      <BottomSheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Registrar horas"
      >
        {logTarget && (
          <p className="text-sm font-medium text-stone-700 mb-3 bg-stone-50 rounded-lg px-3 py-2">
            {logTarget.title}
          </p>
        )}

        <Label>Cliente *</Label>
        <Select
          value={logForm.clientId}
          onChange={e => setLogForm(f => ({ ...f, clientId: e.target.value }))}
        >
          <option value="">Seleccionar cliente</option>
          {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Horas *</Label>
            <Input
              type="number"
              min="0.25"
              step="0.25"
              value={logForm.hours}
              onChange={e => setLogForm(f => ({ ...f, hours: e.target.value }))}
            />
          </div>
          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={logForm.date}
              onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>
        </div>

        <Label>Tarea</Label>
        <Input
          value={logForm.taskName}
          onChange={e => setLogForm(f => ({ ...f, taskName: e.target.value }))}
          placeholder="Descripción de la tarea"
        />

        <Label>Detalle (opcional)</Label>
        <Textarea
          value={logForm.detail}
          onChange={e => setLogForm(f => ({ ...f, detail: e.target.value }))}
          rows={2}
        />

        <label className="flex items-center gap-2.5 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={logForm.markDone}
            onChange={e => setLogForm(f => ({ ...f, markDone: e.target.checked }))}
            className="w-4 h-4 accent-emerald-600"
          />
          <span className="text-sm text-stone-600">Marcar tarea como implementada</span>
        </label>

        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={handleLogSave}
            disabled={logSaving}
            className="w-full py-3 rounded-xl bg-stone-800 text-white text-sm font-medium disabled:opacity-50"
          >
            {logSaving ? 'Guardando…' : 'Registrar horas'}
          </button>
          <Btn variant="ghost" onClick={() => setLogOpen(false)}>Cancelar</Btn>
        </div>
      </BottomSheet>
    </div>
  )
}
