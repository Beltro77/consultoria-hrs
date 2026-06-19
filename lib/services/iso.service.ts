import { supabase } from '@/lib/supabase'
import type {
  Project, ProjectTopic, TopicSubtask, Meeting, ClientProfile, UserRole,
  ProjectMember, MemberLogEntry, MemberLogCategory,
  MemberCategoryLevel, CategoryLevelMap, CoordinatorItem,
} from '@/lib/iso-types'
import { MEMBER_LOG_CATEGORIES } from '@/lib/iso-types'

// ─── Mappers ─────────────────────────────────────────────────

function mapProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id ?? undefined,
    clientUserId: row.client_user_id ?? undefined,
    clientEmail: row.client_email ?? undefined,
    status: row.status,
    startDate: row.start_date ?? undefined,
    estimatedEndDate: row.estimated_end_date ?? undefined,
    createdAt: row.created_at,
  }
}

function mapSubtask(row: any): TopicSubtask {
  return {
    id: row.id,
    projectTopicId: row.project_topic_id,
    label: row.label,
    isCompleted: row.is_completed,
    completedAt: row.completed_at ?? undefined,
    orderIndex: row.order_index,
  }
}

function mapTopic(row: any, subtasks: TopicSubtask[] = []): ProjectTopic {
  return {
    id: row.id,
    projectId: row.project_id,
    topicKey: row.topic_key,
    displayName: row.display_name,
    orderIndex: row.order_index,
    isApplicable: row.is_applicable,
    subtasks,
  }
}

function mapMeeting(row: any): Meeting {
  return {
    id: row.id,
    projectId: row.project_id,
    scheduledAt: row.scheduled_at,
    summary: row.summary ?? undefined,
    nextSteps: row.next_steps ?? undefined,
    topicsCovered: row.topics_covered ?? undefined,
    participants: row.participants ?? undefined,
    createdAt: row.created_at,
  }
}

// ─── Auth / profile ──────────────────────────────────────────

export async function ensureProfile(userId: string, email: string, metaRole?: string): Promise<void> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    const role = (metaRole === 'member' || metaRole === 'client') ? metaRole : 'consultant'
    await supabase.from('profiles').insert({ user_id: userId, email, role })
  } else {
    await supabase.from('profiles').update({ email }).eq('user_id', userId)
  }
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  return (data?.role as UserRole) ?? null
}

export async function listClientProfiles(): Promise<ClientProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, email, role')
    .eq('role', 'client')
  if (error) return []
  return (data ?? []).map(r => ({
    id: r.id,
    userId: r.user_id,
    email: r.email ?? undefined,
    role: r.role as UserRole,
  }))
}

export async function findClientByEmail(email: string): Promise<ClientProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, user_id, email, role')
    .eq('email', email.trim())
    .eq('role', 'client')
    .maybeSingle()
  if (!data) return null
  return { id: data.id, userId: data.user_id, email: data.email ?? undefined, role: 'client' }
}

// ─── Projects ────────────────────────────────────────────────

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return (data ?? []).map(mapProject)
}

export async function getProject(id: string): Promise<Project | null> {
  const { data } = await supabase.from('projects').select('*').eq('id', id).single()
  return data ? mapProject(data) : null
}

export async function createProject(input: {
  name: string
  clientId?: string
  clientEmail?: string
  clientUserId?: string
  status: string
  startDate?: string
  estimatedEndDate?: string
}): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: input.name,
      client_id: input.clientId || null,
      client_email: input.clientEmail || null,
      client_user_id: input.clientUserId || null,
      status: input.status,
      start_date: input.startDate || null,
      estimated_end_date: input.estimatedEndDate || null,
    })
    .select()
    .single()
  if (error) throw error

  const { error: seedErr } = await supabase.rpc('seed_project_topics', { p_project_id: data.id })
  if (seedErr) throw seedErr

  return mapProject(data)
}

