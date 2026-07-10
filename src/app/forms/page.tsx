'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useFormsStore } from '@/store'
import { Btn, Card, Input, Label, Badge, EmptyState } from '@/components/ui'
import { slugify } from '@/lib/utils'
import type { FormRole } from '@/types'

const ROLE_LABEL: Record<FormRole, string> = {
  owner: '👑 เจ้าของ', editor: '✏️ แก้ไขได้', submissions: '📥 ดูคำสั่งซื้อ', viewer: '👁️ ดูอย่างเดียว',
}
const ROLE_COLOR: Record<FormRole, string> = {
  owner: 'var(--purple)', editor: 'var(--green)', submissions: 'var(--blue)', viewer: 'var(--text-muted)',
}

function NewFormPanel({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const createForm = useFormsStore((s) => s.createForm)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  const handleCreate = async () => {
    if (!title.trim() || !slug.trim()) return
    setCreating(true)
    setError(null)
    const id = await createForm(title.trim(), slug.trim())
    setCreating(false)
    if (id) onCreated(id)
    else setError('สร้างฟอร์มไม่สำเร็จ — slug นี้อาจถูกใช้แล้ว')
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16 }}>➕ สร้างฟอร์มใหม่</h3>
      <Label>ชื่อฟอร์ม</Label>
      <Input value={title} onChange={e => handleTitleChange(e.target.value)} placeholder="เช่น Pre-Order งานรับปริญญา 2569" style={{ marginBottom: 12 }} />
      <Label>Slug (ใช้ในลิงก์ฟอร์ม: /form/?f=<span style={{ fontFamily: 'monospace' }}>{slug || 'slug'}</span>)</Label>
      <Input value={slug} onChange={e => { setSlug(e.target.value); setSlugTouched(true) }} placeholder="graduation-2569" style={{ marginBottom: 14, fontFamily: 'monospace' }} />
      {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 12 }}>⚠ {error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={handleCreate} variant="primary" disabled={creating || !title.trim() || !slug.trim()}>
          {creating ? 'กำลังสร้าง...' : 'สร้างฟอร์ม'}
        </Btn>
        <Btn onClick={onCancel} variant="ghost" disabled={creating}>ยกเลิก</Btn>
      </div>
    </Card>
  )
}

export default function FormsPage() {
  const router = useRouter()
  const { session, initialized, init, signOut } = useAuthStore()
  const { forms, loading, error, canCreateForms, listMyForms, checkCanCreateForms } = useFormsStore()
  const [showNew, setShowNew] = useState(false)

  useEffect(() => { init() }, [init])

  useEffect(() => {
    if (initialized && !session) router.replace('/login')
  }, [initialized, session, router])

  useEffect(() => {
    if (session) { listMyForms(); checkCanCreateForms() }
  }, [session, listMyForms, checkCanCreateForms])

  const handleSignOut = async () => { await signOut(); router.replace('/login') }

  if (!initialized || !session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', color: 'var(--text-muted)', fontSize: 13 }}>
        กำลังตรวจสอบสิทธิ์...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', padding: '32px 36px' }} className="animate-fadeUp">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, maxWidth: 720, margin: '0 auto 28px' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>ฟอร์มของฉัน</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{session.user.email}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canCreateForms && !showNew && (
            <Btn onClick={() => setShowNew(true)} variant="primary">➕ สร้างฟอร์มใหม่</Btn>
          )}
          <Btn onClick={handleSignOut} variant="ghost">ออกจากระบบ</Btn>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {showNew && (
          <NewFormPanel
            onCreated={(id) => router.push(`/editor?f=${id}`)}
            onCancel={() => setShowNew(false)}
          />
        )}

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            ⚠ {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>กำลังโหลด...</div>
        ) : forms.length === 0 ? (
          <EmptyState
            icon="📋"
            title="ยังไม่มีฟอร์ม"
            subtitle={canCreateForms ? 'สร้างฟอร์มแรกของคุณเพื่อเริ่มต้น' : 'ยังไม่มีใครให้สิทธิ์คุณเข้าถึงฟอร์มใด — แจ้งผู้ดูแลด้วยอีเมลนี้'}
          />
        ) : (
          forms.map((f) => (
            <div key={f.id} onClick={() => router.push(`/dashboard?f=${f.id}`)}
              style={{
                background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '16px 18px', marginBottom: 10, cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.15s',
              }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>/form/?f={f.slug}</div>
              </div>
              <Badge color={ROLE_COLOR[f.role]}>{ROLE_LABEL[f.role]}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
