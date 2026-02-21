import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { FormConfig } from '@/types'

// GET /api/form
export async function GET() {
  try {
    const rows = await sql`SELECT data FROM form_config WHERE id = 'main' LIMIT 1`
    if (!rows.length) return NextResponse.json(null)
    return NextResponse.json(rows[0].data)
  } catch (e) {
    console.error('GET /api/form error:', e)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// PUT /api/form — save form config
export async function PUT(req: NextRequest) {
  try {
    const form = await req.json() as FormConfig

    await sql`
      INSERT INTO form_config (id, data)
      VALUES ('main', ${JSON.stringify(form)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
    `

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PUT /api/form error:', e)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
