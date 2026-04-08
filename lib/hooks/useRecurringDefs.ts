import { useCallback, useEffect, useState } from 'react'
import type { RecurDef } from '@/lib/types'
import { deleteRecurringDef, listRecurringDefs, upsertRecurringDef } from '@/lib/services/recurringDefs.service'

export function useRecurringDefs() {
  const [recurringDefs, setRecurringDefs] = useState<RecurDef[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await listRecurringDefs()
      setRecurringDefs(data)
    } catch (err) {
      setError((err as Error)?.message ?? 'Error cargando recurrencias')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    recurringDefs,
    loading,
    error,
    refresh,
    saveRecurringDef: upsertRecurringDef,
    removeRecurringDef: deleteRecurringDef,
  }
}
