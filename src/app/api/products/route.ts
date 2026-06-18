import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'
import type { Product } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const store = getStore('app-data')
    const productList = await store.get('products', { type: 'json' }) as Product[] | null
    return NextResponse.json(productList ?? [], {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const productList = await req.json() as Product[]
  try {
    const store = getStore('app-data')
    await store.setJSON('products', productList)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
