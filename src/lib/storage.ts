import { supabase } from '@/lib/db'
import { uid } from '@/lib/utils'

/** Upload a file to the "uploads" bucket and return its public URL (or null on failure). */
export async function uploadToStorage(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${uid()}.${ext}`
  const bytes = await file.arrayBuffer()
  const { error } = await supabase.storage
    .from('uploads')
    .upload(filename, bytes, { contentType: file.type })
  if (error) { console.error('Upload failed:', error); return null }
  const { data } = supabase.storage.from('uploads').getPublicUrl(filename)
  return data.publicUrl
}
