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
export type RecurType = 'monthly-start' | 'monthly-end' | 'monthly-day' | 'weekly'

// ─── Data models ─────────────────────────────────────────────────────────────
export interface Client {
  id: string
  name: string
  rate?: number        // USD per hour
  colorIndex: number
}

export type ClientInput = Omit<Client, 'id'> & {
  id?: string
}

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
  { name: 'Administración', colorIndex: 2 },
  { name: 'Desarrollo',     colorIndex: 4 },
]

export const INTERNAL_CLIENT_SUBTOPIC_NAMES = new Set(INTERNAL_CLIENT_PRESETS.map(c => c.name))
export const INTERNAL_CLIENT_SYNONYMS = new Set(['Administración', 'Desarrollo', 'Desarrollo herramientas'])
export const INTERNAL_CLIENT_NAME_ALIASES = new Set(Array.from(INTERNAL_CLIENT_SYNONYMS).concat(INTERNAL_CLIENT_ROOT_NAME))
export const INTERNAL_CLIENT_NAMES = new Set([INTERNAL_CLIENT_ROOT_NAME])
export const INTERNAL_CLIENT_SUBTOPICS = ['Administración', 'Desarrollo'] as const

export function isInternalClientName(name: string) {
  return INTERNAL_CLIENT_SYNONYMS.has(name)
}

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
