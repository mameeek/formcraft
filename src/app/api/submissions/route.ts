import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import type { Submission } from '@/types'

export async function GET() {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .order('submitted_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const submissions = (data || []).map((row: any) => ({
    id:                 row.id,
    customerName:       row.customer_name,
    customerPhone:      row.customer_phone,
    customerEmail:      row.customer_email,
    fieldValues:        row.field_values,
    items:              row.items,
    shippingMethod:     row.shipping_method,
    subtotal:           row.subtotal,
    shipping:           row.shipping,
    totalAmount:        row.total_amount,
    paymentSlip:        row.payment_slip,
    paymentStatus:      row.payment_status,
    paymentConfirmedAt: row.payment_confirmed_at,
    paymentNote:        row.payment_note,
    submittedAt:        row.submitted_at,
  }))

  return NextResponse.json(
    (data || []).map((r: any) => r.data),
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Omit<Submission, 'id' | 'submittedAt' | 'paymentStatus'>
  const id = crypto.randomUUID().slice(0, 9)

  const { error } = await supabase.from('submissions').insert({
    id,
    customer_name:   body.customerName  || '',
    customer_phone:  body.customerPhone || '',
    customer_email:  body.customerEmail || '',
    field_values:    body.fieldValues   || {},
    items:           body.items         || [],
    shipping_method: body.shippingMethod || 'pickup',
    subtotal:        body.subtotal      || 0,
    shipping:        body.shipping      || 0,
    total_amount:    body.totalAmount   || 0,
    payment_slip:    body.paymentSlip   || null,
  } as any)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id }, { status: 201 })
}
