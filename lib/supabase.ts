import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function createFallbackClient(): SupabaseClient {
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
  } as unknown as SupabaseClient
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const isBrowser = typeof window !== 'undefined'

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: true,
        storage: isBrowser ? window.localStorage : undefined,
      },
    })
  : createFallbackClient()

// Helper to get current user profile
export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    throw error
  }

  return data
}