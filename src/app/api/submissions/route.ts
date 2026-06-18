import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'
import type { Submission } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const store = getStore({ name: 'submissions', consistency: 'strong' })
    const { blobs } = await store.list()
    const submissions = await Promise.all(
      blobs.map(b => store.get(b.key, { type: 'json' }) as Promise<Submission>)
    )
    const result = submissions
      .filter(Boolean)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Omit<Submission, 'id' | 'submittedAt' | 'paymentStatus'>
  const id = crypto.randomUUID().slice(0, 9)

  try {
    const store = getStore({ name: 'submissions', consistency: 'strong' })
    const submission: Submission = {
      id,
      customerName:   body.customerName  || '',
      customerPhone:  body.customerPhone || '',
      customerEmail:  body.customerEmail || '',
      fieldValues:    body.fieldValues   || {},
      items:          body.items         || [],
      shippingMethod: body.shippingMethod || 'pickup',
      subtotal:       body.subtotal       || 0,
      shipping:       body.shipping       || 0,
      totalAmount:    body.totalAmount    || 0,
      paymentSlip:    body.paymentSlip    || null,
      paymentStatus:  'pending',
      submittedAt:    new Date().toISOString(),
    }
    await store.setJSON(id, submission)
    return NextResponse.json({ id }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
