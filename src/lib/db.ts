import { createClient } from '@supabase/supabase-js'

// Lazily create client so missing env vars only error at runtime (not build time)
let _supabase: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (_supabase) return _supabase

  const dbUrl = process.env.SUPABASE_DATABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Parse project ref → https://PROJECT_REF.supabase.co
  const match = dbUrl.match(/@db\.([^.]+)\.supabase\.co/)
             || dbUrl.match(/postgres\.([^:@]+)[:@]/)
  const url = match ? `https://${match[1]}.supabase.co` : ''
console.log('DB_URL masked:', dbUrl.replace(/:([^@]+)@/, ':***@'))
console.log('Parsed URL:', url)
  if (!url || !key) {
    throw new Error(`Cannot parse Supabase URL from: "${dbUrl.replace(/:([^@]+)@/, ':***@')}"`)
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
