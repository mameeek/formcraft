'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAppStore } from '@/store'
import type { FormConfig, Product } from '@/types'
import { Btn, TabBar } from '@/components/ui'
import FormBuilder from '@/components/admin/FormBuilder'
import ProductManager from '@/components/admin/ProductManager'
import FormSettings from '@/components/admin/FormSettings'

const TABS = [
  { id: 'build', label: '🏗️ ฟอร์ม' },
  { id: 'products', label: '🛍️ สินค้า' },
  { id: 'settings', label: '⚙️ ตั้งค่า' },
]

function EditorContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'build')
  const { form, products, saveForm, saveProducts } = useAppStore()

  // Edits happen against a local draft only — nothing reaches the DB (and a
  // slip of the mouse can't delete a live topic/field) until "Save Changes"
  // is clicked. The draft re-syncs from the store as long as it's clean, so
  // it still picks up the freshly-loaded data once loadAdminData resolves.
  const [draftForm, setDraftFormState] = useState<FormConfig>(form)
  const [draftProducts, setDraftProductsState] = useState<Product[]>(products)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

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

  const setDraftForm = useCallback((f: FormConfig) => { setDraftFormState(f); setDirty(true) }, [])
  const setDraftProducts = useCallback((p: Product[]) => { setDraftProductsState(p); setDirty(true) }, [])

  const handleSave = async () => {
    setSaving(true)
    await Promise.all([saveForm(draftForm), saveProducts(draftProducts)])
    setSaving(false)
    setDirty(false)
  }

  const handleDiscard = () => {
    if (!window.confirm('ยกเลิกการเปลี่ยนแปลงที่ยังไม่บันทึกทั้งหมด?')) return
    setDraftFormState(form)
    setDraftProductsState(products)
    setDirty(false)
  }

  return (
    <div style={{ padding: '32px 36px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className="animate-fadeUp">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>แก้ไขฟอร์ม</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{draftForm.title}</p>
        </div>
        <Link href="/form" target="_blank">
          <Btn variant="primary" size="lg">👁️ ดูตัวอย่างฟอร์ม</Btn>
        </Link>
      </div>
      <TabBar tabs={TABS} active={tab} setActive={setTab} />
      <div style={{ flex: 1 }}>
        {tab === 'build' && <FormBuilder form={draftForm} setForm={setDraftForm} />}
        {tab === 'products' && <ProductManager products={draftProducts} setProducts={setDraftProducts} />}
        {tab === 'settings' && <FormSettings form={draftForm} setForm={setDraftForm} />}
      </div>

      {dirty && (
        <div style={{
          position: 'sticky', bottom: 0, marginTop: 24, marginLeft: -36, marginRight: -36, marginBottom: -32,
          background: 'var(--bg-panel)', borderTop: '1px solid var(--border)', padding: '14px 36px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, zIndex: 100,
        }}>
          <span style={{ fontSize: 13, color: 'var(--amber)' }}>⚠ มีการเปลี่ยนแปลงที่ยังไม่บันทึก</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={handleDiscard} variant="ghost" disabled={saving}>ยกเลิกการแก้ไข</Btn>
            <Btn onClick={handleSave} variant="primary" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : '💾 บันทึกการเปลี่ยนแปลง'}
            </Btn>
          </div>
        </div>
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
