import { useCallback, useEffect, useState } from 'react'
import type { Client } from '@/lib/types'
import { deleteClient, listClients, upsertClient } from '@/lib/services/clients.service'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await listClients()
      setClients(data)
    } catch (err) {
      setError((err as Error)?.message ?? 'Error cargando clientes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    clients,
    loading,
    error,
    refresh,
    saveClient: upsertClient,
    removeClient: deleteClient,
  }
}
