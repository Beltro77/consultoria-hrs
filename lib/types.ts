// ─── Task types for hour entries ────────────────────────────────────────────
export type EntryTaskType =
  | 'Visita onsite'
  | 'Reunión'
  | 'Presentación'
  | 'Análisis'
  | 'Atención de consultas'
  | 'Otro'

export const ENTRY_TASK_TYPES: EntryTaskType[] = [
  'Visita onsite', 'Reunión', 'Presentación',
  'Análisis', 'Atención de consultas', 'Otro',
]

export const ENTRY_TASK_COLORS: Record<EntryTaskType, string> = {
  'Visita onsite':         '#1D9E75',
  'Reunión':               '#378ADD',
  'Presentación':          '#EF9F27',
  'Análisis':              '#D4537E',
  'Atención de consultas': '#7F77DD',
  'Otro':                  '#E24B4A',
}

// ─── Task status ─────────────────────────────────────────────────────────────
export type TaskStatus = 'pendiente' | 'en ejecución' | 'realizada'
export const TASK_STATUS_CYCLE: TaskStatus[] = ['pendiente', 'en ejecución', 'realizada']

// ─── Recurrence types ────────────────────────────────────────────────────────
export type RecurType =
  | 'monthly-start'
  | 'monthly-end'
  | 'monthly-day'
  | 'weekly'
  | 'monthly-first-weekday'   // primer lunes/martes/etc del mes
  | 'monthly-last-weekday'    // último lunes/martes/etc del mes
  | 'monthly-last-bizday'     // último día hábil del mes

// ─── Data models ─────────────────────────────────────────────────────────────
export type ClientStatus =
  | 'lead' | 'contacto_inicial' | 'propuesta_enviada' | 'negociacion'
  | 'confirmado' | 'activo' | 'pausado' | 'inactivo' | 'perdido'

export type ClientSourceType =
  | 'recomendacion' | 'contacto_propio' | 'web' | 'marketing_web'
  | 'linkedin' | 'via_cliente' | 'otro'

export const CLIENT_SOURCE_LABELS: Record<ClientSourceType, string> = {
  recomendacion:  'Recomendación',
  contacto_propio: 'Contacto propio',
  web:            'Web',
  marketing_web:  'Marketing web',
  linkedin:       'LinkedIn',
  via_cliente:    'Vía cliente',
  otro:           'Otro',
}

export const CLIENT_SOURCE_TYPES: ClientSourceType[] = [
  'recomendacion', 'contacto_propio', 'web', 'marketing_web', 'linkedin', 'via_cliente', 'otro',
]

export type ClientServiceCategory =
  | 'iso9001'
  | 'auditoria_interna'
  | 'upgrade_iso2026'
  | 'apps'

export const CLIENT_SERVICE_CATEGORY_LABELS: Record<ClientServiceCategory, string> = {
  iso9001:          'Implementación ISO 9001',
  auditoria_interna: 'Auditoría interna',
  upgrade_iso2026:  'Upgrade ISO 2026',
  apps:             'APPs',
}

export const CLIENT_SERVICE_CATEGORIES: ClientServiceCategory[] = [
  'iso9001', 'auditoria_interna', 'upgrade_iso2026', 'apps',
]

export interface Client {
  id: string
  name: string
  rate?: number        // USD per hour
  colorIndex: number
  status?: ClientStatus
  sourceType?: ClientSourceType
  description?: string
  serviceCategory?: ClientServiceCategory
  notes?: string
  sinceDate?: string   // YYYY-MM-DD
  nextActionDate?: string
  contactName?: string
  contactPosition?: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  createdAt?: string   // ISO timestamp when the client was created
}

export type ClientInput = Omit<Client, 'id'> & {
  id?: string
}

// ─── Client interactions ──────────────────────────────────────────────────────
export type InteractionType =
  | 'reunion' | 'revision_servicio' | 'presupuesto' | 'aumento'
  | 'propuesta_mejora' | 'reclamo' | 'actualizacion_comercial' | 'definicion_pendiente'
  | 'email' | 'llamada' | 'whatsapp' | 'seguimiento'

