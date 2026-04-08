import { useCallback, useEffect, useState } from 'react'
import type { Subtopic } from '@/lib/types'
import { createSubtopic, deleteSubtopic, listSubtopics } from '@/lib/services/subtopics.service'

export function useSubtopics(clientId: string | null) {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!clientId) {
      setSubtopics([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await listSubtopics(clientId)
      setSubtopics(data)
    } catch (err) {
      setError((err as Error)?.message ?? 'Error cargando subtemas')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    subtopics,
    loading,
    error,
    refresh,
    addSubtopic: async (name: string) => {
      if (!clientId) throw new Error('No hay cliente seleccionado')
      await createSubtopic(name, clientId)
      await refresh()
    },
    removeSubtopic: async (id: string) => {
      await deleteSubtopic(id)
      await refresh()
    },
  }
}
