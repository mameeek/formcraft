import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import type { FormConfig } from '@/types'
export const dynamic = 'force-dynamic'
export async function GET() {
  const { data, error } = await supabase
    .from('form_config')
    .select('data')
    .eq('id', 'main')
    .single()

  if (error || !data) return NextResponse.json(null)
  return NextResponse.json((data as any).data)
}

export async function PUT(req: NextRequest) {
  const form = await req.json() as FormConfig

  const { error } = await supabase
    .from('form_config')
    .upsert({ id: 'main', data: form, updated_at: new Date().toISOString() } as any)


  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
