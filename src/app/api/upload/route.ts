import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db'
import { uid } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const supabase = getSupabase()
    const urls: string[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `${uid()}.${ext}`
      const bytes = await file.arrayBuffer()

      const { error } = await supabase.storage
        .from('uploads')
        .upload(filename, bytes, { contentType: file.type })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const { data } = supabase.storage.from('uploads').getPublicUrl(filename)
      urls.push(data.publicUrl)
    }

    return NextResponse.json({ urls })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
