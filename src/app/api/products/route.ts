import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { Product } from '@/types'

// GET /api/products
export async function GET() {
  try {
    const rows = await sql`SELECT data FROM products ORDER BY created_at ASC`
    return NextResponse.json(rows.map((r: { data: Product }) => r.data))
  } catch (e) {
    console.error('GET /api/products error:', e)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// PUT /api/products — replace all products (admin save)
export async function PUT(req: NextRequest) {
  try {
    const products = await req.json() as Product[]

    // Upsert all products
    for (const p of products) {
      await sql`
        INSERT INTO products (id, data)
        VALUES (${p.id}, ${JSON.stringify(p)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `
    }

    // Delete products no longer in list
    const ids = products.map(p => p.id)
    if (ids.length > 0) {
      await sql`DELETE FROM products WHERE id != ALL(${ids}::text[])`
    } else {
      await sql`DELETE FROM products`
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PUT /api/products error:', e)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
