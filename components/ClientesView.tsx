'use client'

import { useState } from 'react'
import {
  CLIENT_SERVICE_CATEGORY_LABELS,
  CLIENT_SOURCE_LABELS,
  CLIENT_STATUS_LABELS,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPES,
  INTERNAL_CLIENT_ROOT_NAME,
  clientColor,
  type Client,
  type ClientInteraction,
  type ClientInteractionInput,
  type ClientStatus,
  type HourEntry,
  type InteractionType,
} from '@/lib/types'
import { useHourEntries } from '@/lib/hooks/useHourEntries'
import { useSubtopics } from '@/lib/hooks/useSubtopics'
import { useClientInteractions } from '@/lib/hooks/useClientInteractions'
import { updateClient } from '@/lib/services/clients.service'
import { Avatar, Btn, BottomSheet, Input, Label, Select, SectionTitle, Textarea } from '@/components/ui'
import ClientModal from '@/components/modals/ClientModal'
import ClientDetailView from '@/components/ClientDetailView'

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

interface Props {
  clients: Client[]
  onDataChange: () => Promise<void> | void
  onDeleteClient: (id: string) => Promise<void> | void
}

interface CardProps {
  client: Client
  entries: HourEntry[]
  onDelete: () => void
  onDataChange: () => Promise<void> | void
  onOpenDetail: (client: Client) => void
}

const EMPTY_INTERACTION: Omit<ClientInteractionInput, 'clientId'> = {
  date: new Date().toISOString().split('T')[0],
  type: 'email',
  summary: '',
  clientResponse: '',
  nextSteps: '',
  status: 'abierto',
  priority: 'normal',
  nextActionDate: '',
  notes: '',
}

