'use client'

import { useMemo, useState } from 'react'
import {
  CLIENT_SERVICE_CATEGORIES,
  CLIENT_SERVICE_CATEGORY_LABELS,
  CLIENT_SOURCE_LABELS,
  CLIENT_SOURCE_TYPES,
  CLIENT_STATUS_LABELS,
  IDEA_CATEGORY_LABELS,
  IDEA_STATUS_LABELS,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPES,
  clientColor,
  type Client,
  type ClientServiceCategory,
  type ClientSourceType,
  type ClientInteraction,
  type ClientInteractionInput,
  type ClientStatus,
  type HourEntry,
  type Idea,
  type IdeaInput,
  type IdeaItemType,
  type IdeaStatus,
  type InteractionType,
  type Priority,
} from '@/lib/types'
import { useClientInteractions } from '@/lib/hooks/useClientInteractions'
import { useSubtopics } from '@/lib/hooks/useSubtopics'
import { useIdeas } from '@/lib/hooks/useIdeas'
import { updateClient } from '@/lib/services/clients.service'
import { syncRevisitarTask } from '@/lib/services/tasks.service'
import { Avatar, Btn, BottomSheet, Input, Label, Select, Textarea } from '@/components/ui'

const STATUS_BADGE: Record<ClientStatus, string> = {
  lead:              'bg-stone-100 text-stone-500',
  contacto_inicial:  'bg-blue-50 text-blue-500',
  propuesta_enviada: 'bg-amber-50 text-amber-600',
  negociacion:       'bg-orange-50 text-orange-600',
  confirmado:        'bg-green-50 text-green-600',
  activo:            'bg-emerald-50 text-emerald-600',
  pausado:           'bg-stone-100 text-stone-400',
  inactivo:          'bg-stone-100 text-stone-400',
  perdido:           'bg-red-50 text-red-400',
}

const PRIORITY_COLORS: Record<Priority, string> = {
  baja:    'bg-stone-100 text-stone-400',
  normal:  'bg-blue-50 text-blue-500',
  alta:    'bg-amber-50 text-amber-600',
  critica: 'bg-red-50 text-red-500',
}

const IDEA_STATUS_COLORS: Record<IdeaStatus, string> = {
  nueva:        'bg-stone-100 text-stone-500',
  en_revision:  'bg-blue-50 text-blue-600',
  aprobada:     'bg-green-50 text-green-600',
  en_progreso:  'bg-amber-50 text-amber-600',
  pausada:      'bg-stone-100 text-stone-400',
  descartada:   'bg-red-50 text-red-400',
  implementada: 'bg-emerald-50 text-emerald-600',
}

const TYPE_ICONS: Record<InteractionType, string> = {
  email:                   '📧',
  llamada:                 '📞',
  whatsapp:                '💬',
  seguimiento:             '🔔',
  reunion:                 '🤝',
  revision_servicio:       '🔍',
  presupuesto:             '💰',
  aumento:                 '📈',
  propuesta_mejora:        '💡',
  reclamo:                 '⚠️',
  actualizacion_comercial: '📊',
  definicion_pendiente:    '⏳',
}

const EMPTY_INTERACTION: Omit<ClientInteractionInput, 'clientId'> = {
  date: new Date().toISOString().split('T')[0],
  type: 'reunion',
  summary: '',
  nextSteps: '',
  status: 'abierto', // kept for DB compatibility, not shown in UI
  priority: 'normal',
  nextActionDate: '',
  notes: '',
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface Props {
  client: Client
  entries: HourEntry[]
  onBack: () => void
  onDataChange: () => Promise<void> | void
}

function DescriptionField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (editing) return (
    <div className="mt-3">
      <Textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={3}
        placeholder="Rubro, contexto, necesidades..."
        className="text-xs"
      />
      <div className="flex gap-2 mt-1.5">
        <button onClick={() => { onSave(draft); setEditing(false) }}
          className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700">Guardar</button>
        <button onClick={() => { setDraft(value); setEditing(false) }}
          className="text-[11px] text-stone-400 hover:text-stone-600">Cancelar</button>
      </div>
    </div>
  )

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      className="mt-3 w-full text-left"
    >
      {value ? (
        <p className="text-xs text-stone-500 leading-relaxed">{value}</p>
      ) : (
        <p className="text-[11px] text-stone-300 italic">+ Agregar descripción</p>
      )}
    </button>
  )
}

