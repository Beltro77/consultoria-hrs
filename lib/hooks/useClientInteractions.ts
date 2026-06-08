import { useCallback, useEffect, useState } from 'react'
import type { ClientInteraction, ClientInteractionInput } from '@/lib/types'
import {
  createInteraction,
  deleteInteraction,
  listInteractions,
  updateInteraction,
} from '@/lib/services/clientInteractions.service'

export function useClientInteractions(clientId: string | null) {
  const [interactions, setInteractions] = useState<ClientInteraction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!clientId) { setInteractions([]); return }

    setLoading(true)
    setError(null)
    try {
      setInteractions(await listInteractions(clientId))
    } catch (err) {
      setError((err as Error)?.message ?? 'Error cargando interacciones')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { refresh() }, [refresh])

  return {
    interactions,
    loading,
    error,
    refresh,
    addInteraction: async (input: ClientInteractionInput) => {
      await createInteraction(input)
      await refresh()
    },
    editInteraction: async (id: string, input: Partial<ClientInteractionInput>) => {
      await updateInteraction(id, input)
      await refresh()
    },
    removeInteraction: async (id: string) => {
      await deleteInteraction(id)
      await refresh()
    },
  }
}
