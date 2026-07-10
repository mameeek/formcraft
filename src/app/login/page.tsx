'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store'
import { Btn, Input, Label, Card } from '@/components/ui'

export default function LoginPage() {
  const router = useRouter()
  const { session, initialized, init, signInWithPassword, signingIn, error } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => { init() }, [init])

  useEffect(() => {
    if (initialized && session) router.replace('/dashboard')
  }, [initialized, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await signInWithPassword(email, password)
    if (ok) router.replace('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', padding: 20 }}>
      <Card style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔒</div>
          <h1 style={{ fontSize: 19, fontWeight: 800, color: '#fff', marginBottom: 4 }}>เข้าสู่ระบบผู้ดูแล</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>FormCraft Admin</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Label>อีเมล</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required style={{ marginBottom: 14 }} />

          <Label>รหัสผ่าน</Label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ marginBottom: 16 }} />

          {error && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 14 }}>
              ⚠ {error}
            </div>
          )}

          <Btn type="submit" variant="primary" fullWidth disabled={signingIn}>
            {signingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Btn>
        </form>
      </Card>
    </div>
  )
}
