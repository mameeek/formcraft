import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { PaymentStatus } from '@/types'

// PATCH /api/submissions/[id] — update payment status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status, note } = await req.json() as { status: PaymentStatus; note?: string }

    await sql`
      UPDATE submissions SET
        payment_status       = ${status},
        payment_confirmed_at = NOW(),
        payment_note         = ${note || null}
      WHERE id = ${params.id}
    `

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PATCH /api/submissions/[id] error:', e)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
