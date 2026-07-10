'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAppStore, useFormsStore, useUnsavedGuard } from '@/store'
import type { FormConfig, Product, FormPermission } from '@/types'
import { Btn, TabBar, Card, Label, Input, Select, IconBtn, Badge } from '@/components/ui'
import FormBuilder from '@/components/admin/FormBuilder'
import ProductManager from '@/components/admin/ProductManager'
import FormSettings from '@/components/admin/FormSettings'

const BASE_TABS = [
  { id: 'build', label: '🏗️ ฟอร์ม' },
  { id: 'products', label: '🛍️ สินค้า' },
  { id: 'settings', label: '⚙️ ตั้งค่า' },
]
const OWNER_TABS = [...BASE_TABS, { id: 'permissions', label: '🔑 สิทธิ์การเข้าถึง' }]

const ROLE_LABEL: Record<FormPermission['role'], string> = {
  editor: '✏️ แก้ไขได้', submissions: '📥 ดูคำสั่งซื้อ', viewer: '👁️ ดูอย่างเดียว',
}

// ── Permissions tab (owner only) ────────────────────────────────────────────
function PermissionsTab({ formId }: { formId: string }) {
  const { listFormPermissions, grantFormPermission, revokeFormPermission } = useFormsStore()
  const [perms, setPerms] = useState<FormPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<FormPermission['role']>('editor')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setPerms(await listFormPermissions(formId))
    setLoading(false)
  }, [formId, listFormPermissions])

  useEffect(() => { refresh() }, [refresh])

  const handleAdd = async () => {
    if (!email.trim()) return
    setAdding(true)
    setError(null)
    const ok = await grantFormPermission(formId, email, role)
    setAdding(false)
    if (ok) { setEmail(''); refresh() }
    else setError('เพิ่มสิทธิ์ไม่สำเร็จ')
  }

  const handleRevoke = async (targetEmail: string) => {
    if (!window.confirm(`ลบสิทธิ์การเข้าถึงของ ${targetEmail}?`)) return
    await revokeFormPermission(formId, targetEmail)
    refresh()
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>เพิ่มคนเข้าถึงฟอร์มนี้</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          ใส่อีเมลของบัญชีที่จะให้สิทธิ์ — ใช้ได้ทันทีเมื่อเขาเข้าสู่ระบบด้วยอีเมลนั้น (ไม่ว่าจะใช้รหัสผ่านหรือ Google)
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Label>อีเมล</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="someone@example.com" />
          </div>
          <div style={{ width: 170 }}>
            <Label>สิทธิ์</Label>
            <Select value={role} onChange={e => setRole(e.target.value as FormPermission['role'])}>
              <option value="editor">✏️ แก้ไขได้</option>
              <option value="submissions">📥 ดูคำสั่งซื้อ</option>
              <option value="viewer">👁️ ดูอย่างเดียว</option>
            </Select>
          </div>
          <Btn onClick={handleAdd} variant="primary" disabled={adding || !email.trim()}>
            {adding ? 'กำลังเพิ่ม...' : '+ เพิ่ม'}
          </Btn>
        </div>
        {error && <div style={{ color: '#f87171', fontSize: 12, marginTop: 10 }}>⚠ {error}</div>}
      </Card>

      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16 }}>ผู้ที่เข้าถึงได้</h3>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>กำลังโหลด...</div>
        ) : perms.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>ยังไม่มีใครได้รับสิทธิ์เพิ่มเติม (มีแค่คุณในฐานะเจ้าของ)</div>
        ) : perms.map((p) => (
          <div key={p.email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{p.email}</span>
            <Badge>{ROLE_LABEL[p.role]}</Badge>
            <IconBtn onClick={() => handleRevoke(p.email)} title="ลบสิทธิ์">🗑️</IconBtn>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ── No-permission state (role too low for the editor) ───────────────────────
function NoEditPermission() {
  return (
    <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>ไม่มีสิทธิ์แก้ไขฟอร์มนี้</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        บัญชีของคุณมีสิทธิ์ดูข้อมูลเท่านั้น — ติดต่อเจ้าของฟอร์มหากต้องการสิทธิ์แก้ไข
      </p>
    </div>
  )
}

function EditorContent() {
  const searchParams = useSearchParams()
  const formId = searchParams.get('f') || ''
  const [tab, setTab] = useState(searchParams.get('tab') || 'build')
  const { form, products, saveForm, saveProducts, role, currentFormSlug } = useAppStore()

  const canEdit = role === 'owner' || role === 'editor'
  const isOwner = role === 'owner'

  // Edits happen against a local draft only — nothing reaches the DB (and a
  // slip of the mouse can't delete a live topic/field) until "Save Changes"
  // is clicked. The draft re-syncs from the store as long as it's clean, so
  // it still picks up the freshly-loaded data once loadAdminData resolves.
  const [draftForm, setDraftFormState] = useState<FormConfig>(form)
  const [draftProducts, setDraftProductsState] = useState<Product[]>(products)
  const [dirty, setDirty] = useState(false)
  // 'idle' hides the floating bar entirely; 'saved'/'error' show a status
  // that clears itself after a moment (error persists — see handleSave).
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (!dirty) {
      setDraftFormState(form)
      setDraftProductsState(products)
    }
  }, [form, products, dirty])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t) setTab(t)
  }, [searchParams])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const setDraftForm = useCallback((f: FormConfig) => { setDraftFormState(f); setDirty(true); setSaveState('idle') }, [])
  const setDraftProducts = useCallback((p: Product[]) => { setDraftProductsState(p); setDirty(true); setSaveState('idle') }, [])

  const handleSave = useCallback(async (): Promise<boolean> => {
    setSaveState('saving')
    const [formOk, productsOk] = await Promise.all([saveForm(draftForm), saveProducts(draftProducts)])
    if (formOk && productsOk) {
      setDirty(false)
      setSaveState('saved')
      setTimeout(() => setSaveState(s => s === 'saved' ? 'idle' : s), 2500)
      return true
    }
    // Keep dirty=true so the draft (and the retry option) stays put.
    setSaveState('error')
    return false
  }, [draftForm, draftProducts, saveForm, saveProducts])

  const discardDraft = useCallback(() => {
    setDraftFormState(form)
    setDraftProductsState(products)
    setDirty(false)
    setSaveState('idle')
  }, [form, products])

  const handleDiscard = () => {
    if (!window.confirm('ยกเลิกการเปลี่ยนแปลงที่ยังไม่บันทึกทั้งหมด?')) return
    discardDraft()
  }

  // Registers with the global unsaved-changes guard so Sidebar links (and
  // anything else navigating away in-app) get intercepted while dirty —
  // cleanup on unmount clears it so other pages are never blocked.
  const registerHandlers = useUnsavedGuard((s) => s.registerHandlers)
  const clearHandlers = useUnsavedGuard((s) => s.clearHandlers)
  const setGuardDirty = useUnsavedGuard((s) => s.setDirty)

  useEffect(() => { registerHandlers(handleSave, discardDraft) }, [registerHandlers, handleSave, discardDraft])
  useEffect(() => { setGuardDirty(dirty) }, [dirty, setGuardDirty])
  useEffect(() => () => clearHandlers(), [clearHandlers])

  const tabs = isOwner ? OWNER_TABS : BASE_TABS
  const activeTab = tab === 'permissions' && !isOwner ? 'build' : tab
  const showBar = canEdit && (dirty || saveState !== 'idle')

  return (
    <div style={{ padding: '32px 36px' }} className="animate-fadeUp">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>แก้ไขฟอร์ม</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{draftForm.title}</p>
        </div>
        {currentFormSlug && (
          <Link href={`/form?f=${currentFormSlug}`} target="_blank">
            <Btn variant="primary" size="lg">👁️ ดูตัวอย่างฟอร์ม</Btn>
          </Link>
        )}
      </div>

      {/* True CSS sticky — sits in normal flow (pushes content, no overlap)
          until scrolling would carry it off the top of the scroll container,
          then it pins there. Not position:fixed, so it isn't just floating
          detached over everything. */}
      {showBar && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          margin: '0 -36px 20px', padding: '12px 36px',
          background: 'var(--bg-panel)', borderBottom: `1px solid ${saveState === 'error' ? 'rgba(248,113,113,0.4)' : 'var(--border)'}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {saveState === 'saved' ? (
            <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>✅ บันทึกแล้ว</span>
          ) : saveState === 'error' ? (
            <span style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>❌ บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง</span>
          ) : saveState === 'saving' ? (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>⏳ กำลังบันทึก...</span>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--amber)' }}>⚠ มีการเปลี่ยนแปลงที่ยังไม่บันทึก</span>
          )}
          {dirty && (
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <Btn onClick={handleDiscard} variant="ghost" size="sm" disabled={saveState === 'saving'}>ยกเลิก</Btn>
              <Btn onClick={handleSave} variant="primary" size="sm" disabled={saveState === 'saving'}>
                💾 บันทึก
              </Btn>
            </div>
          )}
        </div>
      )}

      <TabBar tabs={tabs} active={activeTab} setActive={setTab} />

      {activeTab === 'permissions' ? (
        <PermissionsTab formId={formId} />
      ) : !canEdit ? (
        <NoEditPermission />
      ) : (
        <>
          {activeTab === 'build' && <FormBuilder form={draftForm} setForm={setDraftForm} />}
          {activeTab === 'products' && <ProductManager products={draftProducts} setProducts={setDraftProducts} />}
          {activeTab === 'settings' && <FormSettings form={draftForm} setForm={setDraftForm} />}
        </>
      )}
    </div>
  )
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditorContent />
    </Suspense>
  )
}
