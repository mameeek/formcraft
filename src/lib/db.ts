import { createClient } from '@supabase/supabase-js'

// Lazily create client so missing env vars only error at runtime (not build time)
let _supabase: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (_supabase) return _supabase

  const url = process.env.SUPABASE_DATABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_DATABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  _supabase = createClient(url, key, { auth: { persistSession: false } })
  return _supabase
}

// Convenience alias
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    return (getSupabase() as any)[prop]
  },
})
