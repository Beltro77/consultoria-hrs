import { supabase } from '@/lib/supabase'

const TIMEZONE = 'America/Argentina/Buenos_Aires'

function formatPartsInTZ(dateMs: number, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  // en-CA gives YYYY-MM-DD ordering
  const parts = dtf.formatToParts(new Date(dateMs))
  const p: Record<string, string> = {}
  for (const part of parts) p[part.type] = part.value
  return {
    year: p.year!,
    month: p.month!,
    day: p.day!,
    hour: p.hour ?? '00',
    minute: p.minute ?? '00',
    second: p.second ?? '00',
  }
}

function formatLocalString(parts: { year: string; month: string; day: string; hour: string; minute: string; second: string }) {
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}

// Find the UTC epoch milliseconds that correspond to the given local date/time in a specific IANA TZ
// Uses binary search within a +/-48h window around an approximate UTC candidate
async function findUtcForLocal(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, timeZone = TIMEZONE) {
  // target local string
  const targetLocal = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`

  // approximate UTC candidate: treat the local time as if it were UTC (will be off by tz offset)
  const approx = Date.UTC(year, month - 1, day, hour, minute, second)
  const window = 48 * 60 * 60 * 1000 // 48 hours
  let low = approx - window
  let high = approx + window

  // binary search for timestamp whose formatted local parts match targetLocal
  for (let i = 0; i < 60; i++) {
    const mid = Math.floor((low + high) / 2)
    const parts = formatPartsInTZ(mid, timeZone)
    const formatted = formatLocalString(parts)
    if (formatted === targetLocal) return new Date(mid).toISOString()
    if (formatted < targetLocal) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  // fallback: return ISO for approx (may be off if TZ not matching)
  return new Date(approx).toISOString()
}

export async function getMonthlyDashboardCounts(): Promise<{ leadsDelMes: number; clientesNuevosDelMes: number }> {
  // Determine current year/month in the target timezone
  const now = new Date()
  const nowParts = formatPartsInTZ(now.getTime(), TIMEZONE)
  const year = Number(nowParts.year)
  const month = Number(nowParts.month)

  // compute start of month local and start of next month local in UTC ISO strings
  const startOfMonthISO = await findUtcForLocal(year, month, 1, 0, 0, 0, TIMEZONE)
  // next month
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }
  const startOfNextMonthISO = await findUtcForLocal(nextMonth.y, nextMonth.m, 1, 0, 0, 0, TIMEZONE)

  // leadsDelMes: clients with created_at in [startOfMonthISO, startOfNextMonthISO)
  const { count: leadsCount, error: leadsError } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfMonthISO)
    .lt('created_at', startOfNextMonthISO)

  if (leadsError) {
    console.error('Error counting leadsDelMes:', leadsError)
    throw leadsError
  }

  // clientesNuevosDelMes: distinct client_id from client_status_history where new_status IN ('activo','confirmado') and changed_at in range
  const { data: convRows, error: convError } = await supabase
    .from('client_status_history')
    .select('client_id')
    .in('new_status', ['activo', 'confirmado'])
    .gte('changed_at', startOfMonthISO)
    .lt('changed_at', startOfNextMonthISO)
    .limit(100000)

  if (convError) {
    console.error('Error fetching client_status_history rows:', convError)
    throw convError
  }

  const uniqueClientIds = new Set<string>((convRows ?? []).map((r: any) => r.client_id))

  return { leadsDelMes: leadsCount ?? 0, clientesNuevosDelMes: uniqueClientIds.size }
}
