import { useCallback, useEffect, useState } from 'react'
import type { HourEntry } from '@/lib/types'
import { deleteEntry, listEntries, upsertEntry } from '@/lib/services/hourEntries.service'

export function useHourEntries() {
  const [entries, setEntries] = useState<HourEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await listEntries()
      setEntries(data)
    } catch (err) {
      setError((err as Error)?.message ?? 'Error cargando registros')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    entries,
    loading,
    error,
    refresh,
    saveEntry: upsertEntry,
    removeEntry: deleteEntry,
  }
}