function ExternalClientCard({ client, entries, onDelete, onDataChange, onOpenDetail }: CardProps) {
  const [subtopicName, setSubtopicName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [interactionModal, setInteractionModal] = useState(false)
  const [interactionForm, setInteractionForm] = useState(EMPTY_INTERACTION)
  const [editingInteraction, setEditingInteraction] = useState<ClientInteraction | null>(null)
  const [showSubtopics, setShowSubtopics] = useState(false)

  const { subtopics, addSubtopic, removeSubtopic } = useSubtopics(client.id)
  const { interactions, loading: interLoading, addInteraction, editInteraction, removeInteraction } = useClientInteractions(client.id)

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

  function closeModal() {
    setInteractionModal(false)
    setEditingInteraction(null)
    setInteractionForm(EMPTY_INTERACTION)
  }

  const col = clientColor(client)
  const h = entries.filter(e => e.clientId === client.id).reduce((a, e) => a + e.hours, 0)
  const earned = client.rate ? h * client.rate : null
  const status = client.status ?? 'activo'
  async function handleStatusChange(newStatus: ClientStatus) {
    try { await updateClient({ ...client, status: newStatus }); await onDataChange() }
    catch (err) { alert(`Error: ${(err as Error)?.message}`) }
  }

  async function handleSaveInteraction() {
    if (!interactionForm.summary?.trim() && !interactionForm.nextSteps?.trim()) {
      alert('Ingresá al menos un resumen o próximos pasos')
      return
    }
    try {
      if (editingInteraction) {
        await editInteraction(editingInteraction.id, interactionForm)
      } else {
        await addInteraction({ ...interactionForm, clientId: client.id })
      }
      closeModal()
    } catch (err) { alert(`Error: ${(err as Error)?.message}`) }
  }

  async function handleDeleteInteraction(id: string) {
    if (!confirm('¿Eliminar esta interacción?')) return
    try { await removeInteraction(id) } catch (err) {
      alert(`Error: ${(err as Error)?.message}`)
    }
  }

  async function handleAddSubtopic() {
    if (!subtopicName.trim()) return
    try {
      await addSubtopic(subtopicName)
      setSubtopicName('')
      setShowAdd(false)
      await onDataChange()
    } catch (err) { alert(`Error: ${(err as Error)?.message ?? 'error desconocido'}`) }
  }

  async function handleDeleteSubtopic(id: string) {
    if (!confirm('¿Eliminar este subtema?')) return
    try { await removeSubtopic(id); await onDataChange() } catch (err) {
      alert(`Error: ${(err as Error)?.message}`)
    }
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl mb-3 overflow-hidden">
      {/* Header — tap para abrir legajo */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <Avatar name={client.name} bg={col.bg} fg={col.fg} />
          <button
            className="flex-1 min-w-0 text-left"
            onClick={() => onOpenDetail(client)}
          >
            <p className="text-sm font-semibold text-stone-800">{client.name}</p>
            <p className="text-xs text-stone-400 mt-0.5">
              {h.toFixed(1)} hs{client.rate ? ` · $${client.rate}/h` : ''}
              {earned !== null ? ` · $${earned.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : ''}
            </p>
          </button>
          <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">
            Eliminar
          </button>
        </div>

        {/* Estado */}
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-[10px] text-stone-400 uppercase tracking-wide">Etapa</span>
          <select
            value={status}
            onChange={e => handleStatusChange(e.target.value as ClientStatus)}
            className={`text-[11px] px-2.5 py-1 rounded-full border-0 font-medium cursor-pointer outline-none ${STATUS_BADGE[status]}`}
          >
            {(Object.keys(CLIENT_STATUS_LABELS) as ClientStatus[]).map(s => (
              <option key={s} value={s}>{CLIENT_STATUS_LABELS[s]}</option>
            ))}
          </select>
          {client.sourceType && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-500 font-medium">
              {CLIENT_SOURCE_LABELS[client.sourceType]}
            </span>
          )}
          {client.serviceCategory && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-500 font-medium">
              {CLIENT_SERVICE_CATEGORY_LABELS[client.serviceCategory]}
            </span>
          )}
          {client.nextActionDate && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
              🔁 {client.nextActionDate}
            </span>
          )}
          <button
            onClick={() => onOpenDetail(client)}
            className="ml-auto text-[10px] text-stone-400 hover:text-emerald-600 font-medium"
          >
            Ver legajo →
          </button>
        </div>
      </div>

      {/* Historial comercial (resumen) */}
      <div className="border-t border-stone-100 px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
            Historial
            {interactions.length > 0 && (
              <span className="ml-1.5 bg-stone-100 text-stone-500 rounded-full px-1.5 py-0.5">
                {interactions.length}
              </span>
            )}
          </p>
          <button
            onClick={openNewInteraction}
            className="text-[11px] text-emerald-600 font-medium hover:text-emerald-700"
          >
            + Registrar
          </button>
        </div>

        {interLoading && <p className="text-xs text-stone-300 py-2">Cargando...</p>}

        {!interLoading && interactions.length === 0 && (
          <p className="text-xs text-stone-300 pb-3">Sin interacciones registradas</p>
        )}

        {interactions.slice(0, 3).map(i => (
          <div key={i.id} className="flex items-start gap-2 py-2 border-b border-stone-50 last:border-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold text-stone-600">{INTERACTION_TYPE_LABELS[i.type]}</span>
                <span className="text-[10px] text-stone-400">{i.date}</span>
              </div>
              {i.summary && <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{i.summary}</p>}
              {i.nextActionDate && (
                <p className="text-[10px] text-amber-500 mt-0.5">📅 {i.nextActionDate}</p>
              )}
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button onClick={() => openEditInteraction(i)} className="text-[11px] text-stone-400 hover:text-stone-600">Editar</button>
              <button onClick={() => handleDeleteInteraction(i.id)} className="text-[11px] text-stone-300 hover:text-red-400">✕</button>
            </div>
          </div>
        ))}

        {interactions.length > 3 && (
          <button
            onClick={() => onOpenDetail(client)}
            className="text-[10px] text-stone-400 hover:text-emerald-600 py-2 w-full text-center"
          >
            Ver todas ({interactions.length}) →
          </button>
        )}
      </div>

      {/* Subtemas (colapsable) */}
      <div className="border-t border-stone-100 px-4 pt-3 pb-3">
        <button
          onClick={() => setShowSubtopics(v => !v)}
          className="flex items-center justify-between w-full mb-2"
        >
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
            Subtemas{subtopics.length > 0 && <span className="ml-1.5 bg-stone-100 text-stone-500 rounded-full px-1.5 py-0.5">{subtopics.length}</span>}
          </p>
          <span className="text-[10px] text-stone-400">{showSubtopics ? '▲' : '▼'}</span>
        </button>

        {showSubtopics && (
          <>
            {subtopics.map(s => {
              const subH = entries.filter(e => e.clientId === client.id && e.subtopicId === s.id).reduce((a, e) => a + e.hours, 0)
              const sCol = clientColor({ id: s.id, name: s.name, colorIndex: 2 })
              return (
                <div key={s.id} className="flex items-center gap-3 py-1.5 border-b border-stone-50 last:border-0">
                  <Avatar name={s.name} bg={sCol.bg} fg={sCol.fg} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-800">{s.name}</p>
                    <p className="text-xs text-stone-400">{subH.toFixed(1)} hs</p>
                  </div>
                  <button onClick={() => handleDeleteSubtopic(s.id)} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                </div>
              )
            })}
            {showAdd ? (
              <div className="flex gap-2 mt-2">
                <Input
                  value={subtopicName}
                  onChange={e => setSubtopicName(e.target.value)}
                  placeholder="Nombre del subtema"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddSubtopic()
                    if (e.key === 'Escape') { setShowAdd(false); setSubtopicName('') }
                  }}
                />
                <Btn onClick={handleAddSubtopic}>Agregar</Btn>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full mt-2 py-1.5 text-xs text-stone-500 hover:bg-stone-50 rounded-lg border border-stone-200"
              >
                + Agregar subtema
              </button>
            )}
          </>
        )}
      </div>

      {/* Modal interacción */}
      <BottomSheet open={interactionModal} onClose={closeModal} title={editingInteraction ? 'Editar interacción' : 'Nueva interacción'}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select
              value={interactionForm.type}
              onChange={e => setInteractionForm(f => ({ ...f, type: e.target.value as InteractionType }))}
            >
              {INTERACTION_TYPES.map(t => (
                <option key={t} value={t}>{INTERACTION_TYPE_LABELS[t]}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={interactionForm.date}
              onChange={e => setInteractionForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>
        </div>

        <Label>Resumen</Label>
        <Textarea
          value={interactionForm.summary ?? ''}
          onChange={e => setInteractionForm(f => ({ ...f, summary: e.target.value }))}
          placeholder="¿Qué se trató?"
          rows={2}
        />

        <Label>Respuesta del cliente</Label>
        <Textarea
          value={interactionForm.clientResponse ?? ''}
          onChange={e => setInteractionForm(f => ({ ...f, clientResponse: e.target.value }))}
          placeholder="¿Cómo respondió el cliente?"
          rows={2}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Prioridad</Label>
            <Select
              value={interactionForm.priority}
              onChange={e => setInteractionForm(f => ({ ...f, priority: e.target.value as any }))}
            >
              <option value="baja">Baja</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </Select>
          </div>
          <div>
            <Label>Próxima acción</Label>
            <Input
              type="date"
              value={interactionForm.nextActionDate ?? ''}
              onChange={e => setInteractionForm(f => ({ ...f, nextActionDate: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <Btn onClick={handleSaveInteraction}>Guardar</Btn>
          <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
        </div>
      </BottomSheet>
    </div>
  )
}

const ACTIVE_STATUSES    = new Set(['activo', 'confirmado', 'pausado', undefined, null])
const INACTIVE_STATUSES  = new Set(['inactivo'])
const LOST_STATUSES      = new Set(['perdido'])
const POTENTIAL_STATUSES = new Set(['lead', 'contacto_inicial', 'propuesta_enviada', 'negociacion'])

type ClientTab = 'clientes' | 'potenciales' | 'inactivos' | 'perdidos'

export default function ClientesView({ clients, onDataChange, onDeleteClient }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientTab, setClientTab] = useState<ClientTab>('clientes')
  const [subtopicName, setSubtopicName] = useState('')
  const [showAddSubtopic, setShowAddSubtopic] = useState(false)
  const { entries } = useHourEntries()

  const catalizar = clients.find(c => c.name === INTERNAL_CLIENT_ROOT_NAME)
  const { subtopics, addSubtopic, removeSubtopic } = useSubtopics(catalizar?.id ?? null)
  const allNormalClients = clients.filter(c => c.name !== INTERNAL_CLIENT_ROOT_NAME)
  const normalClients = allNormalClients.filter(c =>
    clientTab === 'clientes'    ? ACTIVE_STATUSES.has(c.status as any)
    : clientTab === 'potenciales' ? POTENTIAL_STATUSES.has(c.status as any)
    : clientTab === 'inactivos'   ? INACTIVE_STATUSES.has(c.status as any)
    : LOST_STATUSES.has(c.status as any)
  )
  const activeCount    = allNormalClients.filter(c => ACTIVE_STATUSES.has(c.status as any)).length
  const potentialCount = allNormalClients.filter(c => POTENTIAL_STATUSES.has(c.status as any)).length
  const inactivosCount = allNormalClients.filter(c => INACTIVE_STATUSES.has(c.status as any)).length
  const lostCount      = allNormalClients.filter(c => LOST_STATUSES.has(c.status as any)).length

  // Si hay un cliente seleccionado, mostrar su legajo
  if (selectedClient) {
    const fresh = clients.find(c => c.id === selectedClient.id) ?? selectedClient
    return (
      <ClientDetailView
        client={fresh}
        entries={entries}
        onBack={() => setSelectedClient(null)}
        onDataChange={onDataChange}
      />
    )
  }

  const catalizarHours = subtopics.reduce((sum, s) => {
    return sum + entries.filter(e => e.clientId === catalizar?.id && e.subtopicId === s.id).reduce((a, e) => a + e.hours, 0)
  }, 0)

  async function handleAddSubtopic() {
    if (!subtopicName.trim()) { alert('Ingresá el nombre del subtema'); return }
    try {
      await addSubtopic(subtopicName)
      setSubtopicName('')
      setShowAddSubtopic(false)
      await onDataChange()
    } catch (error) {
      alert(`Error: ${(error as Error)?.message ?? 'error desconocido'}`)
    }
  }

  async function handleDeleteSubtopic(id: string) {
    if (!confirm('¿Eliminar este subtema?')) return
    try { await removeSubtopic(id); await onDataChange() } catch (error) {
      alert(`Error: ${(error as Error)?.message ?? 'error desconocido'}`)
    }
  }

  return (
    <div className="p-4">
      {/* Área interna Catalizar */}
      {catalizar && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-3">
          <SectionTitle>Área interna</SectionTitle>
          <div className="flex items-center gap-3 py-2.5 border-b border-stone-100">
            <Avatar name={INTERNAL_CLIENT_ROOT_NAME} bg={clientColor(catalizar).bg} fg={clientColor(catalizar).fg} />
            <div className="flex-1">
              <p className="text-sm font-medium text-stone-800">{INTERNAL_CLIENT_ROOT_NAME}</p>
              <p className="text-xs text-stone-400">{catalizarHours.toFixed(1)} hs totales</p>
            </div>
          </div>

          {subtopics.map(subtopic => {
            const col = clientColor({ id: subtopic.id, name: subtopic.name, colorIndex: 2 })
            const h = entries
              .filter(e => e.clientId === catalizar?.id && e.subtopicId === subtopic.id)
              .reduce((a, e) => a + e.hours, 0)
            return (
              <div key={subtopic.id} className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0">
                <Avatar name={subtopic.name} bg={col.bg} fg={col.fg} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-800">{subtopic.name}</p>
                  <p className="text-xs text-stone-400">{h.toFixed(1)} hs</p>
                </div>
                <button onClick={() => handleDeleteSubtopic(subtopic.id)} className="text-xs text-red-600 hover:text-red-800">
                  Eliminar
                </button>
              </div>
            )
          })}

          {showAddSubtopic ? (
            <div className="flex gap-2 mt-3">
              <Input
                value={subtopicName}
                onChange={e => setSubtopicName(e.target.value)}
                placeholder="Nombre del subtema"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddSubtopic()
                  if (e.key === 'Escape') { setShowAddSubtopic(false); setSubtopicName('') }
                }}
              />
              <Btn onClick={handleAddSubtopic}>Agregar</Btn>
            </div>
          ) : (
            <button
              onClick={() => setShowAddSubtopic(true)}
              className="w-full mt-3 py-2 text-sm text-stone-600 hover:bg-stone-50 rounded-lg border border-stone-200"
            >
              + Agregar subtema
            </button>
          )}
        </div>
      )}

      {/* Tabs clientes / potenciales / inactivos / perdidos */}
      <div className="flex border border-stone-200 rounded-xl overflow-hidden mb-3 bg-white">
        {([
          { id: 'clientes',    label: 'Clientes',    count: activeCount,    activeClass: 'bg-stone-800 text-white' },
          { id: 'potenciales', label: 'Potenciales', count: potentialCount, activeClass: 'bg-stone-800 text-white' },
          { id: 'inactivos',   label: 'Inactivos',   count: inactivosCount, activeClass: 'bg-stone-500 text-white' },
          { id: 'perdidos',    label: 'Perdidos',    count: lostCount,      activeClass: 'bg-red-600 text-white' },
        ] as { id: ClientTab; label: string; count: number; activeClass: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setClientTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              clientTab === t.id ? t.activeClass : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1 text-[10px] rounded-full px-1 py-0.5 ${
                clientTab === t.id ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="mb-3">
        {!normalClients.length ? (
          <div className="bg-white border border-stone-200 rounded-xl p-6 text-center">
            <p className="text-sm text-stone-400">
              {clientTab === 'perdidos'  ? 'Sin oportunidades perdidas'
               : clientTab === 'inactivos' ? 'Sin clientes inactivos'
               : 'Agregá tu primer cliente'}
            </p>
          </div>
        ) : (
          normalClients.map(c => (
            <ExternalClientCard
              key={c.id}
              client={c}
              entries={entries}
              onDataChange={onDataChange}
              onOpenDetail={setSelectedClient}
              onDelete={async () => {
                if (!confirm(`Eliminar cliente ${c.name}? Esta acción no se puede deshacer.`)) return
                try {
                  await onDeleteClient(c.id)
                  await onDataChange()
                } catch (error) {
                  alert(`No se pudo eliminar: ${(error as Error)?.message ?? 'error desconocido'}`)
                }
              }}
            />
          ))
        )}
      </div>

      {(clientTab === 'clientes' || clientTab === 'potenciales') && (
        <Btn onClick={() => setModalOpen(true)}>+ Nuevo cliente</Btn>
      )}

      <ClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={async () => { setModalOpen(false); await onDataChange() }}
        initialStatus={clientTab === 'potenciales' ? 'lead' : 'activo'}
      />
    </div>
  )
}
