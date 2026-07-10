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

  const handleSave = async () => {
    setSaveState('saving')
    const [formOk, productsOk] = await Promise.all([saveForm(draftForm), saveProducts(draftProducts)])
    if (formOk && productsOk) {
      setDirty(false)
      setSaveState('saved')
      setTimeout(() => setSaveState(s => s === 'saved' ? 'idle' : s), 2500)
    } else {
      // Keep dirty=true so the draft (and the retry option) stays put.
      setSaveState('error')
    }
  }

  const handleDiscard = () => {
    if (!window.confirm('ยกเลิกการเปลี่ยนแปลงที่ยังไม่บันทึกทั้งหมด?')) return
    setDraftFormState(form)
    setDraftProductsState(products)
    setDirty(false)
    setSaveState('idle')
  }

  return (
    <div style={{ padding: '32px 36px 90px' }} className="animate-fadeUp">
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
      {tab === 'build' && <FormBuilder form={draftForm} setForm={setDraftForm} />}
      {tab === 'products' && <ProductManager products={draftProducts} setProducts={setDraftProducts} />}
      {tab === 'settings' && <FormSettings form={draftForm} setForm={setDraftForm} />}

      {(dirty || saveState !== 'idle') && (
        <div className="animate-fadeUp" style={{
          position: 'fixed', right: 28, bottom: 28, zIndex: 200,
          background: 'var(--bg-panel)', border: `1px solid ${saveState === 'error' ? 'rgba(248,113,113,0.4)' : 'var(--border)'}`,
          borderRadius: 14, padding: '14px 16px', boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', gap: 12, minWidth: 280,
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
