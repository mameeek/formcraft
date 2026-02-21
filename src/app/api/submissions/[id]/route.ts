import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import type { PaymentStatus } from '@/types'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { status, note } = await req.json() as { status: PaymentStatus; note?: string }

  const { error } = await supabase
    .from('submissions')
    .update({
      payment_status:       status,
      payment_confirmed_at: new Date().toISOString(),
      payment_note:         note || null,
    } as any)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
