'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ensureInternalClients, ensureInternalSubtopics } from '@/lib/services/clients.service'
import { useClients } from '@/lib/hooks/useClients'
import CalendarView from '@/components/CalendarView'
import DashboardView from '@/components/DashboardView'
import HistorialView from '@/components/HistorialView'
import ClientesView from '@/components/ClientesView'
import { Btn, Input, Label } from '@/components/ui'

type Tab = 'calendario' | 'dashboard' | 'historial' | 'clientes'

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'calendario', label: 'Calendario', icon: '📅' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'historial', label: 'Historial', icon: '📋' },
  { id: 'clientes', label: 'Clientes', icon: '👤' },
]

function LoginScreen({ onSignedIn }: { onSignedIn: (session: Session | null) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Ingresá email y contraseña')
      return
    }

    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    onSignedIn(data.session)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-stone-900 mb-2">Iniciar sesión</h1>
        <p className="text-sm text-stone-500 mb-6">
          Ingresá con el email y contraseña creados manualmente en Supabase.
        </p>

        {error ? (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
        />

        <Label>Contraseña</Label>
        <Input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="********"
        />

        <div className="mt-6">
          <Btn onClick={handleLogin} className="w-full">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

function AuthenticatedApp() {
  const [tab, setTab] = useState<Tab>('calendario')
  const [ready, setReady] = useState(false)
  const { clients, refresh, removeClient } = useClients()

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  useEffect(() => {
    const initInternalClients = async () => {
      try {
        await ensureInternalClients()
        await ensureInternalSubtopics()
        await refresh()
      } catch (error) {
        console.error('Error ensuring internal structure:', error)
      } finally {
        setReady(true)
      }
    }
    initInternalClients()
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
            onClick={handleSignOut}
            className="text-[11px] uppercase tracking-[0.2em] text-stone-500 hover:text-stone-700"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'calendario' && <CalendarView clients={clients} onDataChange={refresh} />}
        {tab === 'dashboard' && <DashboardView clients={clients} />}
        {tab === 'historial' && <HistorialView clients={clients} onDataChange={refresh} />}
        {tab === 'clientes' && <ClientesView clients={clients} onDataChange={refresh} onDeleteClient={removeClient} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 z-10 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto flex">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className="flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors"
              style={{ color: tab === n.id ? 'var(--accent)' : '#a8a29e' }}
            >
              <span className="text-[18px] leading-none">{n.icon}</span>
              <span className="text-[10px] font-medium">{n.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return
      setSession(currentSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500">Cargando sesión...</p>
      </div>
    )
  }

  if (!session) {
    return <LoginScreen onSignedIn={setSession} />
  }

  return <AuthenticatedApp />
}
