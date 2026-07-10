'use client'

import { useState } from 'react'
import { useUnsavedGuard } from '@/store'
import { Btn } from '@/components/ui'

// Rendered once inside AdminShell — pops up whenever something tries to
// navigate away while the editor has unsaved changes (Sidebar links, etc.).
export default function UnsavedGuardModal() {
  const pendingAction = useUnsavedGuard((s) => s.pendingAction)
  const resolvePending = useUnsavedGuard((s) => s.resolvePending)
  const [busy, setBusy] = useState(false)

  if (!pendingAction) return null

  const choose = async (choice: 'save' | 'discard' | 'cancel') => {
    if (choice === 'save') setBusy(true)
    await resolvePending(choice)
    setBusy(false)
  }

  return (
    <div onClick={() => choose('cancel')} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="animate-scaleIn" style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 16,
        padding: 24, maxWidth: 340, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: 34, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>มีการเปลี่ยนแปลงที่ยังไม่บันทึก</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.6 }}>
          ต้องการบันทึกก่อนออกจากหน้านี้ไหม?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn onClick={() => choose('save')} variant="primary" fullWidth disabled={busy}>
            {busy ? 'กำลังบันทึก...' : '💾 บันทึกแล้วไปต่อ'}
          </Btn>
          <Btn onClick={() => choose('discard')} variant="danger" fullWidth disabled={busy}>
            ละทิ้งการเปลี่ยนแปลง
          </Btn>
          <Btn onClick={() => choose('cancel')} variant="ghost" fullWidth disabled={busy}>
            ยกเลิก (อยู่หน้านี้ต่อ)
          </Btn>
        </div>
      </div>
    </div>
  )
}
