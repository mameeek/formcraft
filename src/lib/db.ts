import { createClient } from '@supabase/supabase-js'

let _supabase: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (_supabase) return _supabase

  const dbUrl = process.env.SUPABASE_DATABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  // postgresql://postgres.PROJECTREF:password@...
  const match = dbUrl.match(/postgres\.([a-z]+):|@db\.([a-z]+)\.supabase/)
  const ref = match?.[1] || match?.[2]

  if (!ref || !key) {
    throw new Error('Cannot parse Supabase project ref from SUPABASE_DATABASE_URL')
  }

  const url = `https://${ref}.supabase.co`
  console.log('Supabase URL:', url)

  _supabase = createClient(url, key, { auth: { persistSession: false } })
  return _supabase
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    return (getSupabase() as any)[prop]
  },
})
