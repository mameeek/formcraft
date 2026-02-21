import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import type { FormConfig } from '@/types'

export const dynamic = 'force-dynamic'
//debug
export async function GET() {
  return Response.json({ test: "HELLO_DEBUG_123" })
}
// export async function GET() {
//   const { data, error } = await supabase
//     .from('form_config')
//     .select('data')
//     .eq('id', 'main')
//     .maybeSingle()
//   //debug
// console.log("SUPABASE URL:", process.env.SUPABASE_DATABASE_URL)
//   //end debug
//   if (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }

//   return NextResponse.json(data?.data ?? null, {
//     headers: { 'Cache-Control': 'no-store' }
//   })
// }
//
//DEBUG
export async function PUT(req: NextRequest) {
  const form = await req.json()

  console.log("FORM RECEIVED:", JSON.stringify(form, null, 2))

  const { error } = await supabase
    .from('form_config')
    .upsert(
      { id: 'main', data: form, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )

  if (error) {
    console.log("UPSERT ERROR:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
//END DEBUG
