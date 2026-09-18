import { useCallback, useEffect, useState } from 'react'
import type { IntakeLead } from '@/lib/services/intakeLeads.service'
import { convertIntakeLeadToClient, dismissIntakeLead, listPendingIntakeLeads } from '@/lib/services/intakeLeads.service'

export function useIntakeLeads() {
  const [leads, setLeads] = useState<IntakeLead[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setLeads(await listPendingIntakeLeads())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return {
    leads,
    loading,
    refresh,
    convert: async (lead: IntakeLead): Promise<string> => {
      const clientId = await convertIntakeLeadToClient(lead)
      await refresh()
      return clientId
    },
    dismiss: async (id: string) => {
      await dismissIntakeLead(id)
      await refresh()
    },
  }
}