export type InteractionStatus = 'abierto' | 'cerrado'
export type Priority = 'baja' | 'normal' | 'alta' | 'critica'

export interface ClientInteraction {
  id: string
  clientId: string
  date: string          // YYYY-MM-DD
  type: InteractionType
  summary?: string
  clientResponse?: string
  nextSteps?: string
  status: InteractionStatus
  priority: Priority
  nextActionDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type ClientInteractionInput = Omit<ClientInteraction, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
}

export const INTERACTION_TYPES: InteractionType[] = [
  'email', 'llamada', 'whatsapp', 'seguimiento',
  'reunion', 'revision_servicio', 'presupuesto', 'aumento',
  'propuesta_mejora', 'reclamo', 'actualizacion_comercial', 'definicion_pendiente',
]

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  email:                   'Email',
  llamada:                 'Llamada',
  whatsapp:                'WhatsApp',
  seguimiento:             'Seguimiento',
  reunion:                 'Reunión',
  revision_servicio:       'Revisión de servicio',
  presupuesto:             'Presupuesto',
  aumento:                 'Aumento',
  propuesta_mejora:        'Propuesta de mejora',
  reclamo:                 'Reclamo',
  actualizacion_comercial: 'Actualización comercial',
  definicion_pendiente:    'Definición pendiente',
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  lead:               'Lead',
  contacto_inicial:   'Contacto inicial',
  propuesta_enviada:  'Propuesta enviada',
  negociacion:        'Negociación',
  confirmado:         'Confirmado',
  activo:             'Activo',
  pausado:            'Pausado',
  inactivo:           'Inactivo',
  perdido:            'Perdido',
}

// ─── Ideas & Backlog ──────────────────────────────────────────────────────────
export type IdeaItemType = 'idea' | 'backlog'

export const IDEA_ITEM_TYPE_LABELS: Record<IdeaItemType, string> = {
  idea:    'Idea',
  backlog: 'Backlog',
}

export type IdeaCategory =
  | 'app_nueva' | 'mejora_app' | 'automatizacion' | 'ia'
  | 'proceso_interno' | 'servicio_nuevo' | 'contenido' | 'tecnico'

export type IdeaStatus =
  | 'nueva' | 'en_revision' | 'aprobada' | 'en_progreso'
  | 'pausada' | 'descartada' | 'implementada'

export type ImpactLevel = 'bajo' | 'medio' | 'alto'

export interface Idea {
  id: string
  itemType: IdeaItemType
  clientId?: string | null
  subtopicId?: string | null
  title: string
  description?: string
  category?: IdeaCategory
  impactEstimated?: ImpactLevel
  effortEstimated?: ImpactLevel
  priority: Priority
  status: IdeaStatus
  dueDate?: string       // YYYY-MM-DD — plazo de ejecución
  nextStep?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type IdeaInput = Omit<Idea, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
}

export const IDEA_CATEGORIES: IdeaCategory[] = [
  'app_nueva', 'mejora_app', 'automatizacion', 'ia',
  'proceso_interno', 'servicio_nuevo', 'contenido', 'tecnico',
]

export const IDEA_CATEGORY_LABELS: Record<IdeaCategory, string> = {
  app_nueva:        'App nueva',
  mejora_app:       'Mejora de app',
  automatizacion:   'Automatización',
  ia:               'IA',
  proceso_interno:  'Proceso interno',
  servicio_nuevo:   'Servicio nuevo',
  contenido:        'Contenido',
  tecnico:          'Técnico',
}

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  nueva:        'Nueva',
  en_revision:  'En revisión',
  aprobada:     'Aprobada',
  en_progreso:  'En progreso',
  pausada:      'Pausada',
  descartada:   'Descartada',
  implementada: 'Implementada',
}

export type EntryType = 'operativo' | 'comercial'

export interface HourEntry {
  id: string
  clientId: string
  subtopicId?: string | null
  taskId?: string | null
  taskName?: string
  task?: string
  detail?: string
  hours: number
  date: string         // YYYY-MM-DD
  entryType?: EntryType
  createdAt: string
}