export async function updateProject(id: string, fields: Partial<{
  name: string
  clientId: string
  clientEmail: string
  clientUserId: string
  status: string
  startDate: string
  estimatedEndDate: string
}>): Promise<void> {
  const p: Record<string, any> = {}
  if (fields.name !== undefined)             p.name                = fields.name
  if (fields.clientId !== undefined)         p.client_id           = fields.clientId || null
  if (fields.clientEmail !== undefined)      p.client_email        = fields.clientEmail || null
  if (fields.clientUserId !== undefined)     p.client_user_id      = fields.clientUserId || null
  if (fields.status !== undefined)           p.status              = fields.status
  if (fields.startDate !== undefined)        p.start_date          = fields.startDate || null
  if (fields.estimatedEndDate !== undefined) p.estimated_end_date  = fields.estimatedEndDate || null
  const { error } = await supabase.from('projects').update(p).eq('id', id)
  if (error) throw error
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

// ─── Topics & Subtasks ───────────────────────────────────────

export async function getTopicsWithSubtasks(projectId: string): Promise<ProjectTopic[]> {
  const { data: topicRows, error: tErr } = await supabase
    .from('project_topics')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })
  if (tErr || !topicRows?.length) return []

  const { data: subtaskRows, error: sErr } = await supabase
    .from('topic_subtasks')
    .select('*')
    .in('project_topic_id', topicRows.map(t => t.id))
    .order('order_index', { ascending: true })
  if (sErr) return []

  const byTopic = new Map<string, TopicSubtask[]>()
  for (const s of subtaskRows ?? []) {
    const arr = byTopic.get(s.project_topic_id) ?? []
    arr.push(mapSubtask(s))
    byTopic.set(s.project_topic_id, arr)
  }

  return topicRows.map(t => mapTopic(t, byTopic.get(t.id) ?? []))
}

export async function toggleSubtask(subtaskId: string, isCompleted: boolean): Promise<void> {
  const { error } = await supabase.from('topic_subtasks').update({
    is_completed: isCompleted,
    completed_at: isCompleted ? new Date().toISOString() : null,
  }).eq('id', subtaskId)
  if (error) throw error
}

export async function setTopicApplicable(topicId: string, isApplicable: boolean): Promise<void> {
  const { error } = await supabase
    .from('project_topics')
    .update({ is_applicable: isApplicable })
    .eq('id', topicId)
  if (error) throw error
}

export async function moveTopicOrder(
  topicId: string,
  direction: 'up' | 'down',
  topics: ProjectTopic[],
): Promise<void> {
  const idx = topics.findIndex(t => t.id === topicId)
  if (idx === -1) return
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= topics.length) return
  const a = topics[idx]
  const b = topics[swapIdx]
  await Promise.all([
    supabase.from('project_topics').update({ order_index: b.orderIndex }).eq('id', a.id),
    supabase.from('project_topics').update({ order_index: a.orderIndex }).eq('id', b.id),
  ])
}

// ─── Meetings ────────────────────────────────────────────────

export async function listMeetings(projectId: string): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('project_id', projectId)
    .order('scheduled_at', { ascending: true })
  if (error) { console.error(error); return [] }
  return (data ?? []).map(mapMeeting)
}

export async function upsertMeeting(m: {
  id?: string
  projectId: string
  scheduledAt: string
  summary?: string
  nextSteps?: string
  topicsCovered?: string[]
  participants?: string[]
}): Promise<void> {
  const payload: Record<string, any> = {
    project_id: m.projectId,
    scheduled_at: m.scheduledAt,
    summary: m.summary || null,
    next_steps: m.nextSteps || null,
    topics_covered: m.topicsCovered?.length ? m.topicsCovered : null,
    participants: m.participants?.length ? m.participants : null,
  }
  if (m.id) {
    const { error } = await supabase.from('meetings').update(payload).eq('id', m.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('meetings').insert(payload)
    if (error) throw error
  }
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from('meetings').delete().eq('id', id)
  if (error) throw error
}

// ─── Project members ─────────────────────────────────────────

function mapMember(row: any): ProjectMember {
  return {
    id: row.id,
    projectId: row.project_id,
    memberRole: row.member_role ?? 'owner',
    processName: row.process_name,
    memberName: row.member_name,
    memberEmail: row.member_email,
    memberPosition: row.member_position ?? undefined,
    userId: row.user_id ?? undefined,
    createdAt: row.created_at,
  }
}

function mapLogEntry(row: any): MemberLogEntry {
  return {
    id: row.id,
    projectMemberId: row.project_member_id,
    category: row.category as MemberLogCategory,
    title: row.title,
    description: row.description ?? undefined,
    entryDate: row.entry_date,
    createdAt: row.created_at,
  }
}

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) { console.error(error); return [] }
  return (data ?? []).map(mapMember)
}

