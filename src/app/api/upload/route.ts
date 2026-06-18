import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'
import { uid } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const store = getStore('uploads')
    const urls: string[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg'
      const key = `${uid()}.${ext}`
      const bytes = await file.arrayBuffer()

      await store.set(key, bytes)

      const baseUrl = req.nextUrl.origin
      urls.push(`${baseUrl}/api/uploads/${key}`)
    }

    return NextResponse.json({ urls })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
