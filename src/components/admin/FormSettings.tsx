'use client'

import type { FormConfig } from '@/types'
import { Card, Label, Input } from '@/components/ui'

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'))
    reader.readAsDataURL(file)
  })
}

export default function FormSettings({ form, setForm }: { form: FormConfig; setForm: (f: FormConfig) => void }) {
  const update = (key: keyof FormConfig, val: unknown) => setForm({ ...form, [key]: val })
  const updateShipping = (key: string, val: unknown) => setForm({ ...form, shipping: { ...form.shipping, [key]: val } })

const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('files', file)
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const { urls } = await res.json()
  if (urls?.[0]) update('bannerImage', urls[0])
}

const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('files', file)
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const { urls } = await res.json()
  if (urls?.[0]) update('qrCodeImage', urls[0])
}

  return (
    <div style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Banner */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16 }}>🖼️ Banner หน้าฟอร์ม</h3>
        {form.bannerImage && (
          <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', maxHeight: 140 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.bannerImage} alt="banner" style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        <label style={{ display: 'block', border: '2px dashed var(--border)', borderRadius: 10, padding: '16px 20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}>
          <input type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: 'none' }} />
          <div style={{ fontSize: 24, marginBottom: 6 }}>🖼️</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {form.bannerImage ? 'คลิกเพื่อเปลี่ยน Banner' : 'อัปโหลดรูป Banner'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.6, marginTop: 4 }}>JPG, PNG, WEBP · แนะนำ 1200×300px</div>
        </label>
        {form.bannerImage && (
          <button onClick={() => update('bannerImage', '')} style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>
            ✕ ลบ Banner
          </button>
        )}
      </Card>

      {/* Theme + colors */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16 }}>🎨 ธีมและรูปลักษณ์</h3>

        <Label>ธีม</Label>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {(['dark', 'light'] as const).map(t => (
            <label key={t} style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
              background: form.theme === t ? 'var(--accent-dim)' : 'var(--bg-deep)',
              border: `1.5px solid ${form.theme === t ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <input type="radio" name="theme" value={t} checked={form.theme === t} onChange={() => update('theme', t)} />
              <div>
                <div style={{ fontSize: 20 }}>{t === 'dark' ? '🌙' : '☀️'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t === 'dark' ? 'มืด' : 'สว่าง'}</div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
          <div>
            <Label>สีพื้นหลัง</Label>
            <input type="color" value={form.coverColor} onChange={e => update('coverColor', e.target.value)} style={{ height: 40, width: 90, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'none', padding: 2 }} />
          </div>
          <div>
            <Label>สีเน้น (Accent)</Label>
            <input type="color" value={form.accentColor} onChange={e => update('accentColor', e.target.value)} style={{ height: 40, width: 90, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'none', padding: 2 }} />
          </div>
        </div>

        <Label>Logo Emoji</Label>
        <Input value={form.logoEmoji || ''} onChange={e => update('logoEmoji', e.target.value)} placeholder="🎓" style={{ width: 80 }} />
      </Card>

      {/* Shipping */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16 }}>📮 การจัดส่ง</h3>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={form.shipping?.enabled} onChange={e => updateShipping('enabled', e.target.checked)} />
          เปิดตัวเลือกจัดส่งทางไปรษณีย์
        </label>
        {form.shipping?.enabled && (
          <>
            <Label>ค่าจัดส่ง (฿)</Label>
            <Input type="number" value={String(form.shipping.cost)} onChange={e => updateShipping('cost', Number(e.target.value))} style={{ width: 160 }} />
          </>
        )}
      </Card>

      {/* Payment */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16 }}>💳 การชำระเงิน</h3>

        <Label>QR Code (อัปโหลดรูป)</Label>
        <div style={{ marginBottom: 14 }}>
          {form.qrCodeImage && (
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.qrCodeImage} alt="QR" style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 8, background: '#fff', padding: 4 }} />
              <button onClick={() => update('qrCodeImage', '')} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>✕ ลบ QR</button>
            </div>
          )}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
            <input type="file" accept="image/*" onChange={handleQrUpload} style={{ display: 'none' }} />
            📷 {form.qrCodeImage ? 'เปลี่ยน QR Code' : 'อัปโหลด QR Code'}
          </label>
        </div>

        <Label>เลข PromptPay</Label>
        <Input value={form.promptPayId || ''} onChange={e => update('promptPayId', e.target.value)} placeholder="0XX-XXX-XXXX" style={{ marginBottom: 12 }} />

        <Label>หมายเหตุการชำระ</Label>
        <Input value={form.paymentNote || ''} onChange={e => update('paymentNote', e.target.value)} placeholder="เช่น โอนผ่าน PromptPay แล้วแนบสลิป" />
      </Card>
    </div>
  )
}
