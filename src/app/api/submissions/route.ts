import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { Submission } from '@/types'

// GET /api/submissions — fetch all submissions
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        id,
        customer_name    AS "customerName",
        customer_phone   AS "customerPhone",
        customer_email   AS "customerEmail",
        field_values     AS "fieldValues",
        items,
        shipping_method  AS "shippingMethod",
        subtotal,
        shipping,
        total_amount     AS "totalAmount",
        payment_slip     AS "paymentSlip",
        payment_status   AS "paymentStatus",
        payment_confirmed_at AS "paymentConfirmedAt",
        payment_note     AS "paymentNote",
        submitted_at     AS "submittedAt"
      FROM submissions
      ORDER BY submitted_at DESC
    `
    return NextResponse.json(rows)
  } catch (e) {
    console.error('GET /api/submissions error:', e)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// POST /api/submissions — create new submission
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Omit<Submission, 'id' | 'submittedAt' | 'paymentStatus'>
    const id = crypto.randomUUID().slice(0, 9)

    await sql`
      INSERT INTO submissions (
        id, customer_name, customer_phone, customer_email,
        field_values, items, shipping_method,
        subtotal, shipping, total_amount, payment_slip
      ) VALUES (
        ${id},
        ${body.customerName || ''},
        ${body.customerPhone || ''},
        ${body.customerEmail || ''},
        ${JSON.stringify(body.fieldValues || {})}::jsonb,
        ${JSON.stringify(body.items || [])}::jsonb,
        ${body.shippingMethod || 'pickup'},
        ${body.subtotal || 0},
        ${body.shipping || 0},
        ${body.totalAmount || 0},
        ${body.paymentSlip || null}
      )
    `

    return NextResponse.json({ id }, { status: 201 })
  } catch (e) {
    console.error('POST /api/submissions error:', e)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