export async function upsertProjectMember(m: {
  id?: string
  projectId: string
  memberRole?: string
  processName: string
  memberName: string
  memberEmail: string
  memberPosition?: string
}): Promise<void> {
  const payload: Record<string, any> = {
    project_id:      m.projectId,
    member_role:     m.memberRole ?? 'owner',
    process_name:    m.processName,
    member_name:     m.memberName,
    member_email:    m.memberEmail,
    member_position: m.memberPosition || null,
  }
  if (m.id) {
    const { error } = await supabase.from('project_members').update(payload).eq('id', m.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('project_members').insert(payload)
    if (error) throw error
  }
}

// ─── Coordinator items ────────────────────────────────────────

export async function listCoordinatorItems(projectMemberId: string): Promise<CoordinatorItem[]> {
  const { data, error } = await supabase
    .from('coordinator_items')
    .select('*')
    .eq('project_member_id', projectMemberId)
    .order('created_at', { ascending: true })
  if (error) { console.error(error); return [] }
  return (data ?? []).map(row => ({
    id: row.id,
    projectMemberId: row.project_member_id,
    text: row.text,
    done: row.done,
    createdAt: row.created_at,
  }))
}

export async function addCoordinatorItem(projectMemberId: string, text: string): Promise<void> {
  const { error } = await supabase.from('coordinator_items').insert({ project_member_id: projectMemberId, text })
  if (error) throw error
}

export async function toggleCoordinatorItem(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('coordinator_items').update({ done }).eq('id', id)
  if (error) throw error
}

export async function deleteCoordinatorItem(id: string): Promise<void> {
  const { error } = await supabase.from('coordinator_items').delete().eq('id', id)
  if (error) throw error
}

export async function deleteProjectMember(id: string): Promise<void> {
  const { error } = await supabase.from('project_members').delete().eq('id', id)
  if (error) throw error
}

// ─── Member log entries ──────────────────────────────────────

export async function listLogEntries(memberId: string): Promise<MemberLogEntry[]> {
  const { data, error } = await supabase
    .from('member_log_entries')
    .select('*')
    .eq('project_member_id', memberId)
    .order('entry_date', { ascending: false })
  if (error) { console.error(error); return [] }
  return (data ?? []).map(mapLogEntry)
}

export async function upsertLogEntry(e: {
  id?: string
  projectMemberId: string
  category: MemberLogCategory
  title: string
  description?: string
  entryDate: string
}): Promise<void> {
  const payload: Record<string, any> = {
    project_member_id: e.projectMemberId,
    category:          e.category,
    title:             e.title,
    description:       e.description || null,
    entry_date:        e.entryDate,
  }
  if (e.id) {
    const { error } = await supabase.from('member_log_entries').update(payload).eq('id', e.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('member_log_entries').insert(payload)
    if (error) throw error
  }
}

export async function deleteLogEntry(id: string): Promise<void> {
  const { error } = await supabase.from('member_log_entries').delete().eq('id', id)
  if (error) throw error
}

// ─── Member portal ───────────────────────────────────────────

export async function getMyMemberRecord(): Promise<ProjectMember | null> {
  // Auto-link by email on first access
  await supabase.rpc('link_member_by_email')
  const { data } = await supabase
    .from('project_members')
    .select('*')
    .maybeSingle()
  return data ? mapMember(data) : null
}

export async function sendMemberAccess(email: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const res = await fetch('/api/invite-member', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Error ${res.status}`)
  }
}

// ─── Category levels ─────────────────────────────────────────

export async function getCategoryLevels(memberId: string): Promise<CategoryLevelMap> {
  const { data } = await supabase
    .from('member_category_levels')
    .select('category, level')
    .eq('project_member_id', memberId)
  const map: CategoryLevelMap = {}
  for (const row of data ?? []) {
    map[row.category as MemberLogCategory] = row.level
  }
  return map
}

export async function upsertCategoryLevel(
  memberId: string,
  category: MemberLogCategory,
  level: number,
): Promise<void> {
  const { error } = await supabase
    .from('member_category_levels')
    .upsert(
      { project_member_id: memberId, category, level, updated_at: new Date().toISOString() },
      { onConflict: 'project_member_id,category' },
    )
  if (error) throw error
}

export async function getCategoryLevelsForProject(
  projectId: string,
): Promise<Record<string, CategoryLevelMap>> {
  const members = await listProjectMembers(projectId)
  if (!members.length) return {}
  const { data } = await supabase
    .from('member_category_levels')
    .select('project_member_id, category, level')
    .in('project_member_id', members.map(m => m.id))
  const result: Record<string, CategoryLevelMap> = {}
  for (const m of members) result[m.id] = {}
  for (const row of data ?? []) {
    result[row.project_member_id] ??= {}
    result[row.project_member_id][row.category as MemberLogCategory] = row.level
  }
  return result
}