export type HourEntryInput = Omit<HourEntry, 'id' | 'createdAt'> & {
  id?: string
  createdAt?: string
}

export interface Subtopic {
  id: string
  name: string
  clientId: string
  createdAt: string
}

export type SubtopicInput = Omit<Subtopic, 'id' | 'createdAt'> & {
  id?: string
  createdAt?: string
}

export interface Task {
  id: string
  title: string
  desc?: string
  date: string         // current effective date (may roll forward)
  originalDate: string // date it was created/scheduled for
  status: TaskStatus
  type: 'puntual' | 'recurrente'
  recurDefId?: string
  createdAt: string
}

export type TaskInput = Omit<Task, 'id' | 'createdAt'> & {
  id?: string
  createdAt?: string
}

export interface RecurDef {
  id: string
  title: string
  desc?: string
  type: RecurType
  day?: number         // for monthly-day
  weekday?: number     // 0-6 for weekly
  startDate: string    // YYYY-MM-DD, earliest date to generate
  active: boolean
  createdAt: string
  updatedAt: string
}

export type RecurDefInput = Omit<RecurDef, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
  createdAt?: string
}

// ─── Internal client presets ─────────────────────────────────────────────────────
export const INTERNAL_CLIENT_ROOT_NAME = 'Catalizar'

export const INTERNAL_CLIENT_PRESETS: Array<Omit<Client, 'id'>> = [
  { name: 'Catalizar', colorIndex: 4 },
]

export const INTERNAL_CLIENT_SUBTOPICS = ['Administración', 'Desarrollo', 'Marketing', 'Comercial'] as const

// Reserved names that cannot be used for regular clients
export const INTERNAL_CLIENT_NAME_ALIASES = new Set([
  INTERNAL_CLIENT_ROOT_NAME,
  ...INTERNAL_CLIENT_SUBTOPICS,
])

export function isReservedClientName(name: string) {
  return INTERNAL_CLIENT_NAME_ALIASES.has(name)
}

// ─── Color palette ───────────────────────────────────────────────────────────
export const COLORS = [
  { bg: '#E1F5EE', fg: '#0F6E56', dot: '#1D9E75', label: 'Verde'   },
  { bg: '#E6F1FB', fg: '#185FA5', dot: '#378ADD', label: 'Azul'    },
  { bg: '#FAEEDA', fg: '#854F0B', dot: '#EF9F27', label: 'Ámbar'   },
  { bg: '#FBEAF0', fg: '#993556', dot: '#D4537E', label: 'Rosa'    },
  { bg: '#EEEDFE', fg: '#3C3489', dot: '#7F77DD', label: 'Violeta' },
  { bg: '#FCEBEB', fg: '#A32D2D', dot: '#E24B4A', label: 'Rojo'    },
] as const

export function clientColor(c: Client | undefined) {
  if (!c) return COLORS[0]
  return COLORS[c.colorIndex] ?? COLORS[0]
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function toDateStr(d: Date): string {
  return (
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

export function todayStr(): string { return toDateStr(new Date()) }

export function isWeekend(s: string): boolean {
  const d = new Date(s + 'T12:00:00').getDay()
  return d === 0 || d === 6
}

export function nextWorkday(s: string): string {
  const d = new Date(s + 'T12:00:00')
  do { d.setDate(d.getDate() + 1) } while (isWeekend(toDateStr(d)))
  return toDateStr(d)
}

/** Date a pending task should appear on (rolls to today if overdue) */
export function effectiveDate(t: Task): string {
  if (t.status === 'realizada') return t.originalDate
  const tod = todayStr()
  if (t.date >= tod) return t.date
  // roll forward day by day until we reach today
  let d = t.date
  while (d < tod) d = nextWorkday(d)
  return d
}

export const MONTHS_FULL = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
export const MONTHS_SHORT = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic',
]

export type Period = 'mes' | 'trim' | 'año' | 'todo'
