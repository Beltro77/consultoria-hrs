'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ensureInternalClients, ensureInternalSubtopics } from '@/lib/services/clients.service'
import { ensureProfile, getCurrentUserRole } from '@/lib/services/iso.service'
import { useClients } from '@/lib/hooks/useClients'
import CalendarView from '@/components/CalendarView'
import DashboardView from '@/components/DashboardView'
import HistorialView from '@/components/HistorialView'
import ClientesView from '@/components/ClientesView'
import IdeasView from '@/components/IdeasView'
import ProjectsView from '@/components/iso/ProjectsView'
import ProjectDetailView from '@/components/iso/ProjectDetailView'
import ClientPortal from '@/components/iso/ClientPortal'
import MemberPortal from '@/components/iso/MemberPortal'
import { Btn, Input, Label } from '@/components/ui'

type Tab = 'calendario' | 'dashboard' | 'historial' | 'clientes' | 'ideas' | 'proyectos'
type UserRole = 'consultant' | 'client' | 'member'

const CONSULTANT_NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'calendario', label: 'Calendario', icon: '📅' },
  { id: 'dashboard',  label: 'Dashboard',  icon: '📊' },
  { id: 'historial',  label: 'Historial',  icon: '📋' },
  { id: 'clientes',   label: 'Clientes',   icon: '👤' },
  { id: 'ideas',      label: 'Ideas',      icon: '💡' },
  { id: 'proyectos',  label: 'Proyectos',  icon: '🏗️' },
]

// ─── Login ───────────────────────────────────────────────────

function LoginScreen({ onSignedIn }: { onSignedIn: (session: Session | null) => void }) {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleLogin() {
    if (!email.trim() || !password) { setError('Ingresá email y contraseña'); return }
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) { setError(error.message); return }
    onSignedIn(data.session)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-stone-900 mb-2">Iniciar sesión</h1>
        <p className="text-sm text-stone-500 mb-6">
          Ingresá con el email y contraseña creados manualmente en Supabase.
        </p>
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}
        <Label>Email</Label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
        <Label>Contraseña</Label>
        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" />
        <div className="mt-6">
          <Btn onClick={handleLogin} className="w-full">{loading ? 'Ingresando...' : 'Ingresar'}</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Consultant app ──────────────────────────────────────────

function ConsultantApp() {
  const [tab, setTab]           = useState<Tab>('calendario')
  const [ready, setReady]       = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const { clients, refresh, removeClient } = useClients()

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  useEffect(() => {
    async function init() {
      try {
        await ensureInternalClients()
        await ensureInternalSubtopics()
        await refresh()
      } catch (e) {
        console.error('Error init:', e)
      } finally {
        setReady(true)
      }
    }
    init()
  }, [refresh])

  if (!ready) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500">Inicializando datos...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-lg mx-auto">
      <header className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 sticky top-0 z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[18px] font-medium text-stone-800">Consultoria hrs</h1>
            <p className="text-xs text-stone-400 capitalize mt-0.5">{today}</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-[11px] uppercase tracking-[0.2em] text-stone-500 hover:text-stone-700"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'calendario'  && <CalendarView clients={clients} onDataChange={refresh} />}
        {tab === 'dashboard'   && <DashboardView clients={clients} />}
        {tab === 'historial'   && <HistorialView clients={clients} onDataChange={refresh} />}
        {tab === 'clientes'    && <ClientesView clients={clients} onDataChange={refresh} onDeleteClient={removeClient} />}
        {tab === 'ideas'       && <IdeasView />}
        {tab === 'proyectos'   && !projectId && (
          <ProjectsView onOpenProject={id => setProjectId(id)} />
        )}
        {tab === 'proyectos'   && projectId && (
          <ProjectDetailView projectId={projectId} onBack={() => setProjectId(null)} />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 z-10 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto flex">
          {CONSULTANT_NAV.map(n => (
            <button
              key={n.id}
              onClick={() => { setTab(n.id); if (n.id !== 'proyectos') setProjectId(null) }}
              className="flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors"
              style={{ color: tab === n.id ? 'var(--accent)' : '#a8a29e' }}
            >
              <span className="text-[16px] leading-none">{n.icon}</span>
              <span className="text-[9px] font-medium">{n.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

// ─── Inactivity timeout ───────────────────────────────────────

const INACTIVITY_MS = 5 * 60 * 1000 // 5 minutos

function useInactivityLogout() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    let lastActivity = Date.now()

    function reset() {
      lastActivity = Date.now()
      clearTimeout(timer)
      timer = setTimeout(() => supabase.auth.signOut(), INACTIVITY_MS)
    }

    // Al volver al tab/app, verificar si realmente pasaron 5 min de inactividad real.
    // Evita logout falso cuando el dispositivo suspende el timer.
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastActivity >= INACTIVITY_MS) {
          supabase.auth.signOut()
        } else {
          reset()
        }
      }
    }

    const events = [
      'mousemove', 'mousedown', 'mouseup',
      'keydown', 'keypress', 'input',
      'touchstart', 'touchmove', 'touchend',
      'pointerdown', 'pointermove',
      'scroll', 'wheel', 'click',
    ] as const
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    document.addEventListener('visibilitychange', onVisibilityChange)
    reset()

    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])
}

// ─── Role router ─────────────────────────────────────────────

function RoleRouter({ session }: { session: Session }) {
  const [role, setRole]     = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useInactivityLogout()

  useEffect(() => {
    async function detect() {
      try {
        const metaRole = session.user.user_metadata?.role as string | undefined
        await ensureProfile(session.user.id, session.user.email ?? '', metaRole)
        const r = await getCurrentUserRole()
        setRole(r ?? 'consultant')
      } catch {
        setRole('consultant')
      } finally {
        setLoading(false)
      }
    }
    detect()
  }, [session])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500">Cargando sesión...</p>
      </div>
    )
  }

  if (role === 'client') {
    return <ClientPortal onSignOut={() => supabase.auth.signOut()} />
  }

  if (role === 'member') {
    return <MemberPortal onSignOut={() => supabase.auth.signOut()} />
  }

  return <ConsultantApp />
}

// ─── Root ────────────────────────────────────────────────────

export default function AppShell() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return
      setSession(s)
      setLoading(false)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500">Cargando sesión...</p>
      </div>
    )
  }

  if (!session) return <LoginScreen onSignedIn={setSession} />

  return <RoleRouter session={session} />
}
