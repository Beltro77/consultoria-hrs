export type ProjectStatus = 'active' | 'paused' | 'completed'
export type UserRole = 'consultant' | 'client' | 'member'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active:    'bg-emerald-50 text-emerald-700',
  paused:    'bg-amber-50 text-amber-700',
  completed: 'bg-blue-50 text-blue-700',
}

export interface Project {
  id: string
  name: string
  clientId?: string
  clientUserId?: string
  clientEmail?: string
  status: ProjectStatus
  startDate?: string
  estimatedEndDate?: string
  createdAt: string
}

export interface ProjectTopic {
  id: string
  projectId: string
  topicKey: string
  displayName: string
  orderIndex: number
  isApplicable: boolean
  subtasks: TopicSubtask[]
}

export interface TopicSubtask {
  id: string
  projectTopicId: string
  label: string
  isCompleted: boolean
  completedAt?: string
  orderIndex: number
}

export interface Meeting {
  id: string
  projectId: string
  scheduledAt: string
  summary?: string
  nextSteps?: string
  topicsCovered?: string[]
  createdAt: string
}

export interface ClientProfile {
  id: string
  userId: string
  email?: string
  role: UserRole
}

// ─── Project members ────────────────────────────────────────

export interface ProjectMember {
  id: string
  projectId: string
  processName: string
  memberName: string
  memberEmail: string
  memberPosition?: string
  userId?: string
  createdAt: string
}

export type MemberLogCategory = 'indicadores' | 'riesgos' | 'no_conformidades' | 'competencias'

export const MEMBER_LOG_CATEGORIES: MemberLogCategory[] = [
  'indicadores', 'riesgos', 'no_conformidades', 'competencias',
]

export const MEMBER_LOG_CATEGORY_LABELS: Record<MemberLogCategory, string> = {
  indicadores:      'Indicadores & Objetivos',
  riesgos:          'Gestión de Riesgos',
  no_conformidades: 'No Conformidades',
  competencias:     'Competencias',
}

export const MEMBER_LOG_CATEGORY_ICONS: Record<MemberLogCategory, string> = {
  indicadores:      '📊',
  riesgos:          '⚠️',
  no_conformidades: '🔴',
  competencias:     '👥',
}

export interface MemberLogEntry {
  id: string
  projectMemberId: string
  category: MemberLogCategory
  title: string
  description?: string
  entryDate: string
  createdAt: string
}

// ─── Progress helpers ────────────────────────────────────────

export function computeTopicProgress(topic: ProjectTopic): number {
  if (!topic.isApplicable || topic.subtasks.length === 0) return 0
  return Math.round((topic.subtasks.filter(s => s.isCompleted).length / topic.subtasks.length) * 100)
}

export function computeProjectProgress(topics: ProjectTopic[]): number {
  const applicable = topics.filter(t => t.isApplicable)
  if (applicable.length === 0) return 0
  const sum = applicable.reduce((acc, t) => acc + computeTopicProgress(t), 0)
  return Math.round(sum / applicable.length)
}

export type TopicStatus = 'completed' | 'in_progress' | 'pending' | 'na'

export function topicStatus(topic: ProjectTopic): TopicStatus {
  if (!topic.isApplicable) return 'na'
  const done = topic.subtasks.filter(s => s.isCompleted).length
  if (done === 0) return 'pending'
  if (done === topic.subtasks.length) return 'completed'
  return 'in_progress'
}

export const TOPIC_STATUS_CONFIG: Record<TopicStatus, { label: string; dot: string; text: string }> = {
  completed:   { label: 'Completado',  dot: 'bg-emerald-500', text: 'text-emerald-600' },
  in_progress: { label: 'En progreso', dot: 'bg-amber-400',   text: 'text-amber-600'  },
  pending:     { label: 'Pendiente',   dot: 'bg-stone-300',   text: 'text-stone-400'  },
  na:          { label: 'No aplica',   dot: 'bg-stone-200',   text: 'text-stone-300'  },
}

// Traffic light: compares actual progress vs expected based on dates
export type TrafficColor = 'green' | 'yellow' | 'red' | 'none'

export function trafficLight(project: Project, progress: number): TrafficColor {
  if (!project.startDate || !project.estimatedEndDate) return 'none'
  const start = new Date(project.startDate).getTime()
  const end   = new Date(project.estimatedEndDate).getTime()
  const now   = Date.now()
  const total = end - start
  if (total <= 0) return 'none'
  const elapsed  = Math.max(0, now - start)
  const expected = Math.round(Math.min((elapsed / total) * 100, 100))
  const delta    = progress - expected
  if (delta >= -15) return 'green'
  if (delta >= -30) return 'yellow'
  return 'red'
}

export const TRAFFIC_COLORS: Record<TrafficColor, string> = {
  green:  '#22c55e',
  yellow: '#f59e0b',
  red:    '#ef4444',
  none:   'transparent',
}
