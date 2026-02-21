import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
export const dynamic = 'force-dynamic'
import type { Product } from '@/types'

export async function GET() {
  const { data, error } = await supabase
    .from('products')
    .select('data')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    (data || []).map((r: any) => r.data),
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  )
}

export async function PUT(req: NextRequest) {
  const products = await req.json() as Product[]

  // Delete all then re-insert (simplest approach for full replace)
  await supabase.from('products').delete().neq('id', '__none__')

  if (products.length > 0) {
    const { error } = await supabase.from('products').insert(
      products.map(p => ({ id: p.id, data: p })) as any
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
