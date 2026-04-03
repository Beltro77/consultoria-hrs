'use client'

import { useState, useEffect, useCallback } from 'react'
import { getClients } from '@/lib/storage'
import type { Client } from '@/lib/types'
import { supabase } from '@/lib/supabase' // 👈 NUEVO

import CalendarView  from '@/components/CalendarView'
import DashboardView from '@/components/DashboardView'
import HistorialView from '@/components/HistorialView'
import ClientesView  from '@/components/ClientesView'

type Tab = 'calendario' | 'dashboard' | 'historial' | 'clientes'

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'calendario', label: 'Calendario', icon: '📅' },
  { id: 'dashboard',  label: 'Dashboard',  icon: '📊' },
  { id: 'historial',  label: 'Historial',  icon: '📋' },
  { id: 'clientes',   label: 'Clientes',   icon: '👤' },
]

export default function AppShell() {
  const [tab, setTab]         = useState<Tab>('calendario')
  const [clients, setClients] = useState<Client[]>([])

const refresh = useCallback(async () => {
  const data = await getClients()
  setClients(data)
}, [])
  useEffect(() => {
    refresh()
  }, [refresh])

  // 👇 TEST SUPABASE
  useEffect(() => {
    async function testSupabase() {
      const { data, error } = await supabase.from('clients').select('*')
      console.log('SUPABASE CLIENTS:', data)
      console.log('SUPABASE ERROR:', error)
    }

    testSupabase()
  }, [])

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-lg mx-auto">
      
      {/* Header */}
      <header className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 sticky top-0 z-10">
        <h1 className="text-[18px] font-medium text-stone-800">Consultoria hrs</h1>
        <p className="text-xs text-stone-400 capitalize mt-0.5">{today}</p>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'calendario' && <CalendarView  clients={clients} onDataChange={refresh} />}
        {tab === 'dashboard'  && <DashboardView clients={clients} />}
        {tab === 'historial'  && <HistorialView clients={clients} onDataChange={refresh} />}
        {tab === 'clientes'   && <ClientesView  clients={clients} onDataChange={refresh} />}
      </main>

      {/* Bottom nav */}
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