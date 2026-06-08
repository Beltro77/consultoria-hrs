import { useCallback, useEffect, useState } from 'react'
import type { Idea, IdeaInput } from '@/lib/types'
import { createIdea, deleteIdea, listIdeas, updateIdea } from '@/lib/services/ideas.service'

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setIdeas(await listIdeas())
    } catch (err) {
      setError((err as Error)?.message ?? 'Error cargando ideas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return {
    ideas,
    loading,
    error,
    refresh,
    addIdea: async (input: IdeaInput) => {
      await createIdea(input)
      await refresh()
    },
    editIdea: async (id: string, input: Partial<IdeaInput>) => {
      await updateIdea(id, input)
      await refresh()
    },
    removeIdea: async (id: string) => {
      await deleteIdea(id)
      await refresh()
    },
  }
}