function ContactSection({ client, onSave }: {
  client: Client
  onSave: (fields: Partial<Client>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName]     = useState(client.contactName ?? '')
  const [role, setRole]     = useState(client.contactPosition ?? '')
  const [email, setEmail]   = useState(client.contactEmail ?? '')
  const [phone, setPhone]   = useState(client.contactPhone ?? '')
  const [web, setWeb]       = useState(client.website ?? '')

  async function handleSave() {
    await onSave({
      contactName: name.trim() || undefined,
      contactPosition: role.trim() || undefined,
      contactEmail: email.trim() || undefined,
      contactPhone: phone.trim() || undefined,
      website: web.trim() || undefined,
    })
    setEditing(false)
  }

  const hasData = client.contactName || client.contactPosition || client.contactEmail || client.contactPhone || client.website

  if (!editing) return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Contacto</p>
        <button onClick={() => { setName(client.contactName ?? ''); setRole(client.contactPosition ?? ''); setEmail(client.contactEmail ?? ''); setPhone(client.contactPhone ?? ''); setWeb(client.website ?? ''); setEditing(true) }}
          className="text-[11px] text-stone-400 hover:text-emerald-600">
          {hasData ? 'Editar' : '+ Agregar'}
        </button>
      </div>
      {hasData ? (
        <div className="space-y-1.5">
          {client.contactName && (
            <p className="text-xs text-stone-700 font-medium">
              {client.contactName}
              {client.contactPosition && <span className="text-stone-400 font-normal"> · {client.contactPosition}</span>}
            </p>
          )}
          {client.contactEmail && <a href={`mailto:${client.contactEmail}`} className="block text-xs text-sky-500">{client.contactEmail}</a>}
          {client.contactPhone && <a href={`tel:${client.contactPhone}`} className="block text-xs text-stone-500">{client.contactPhone}</a>}
          {client.website      && <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer" className="block text-xs text-sky-500">{client.website}</a>}
        </div>
      ) : (
        <p className="text-[11px] text-stone-300 italic">Sin datos de contacto</p>
      )}
    </div>
  )

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Contacto</p>
      <div className="space-y-2">
        <Input value={name}  onChange={e => setName(e.target.value)}  placeholder="Nombre del contacto" />
        <Input value={role}  onChange={e => setRole(e.target.value)}  placeholder="Rol / función" />
        <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" />
        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Celular / WhatsApp" />
        <Input value={web}   onChange={e => setWeb(e.target.value)}   placeholder="Página web" />
      </div>
      <div className="flex gap-3 mt-3">
        <button onClick={handleSave} className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700">Guardar</button>
        <button onClick={() => setEditing(false)} className="text-[11px] text-stone-400 hover:text-stone-600">Cancelar</button>
      </div>
    </div>
  )
}

