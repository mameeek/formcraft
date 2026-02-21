'use client'

import { useState, useCallback } from 'react'

interface ImageUploaderProps {
  images: string[]
  onChange: (images: string[]) => void
  maxImages?: number
}

/** Read a File as base64 data URL — pure client-side, no server/API needed */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'))
    reader.readAsDataURL(file)
  })
}

export default function ImageUploader({ images, onChange, maxImages = 6 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!fileArray.length) return

    const remaining = maxImages - images.length
    if (remaining <= 0) return
    const toProcess = fileArray.slice(0, remaining)

    setUploading(true)
    try {
      const dataUrls = await Promise.all(toProcess.map(readFileAsDataURL))
      onChange([...images, ...dataUrls])
    } catch (e) {
      console.error('อ่านไฟล์ไม่สำเร็จ:', e)
    } finally {
      setUploading(false)
    }
  }, [images, onChange, maxImages])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files)
  }, [processFiles])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files)
    // reset so same file can be re-selected
    e.target.value = ''
  }, [processFiles])

  const removeImage = (idx: number) => onChange(images.filter((_, i) => i !== idx))

  const moveImage = (from: number, to: number) => {
    const arr = [...images]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    onChange(arr)
  }

  return (
    <div>
      {/* Thumbnails */}
      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))', gap: 8, marginBottom: 10 }}>
          {images.map((src, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 9, overflow: 'hidden', border: i === 0 ? '2px solid var(--accent)' : '1px solid var(--border)', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`รูป ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />

              {/* Hover overlay */}
              <div
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: 0, transition: 'opacity 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              >
                {i > 0 && <button onClick={() => moveImage(i, i - 1)} style={ctrlBtn} title="ย้ายซ้าย">‹</button>}
                <button onClick={() => removeImage(i)} style={{ ...ctrlBtn, color: '#f87171' }} title="ลบ">✕</button>
                {i < images.length - 1 && <button onClick={() => moveImage(i, i + 1)} style={ctrlBtn} title="ย้ายขวา">›</button>}
              </div>

              {i === 0 && (
                <div style={{ position: 'absolute', top: 4, left: 4, background: 'var(--accent)', color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>
                  COVER
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / file picker */}
      {images.length < maxImages && (
        <label
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '18px 16px',
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 10, cursor: 'pointer',
            background: dragOver ? 'var(--accent-dim)' : 'transparent',
            transition: 'all 0.2s',
          }}
        >
          <input type="file" accept="image/*" multiple onChange={handleInput} style={{ display: 'none' }} />

          {uploading ? (
            <>
              <span style={{ fontSize: 22 }}>⏳</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>กำลังโหลดรูป...</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 26 }}>📎</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                คลิกแนบรูป หรือลากมาวาง
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.55 }}>
                JPG · PNG · WEBP · เพิ่มได้อีก {maxImages - images.length} รูป
              </span>
            </>
          )}
        </label>
      )}
    </div>
  )
}

const ctrlBtn: React.CSSProperties = {
  background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)',
  color: '#fff', borderRadius: 6, width: 24, height: 24,
  fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
