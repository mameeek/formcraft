import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'
import type { PaymentStatus, Submission } from '@/types'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { status, note } = await req.json() as { status: PaymentStatus; note?: string }

  try {
    const store = getStore({ name: 'submissions', consistency: 'strong' })
    const submission = await store.get(params.id, { type: 'json' }) as Submission | null
    if (!submission) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const updated: Submission = {
      ...submission,
      paymentStatus:      status,
      paymentConfirmedAt: new Date().toISOString(),
      paymentNote:        note || undefined,
    }
    await store.setJSON(params.id, updated)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