export default function ClientDetailView({ client, entries, onBack, onDataChange }: Props) {
  const col = clientColor(client)
  const { interactions, loading: interLoading, addInteraction, editInteraction, removeInteraction } =
    useClientInteractions(client.id)
  const { subtopics } = useSubtopics(client.id)
  const { ideas, addIdea, editIdea } = useIdeas()

  const isActive = ['activo', 'confirmado', 'pausado', 'inactivo'].includes(client.status ?? '')

  const [interactionModal, setInteractionModal] = useState(false)
  const [editingInteraction, setEditingInteraction] = useState<ClientInteraction | null>(null)
  const [interactionForm, setInteractionForm] = useState(EMPTY_INTERACTION)
  const [notesEdit, setNotesEdit] = useState(false)
  const [notesValue, setNotesValue] = useState(client.notes ?? '')
  const [filterType, setFilterType] = useState<InteractionType | 'todas'>('todas')
  const [ideaModal, setIdeaModal] = useState(false)
  const [ideaItemType, setIdeaItemType] = useState<IdeaItemType>('backlog')
  const [ideaForm, setIdeaForm] = useState<Partial<IdeaInput>>({})
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null)

  const status = client.status ?? 'activo'
  const clientEntries = entries.filter(e => e.clientId === client.id)
  const totalHours = clientEntries.reduce((a, e) => a + e.hours, 0)
  const earned = client.rate ? totalHours * client.rate : null

  // Últimos 6 meses de horas
  const monthlyHours = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const y = d.getFullYear()
      const m = d.getMonth()
      const hs = clientEntries
        .filter(e => {
          const ed = new Date(e.date)
          return ed.getFullYear() === y && ed.getMonth() === m
        })
        .reduce((a, e) => a + e.hours, 0)
      return { label: MONTH_NAMES[m], year: y, month: m, hours: hs }
    })
  }, [clientEntries])

  const maxHours = Math.max(...monthlyHours.map(m => m.hours), 1)

  // Ideas/backlog de este cliente
  const clientIdeas = ideas.filter(i => i.clientId === client.id && i.itemType === 'idea')
  const clientBacklog = ideas.filter(i => i.clientId === client.id && i.itemType === 'backlog')

  const nextAction = interactions
    .filter(i => i.nextActionDate)
    .sort((a, b) => (a.nextActionDate! > b.nextActionDate! ? 1 : -1))[0]

  const filteredInteractions = interactions.filter(i => filterType === 'todas' || i.type === filterType)

  // Handlers - status & notes
  async function handleStatusChange(newStatus: ClientStatus) {
    try { await updateClient({ ...client, status: newStatus }); await onDataChange() }
    catch (err) { alert(`Error: ${(err as Error)?.message}`) }
  }

  async function handleSourceChange(newSource: ClientSourceType | '') {
    try {
      await updateClient({ ...client, sourceType: newSource || undefined })
      await onDataChange()
    } catch (err) { alert(`Error: ${(err as Error)?.message}`) }
  }

  async function handleServiceCategoryChange(val: ClientServiceCategory | '') {
    try {
      await updateClient({ ...client, serviceCategory: val || undefined })
      await onDataChange()
    } catch (err) { alert(`Error: ${(err as Error)?.message}`) }
  }

  async function handleDescriptionChange(val: string) {
    try {
      await updateClient({ ...client, description: val || undefined })
      await onDataChange()
    } catch (err) { alert(`Error: ${(err as Error)?.message}`) }
  }

  async function handleFollowUpChange(date: string) {
    try {
      await updateClient({ ...client, nextActionDate: date || undefined })
      await syncRevisitarTask(client.name, date || undefined)
      await onDataChange()
    } catch (err) { alert(`Error: ${(err as Error)?.message}`) }
  }

  async function handleSaveNotes() {
    try { await updateClient({ ...client, notes: notesValue }); setNotesEdit(false); await onDataChange() }
    catch (err) { alert(`Error: ${(err as Error)?.message}`) }
  }

  // Handlers - interactions
  function openNewInteraction() {
    setEditingInteraction(null)
    setInteractionForm(EMPTY_INTERACTION)
    setInteractionModal(true)
  }

  function openEditInteraction(i: ClientInteraction) {
    setEditingInteraction(i)
    setInteractionForm({
      date: i.date, type: i.type, summary: i.summary ?? '',
      nextSteps: i.nextSteps ?? '', status: i.status, priority: i.priority,
      nextActionDate: i.nextActionDate ?? '', notes: i.notes ?? '',
    })
    setInteractionModal(true)
  }

  async function handleSaveInteraction() {
    if (!interactionForm.summary?.trim() && !interactionForm.nextSteps?.trim()) {
      alert('Ingresá al menos un resumen o próximos pasos'); return
    }
    try {
      editingInteraction
        ? await editInteraction(editingInteraction.id, interactionForm)
        : await addInteraction({ ...interactionForm, clientId: client.id })
      setInteractionModal(false)
    } catch (err) { alert(`Error: ${(err as Error)?.message}`) }
  }

  async function handleDeleteInteraction(id: string) {
    if (!confirm('¿Eliminar esta interacción?')) return
    try { await removeInteraction(id) } catch (err) { alert(`Error: ${(err as Error)?.message}`) }
  }

  // Handlers - ideas
  function openNewIdea(type: IdeaItemType) {
    setEditingIdea(null)
    setIdeaItemType(type)
    setIdeaForm({ title: '', status: 'nueva', priority: 'normal' })
    setIdeaModal(true)
  }

  function openEditIdea(idea: Idea) {
    setEditingIdea(idea)
    setIdeaItemType(idea.itemType)
    setIdeaForm({ title: idea.title, status: idea.status, priority: idea.priority, dueDate: idea.dueDate ?? '', nextStep: idea.nextStep ?? '', notes: idea.notes ?? '' })
    setIdeaModal(true)
  }

  async function handleSaveIdea() {
    if (!ideaForm.title?.trim()) { alert('Ingresá un título'); return }
    try {
      if (editingIdea) {
        await editIdea(editingIdea.id, { ...ideaForm, itemType: ideaItemType })
      } else {
        await addIdea({ ...ideaForm, itemType: ideaItemType, clientId: client.id, status: ideaForm.status ?? 'nueva', priority: ideaForm.priority ?? 'normal', title: ideaForm.title! })
      }
      setIdeaModal(false)
    } catch (err) { alert(`Error: ${(err as Error)?.message}`) }
  }

  async function cycleIdeaStatus(idea: Idea) {
    const order: IdeaStatus[] = ['nueva','en_revision','aprobada','en_progreso','pausada','descartada','implementada']
    const next = order[(order.indexOf(idea.status) + 1) % order.length]
    try { await editIdea(idea.id, { status: next }) } catch {}
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 bg-stone-50 z-10 px-4 pt-3 pb-2 border-b border-stone-100">
        <button onClick={onBack} className="text-xs text-stone-500 hover:text-stone-700 mb-3 block">
          ← Volver a clientes
        </button>
        <div className="flex items-center gap-3">
          <Avatar name={client.name} bg={col.bg} fg={col.fg} />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-stone-800">{client.name}</p>
            <p className="text-xs text-stone-400">
              {totalHours.toFixed(1)} hs total
              {client.rate ? ` · $${client.rate}/h` : ''}
              {earned !== null ? ` · $${earned.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Estado comercial */}
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-2">Etapa comercial</p>
          <select
            value={status}
            onChange={e => handleStatusChange(e.target.value as ClientStatus)}
            className={`text-[12px] px-3 py-1.5 rounded-full border-0 font-semibold cursor-pointer outline-none ${STATUS_BADGE[status]}`}
          >
            {(Object.keys(CLIENT_STATUS_LABELS) as ClientStatus[]).map(s => (
              <option key={s} value={s}>{CLIENT_STATUS_LABELS[s]}</option>
            ))}
          </select>

          {/* Origen */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-stone-400 uppercase tracking-wide">Origen</span>
            <select
              value={client.sourceType ?? ''}
              onChange={e => handleSourceChange(e.target.value as ClientSourceType | '')}
              className="text-[11px] px-2 py-1 rounded-lg border border-stone-200 text-stone-600 bg-white outline-none cursor-pointer"
            >
              <option value="">Sin definir</option>
              {CLIENT_SOURCE_TYPES.map(s => (
                <option key={s} value={s}>{CLIENT_SOURCE_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Servicio buscado */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-stone-400 uppercase tracking-wide">Servicio</span>
            <select
              value={client.serviceCategory ?? ''}
              onChange={e => handleServiceCategoryChange(e.target.value as ClientServiceCategory | '')}
              className="text-[11px] px-2 py-1 rounded-lg border border-stone-200 text-stone-600 bg-white outline-none cursor-pointer"
            >
              <option value="">Sin definir</option>
              {CLIENT_SERVICE_CATEGORIES.map(c => (
                <option key={c} value={c}>{CLIENT_SERVICE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <DescriptionField
            value={client.description ?? ''}
            onSave={handleDescriptionChange}
          />

          {/* Revisitar en (follow-up para perdidos/potenciales) */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-stone-400 uppercase tracking-wide">Revisitar</span>
            <input
              type="date"
              value={client.nextActionDate ?? ''}
              onChange={e => handleFollowUpChange(e.target.value)}
              className="text-[11px] px-2 py-1 rounded-lg border border-stone-200 text-stone-600 bg-white outline-none cursor-pointer"
            />
            {client.nextActionDate && (
              <button
                onClick={() => handleFollowUpChange('')}
                className="text-[10px] text-stone-300 hover:text-red-400"
                title="Quitar fecha"
              >✕</button>
            )}
          </div>

          {nextAction && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2">
              <span className="text-sm">📅</span>
              <div>
                <p className="text-[11px] font-semibold text-amber-700">Próxima acción pendiente</p>
                <p className="text-xs text-amber-600">{nextAction.nextActionDate} — {INTERACTION_TYPE_LABELS[nextAction.type]}</p>
                {nextAction.nextSteps && <p className="text-xs text-amber-500 mt-0.5">{nextAction.nextSteps}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Contacto */}
        <ContactSection client={client} onSave={async (fields) => {
          await updateClient({ ...client, ...fields })
          await onDataChange()
        }} />

        {isActive && (<>
        {/* Horas últimos 6 meses */}
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-3">
            Horas — últimos 6 meses
          </p>
          <div className="flex items-end gap-1.5 h-16">
            {monthlyHours.map(m => (
              <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-[9px] text-stone-400">{m.hours > 0 ? m.hours.toFixed(1) : ''}</p>
                <div className="w-full flex items-end" style={{ height: '40px' }}>
                  <div
                    className={`w-full rounded-t-sm transition-all ${m.hours > 0 ? 'bg-emerald-400' : 'bg-stone-100'}`}
                    style={{ height: `${Math.max((m.hours / maxHours) * 100, m.hours > 0 ? 8 : 100)}%` }}
                  />
                </div>
                <p className="text-[9px] text-stone-400">{m.label}</p>
              </div>
            ))}
          </div>
          {client.rate && (
            <p className="text-[10px] text-stone-400 mt-2 text-right">
              Total período: ${(monthlyHours.reduce((a, m) => a + m.hours, 0) * client.rate).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </p>
          )}
        </div>

        {/* Notas */}
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Notas del cliente</p>
            {!notesEdit && (
              <button onClick={() => setNotesEdit(true)} className="text-[11px] text-stone-400 hover:text-stone-600">Editar</button>
            )}
          </div>
          {notesEdit ? (
            <>
              <Textarea value={notesValue} onChange={e => setNotesValue(e.target.value)} rows={3} placeholder="Contexto, acuerdos, condiciones especiales..." />
              <div className="flex gap-2 mt-2">
                <Btn onClick={handleSaveNotes}>Guardar</Btn>
                <Btn variant="ghost" onClick={() => { setNotesEdit(false); setNotesValue(client.notes ?? '') }}>Cancelar</Btn>
              </div>
            </>
          ) : (
            <p className="text-sm text-stone-600 whitespace-pre-wrap min-h-[20px]">
              {client.notes || <span className="text-stone-300 italic">Sin notas</span>}
            </p>
          )}
        </div>

        {/* Subtemas */}
        {subtopics.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Subtemas</p>
            {subtopics.map(s => {
              const h = entries.filter(e => e.clientId === client.id && e.subtopicId === s.id).reduce((a, e) => a + e.hours, 0)
              const sc = clientColor({ id: s.id, name: s.name, colorIndex: 2 })
              return (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0">
                  <Avatar name={s.name} bg={sc.bg} fg={sc.fg} size="sm" />
                  <p className="flex-1 text-sm text-stone-700">{s.name}</p>
                  <p className="text-xs text-stone-400">{h.toFixed(1)} hs</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Backlog del cliente */}
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">
              ⚡ Backlog
              {clientBacklog.length > 0 && <span className="ml-1.5 bg-stone-100 text-stone-500 rounded-full px-1.5 py-0.5">{clientBacklog.length}</span>}
            </p>
            <button onClick={() => openNewIdea('backlog')} className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700">+ Agregar</button>
          </div>
          {clientBacklog.length === 0 ? (
            <p className="text-xs text-stone-300 text-center py-5 px-4">Sin tareas en el backlog</p>
          ) : (
            clientBacklog.map(idea => (
              <div key={idea.id} className="px-4 py-2.5 border-t border-stone-50 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-700 font-medium leading-snug">{idea.title}</p>
                  {idea.nextStep && <p className="text-xs text-stone-400 mt-0.5">→ {idea.nextStep}</p>}
                  <div className="flex gap-1.5 mt-1 text-[10px] text-stone-400 flex-wrap">
                    <span>Cargado: {idea.createdAt.split('T')[0]}</span>
                    {idea.dueDate && (
                      <span className={`font-medium ${idea.dueDate < new Date().toISOString().split('T')[0] ? 'text-red-400' : 'text-amber-500'}`}>
                        · Plazo: {idea.dueDate}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <button onClick={() => cycleIdeaStatus(idea)} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${IDEA_STATUS_COLORS[idea.status]}`}>
                      {IDEA_STATUS_LABELS[idea.status]}
                    </button>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[idea.priority]}`}>{idea.priority}</span>
                    {idea.category && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-400">{IDEA_CATEGORY_LABELS[idea.category]}</span>}
                  </div>
                </div>
                <button onClick={() => openEditIdea(idea)} className="text-[11px] text-stone-400 hover:text-stone-600 flex-shrink-0">Editar</button>
              </div>
            ))
          )}
        </div>

        {/* Ideas del cliente */}
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">
              💡 Ideas
              {clientIdeas.length > 0 && <span className="ml-1.5 bg-stone-100 text-stone-500 rounded-full px-1.5 py-0.5">{clientIdeas.length}</span>}
            </p>
            <button onClick={() => openNewIdea('idea')} className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700">+ Agregar</button>
          </div>
          {clientIdeas.length === 0 ? (
            <p className="text-xs text-stone-300 text-center py-5 px-4">Sin ideas registradas para este cliente</p>
          ) : (
            clientIdeas.map(idea => (
              <div key={idea.id} className="px-4 py-2.5 border-t border-stone-50 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-700 font-medium leading-snug">{idea.title}</p>
                  {idea.description && <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{idea.description}</p>}
                  <div className="flex gap-1.5 mt-1 text-[10px] text-stone-400 flex-wrap">
                    <span>Cargado: {idea.createdAt.split('T')[0]}</span>
                    {idea.dueDate && (
                      <span className={`font-medium ${idea.dueDate < new Date().toISOString().split('T')[0] ? 'text-red-400' : 'text-amber-500'}`}>
                        · Plazo: {idea.dueDate}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <button onClick={() => cycleIdeaStatus(idea)} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${IDEA_STATUS_COLORS[idea.status]}`}>
                      {IDEA_STATUS_LABELS[idea.status]}
                    </button>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[idea.priority]}`}>{idea.priority}</span>
                  </div>
                </div>
                <button onClick={() => openEditIdea(idea)} className="text-[11px] text-stone-400 hover:text-stone-600 flex-shrink-0">Editar</button>
              </div>
            ))
          )}
        </div>
        </>)}

        {/* Historial comercial */}
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">
              Historial comercial
              {interactions.length > 0 && <span className="ml-1.5 bg-stone-100 text-stone-500 rounded-full px-1.5 py-0.5 text-[10px]">{interactions.length}</span>}
            </p>
            <button onClick={openNewInteraction} className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700">+ Registrar</button>
          </div>

          <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto">
            <button onClick={() => setFilterType('todas')} className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium ${filterType === 'todas' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500'}`}>Todas</button>
            {INTERACTION_TYPES.map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium ${filterType === t ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500'}`}>
                {TYPE_ICONS[t]} {INTERACTION_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {interLoading && <p className="text-xs text-stone-300 text-center py-6">Cargando...</p>}
          {!interLoading && filteredInteractions.length === 0 && (
            <p className="text-xs text-stone-300 text-center py-8 px-4">
              {interactions.length === 0 ? 'Registrá la primera interacción' : 'Sin resultados para este filtro'}
            </p>
          )}

          {filteredInteractions.map(i => (
            <div key={i.id} className="px-4 py-3 border-t border-stone-50">
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5">{TYPE_ICONS[i.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-stone-700">{INTERACTION_TYPE_LABELS[i.type]}</span>
                    <span className="text-[10px] text-stone-400">{i.date}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[i.priority]}`}>{i.priority}</span>
                  </div>
                  {i.summary && <p className="text-xs text-stone-600 mt-1">{i.summary}</p>}
                  {i.nextSteps && <p className="text-xs text-stone-400 mt-1">→ {i.nextSteps}</p>}
                  {i.nextActionDate && <p className="text-[10px] text-amber-500 mt-1">📅 Acción: {i.nextActionDate}</p>}
                  {i.notes && <p className="text-[10px] text-stone-400 mt-1 italic">{i.notes}</p>}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => openEditInteraction(i)} className="text-[11px] text-stone-400 hover:text-stone-600">Editar</button>
                  <button onClick={() => handleDeleteInteraction(i.id)} className="text-[11px] text-stone-300 hover:text-red-400">Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Modal interacción */}
      <BottomSheet open={interactionModal} onClose={() => setInteractionModal(false)} title={editingInteraction ? 'Editar interacción' : 'Nueva interacción'}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={interactionForm.type} onChange={e => setInteractionForm(f => ({ ...f, type: e.target.value as InteractionType }))}>
              {INTERACTION_TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {INTERACTION_TYPE_LABELS[t]}</option>)}
            </Select>
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={interactionForm.date} onChange={e => setInteractionForm(f => ({ ...f, date: e.target.value }))} />
          </div>
        </div>
        <Label>Resumen</Label>
        <Textarea value={interactionForm.summary ?? ''} onChange={e => setInteractionForm(f => ({ ...f, summary: e.target.value }))} placeholder="¿Qué se trató?" rows={3} />
        <Label>Próximos pasos</Label>
        <Textarea value={interactionForm.nextSteps ?? ''} onChange={e => setInteractionForm(f => ({ ...f, nextSteps: e.target.value }))} placeholder="¿Qué queda pendiente?" rows={2} />
        <Label>Prioridad</Label>
        <Select value={interactionForm.priority} onChange={e => setInteractionForm(f => ({ ...f, priority: e.target.value as any }))}>
          <option value="baja">Baja</option><option value="normal">Normal</option>
          <option value="alta">Alta</option><option value="critica">Crítica</option>
        </Select>
        <Label>Próxima acción (fecha)</Label>
        <Input type="date" value={interactionForm.nextActionDate ?? ''} onChange={e => setInteractionForm(f => ({ ...f, nextActionDate: e.target.value }))} />
        <Label>Notas internas</Label>
        <Textarea value={interactionForm.notes ?? ''} onChange={e => setInteractionForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Contexto adicional..." />
        <div className="flex flex-col gap-2 mt-4">
          <Btn onClick={handleSaveInteraction}>Guardar</Btn>
          <Btn variant="ghost" onClick={() => setInteractionModal(false)}>Cancelar</Btn>
        </div>
      </BottomSheet>

      {/* Modal idea/backlog */}
      <BottomSheet open={ideaModal} onClose={() => setIdeaModal(false)} title={editingIdea ? 'Editar' : `Nueva ${ideaItemType === 'backlog' ? 'tarea' : 'idea'}`}>
        <Label>Título *</Label>
        <Input value={ideaForm.title ?? ''} onChange={e => setIdeaForm(f => ({ ...f, title: e.target.value }))} placeholder={ideaItemType === 'backlog' ? 'Ej: Preparar informe mensual' : 'Ej: Integrar con Google Sheets'} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Prioridad</Label>
            <Select value={ideaForm.priority ?? 'normal'} onChange={e => setIdeaForm(f => ({ ...f, priority: e.target.value as Priority }))}>
              <option value="baja">Baja</option><option value="normal">Normal</option>
              <option value="alta">Alta</option><option value="critica">Crítica</option>
            </Select>
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={ideaForm.status ?? 'nueva'} onChange={e => setIdeaForm(f => ({ ...f, status: e.target.value as IdeaStatus }))}>
              <option value="nueva">Nueva</option><option value="en_revision">En revisión</option>
              <option value="aprobada">Aprobada</option><option value="en_progreso">En progreso</option>
              <option value="pausada">Pausada</option>
            </Select>
          </div>
        </div>
        <Label>Plazo de ejecución</Label>
        <Input type="date" value={ideaForm.dueDate ?? ''} onChange={e => setIdeaForm(f => ({ ...f, dueDate: e.target.value }))} />

        <Label>Siguiente paso</Label>
        <Input value={ideaForm.nextStep ?? ''} onChange={e => setIdeaForm(f => ({ ...f, nextStep: e.target.value }))} placeholder="Ej: Definir alcance" />
        <Label>Notas</Label>
        <Textarea value={ideaForm.notes ?? ''} onChange={e => setIdeaForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
        <div className="flex flex-col gap-2 mt-4">
          <Btn onClick={handleSaveIdea}>Guardar</Btn>
          <Btn variant="ghost" onClick={() => setIdeaModal(false)}>Cancelar</Btn>
        </div>
      </BottomSheet>
    </div>
  )
}
