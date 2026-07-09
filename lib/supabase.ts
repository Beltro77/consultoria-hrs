import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function createFallbackClient() {
  const makeQuery = () => ({
    select: async () => ({ data: [], error: null }),
    upsert: async () => ({ data: null, error: null }),
    delete: () => ({
      eq: async () => ({ data: null, error: null }),
    }),
    eq: async () => ({ data: null, error: null }),
    order: async () => ({ data: [], error: null }),
  })

  return {
    from: () => makeQuery(),
  } as any
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : createFallbackClient()