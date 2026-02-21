import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY  // server-side only (never expose to browser)

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

// Server-side client (used in API routes only)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})
