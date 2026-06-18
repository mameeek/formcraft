import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string } }
) {
  const store = getStore('uploads')
  const blob = await store.get(params.key, { type: 'blob' })

  if (!blob) {
    return new NextResponse('Not found', { status: 404 })
  }

  const ext = params.key.split('.').pop()?.toLowerCase() ?? ''
  const contentTypeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
  }
  const contentType = contentTypeMap[ext] ?? 'application/octet-stream'

  return new NextResponse(blob, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
