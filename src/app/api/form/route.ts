import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'
import type { FormConfig } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const store = getStore('app-data')
    const form = await store.get('form-config', { type: 'json' }) as FormConfig | null
    return NextResponse.json(form, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const form = await req.json() as FormConfig
  try {
    const store = getStore('app-data')
    await store.setJSON('form-config', form)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
