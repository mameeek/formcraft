'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAppStore } from '@/store'
import { Btn, TabBar } from '@/components/ui'
import FormBuilder from '@/components/admin/FormBuilder'
import ProductManager from '@/components/admin/ProductManager'
import FormSettings from '@/components/admin/FormSettings'

const TABS = [
  { id: 'build', label: '🏗️ ฟอร์ม' },
  { id: 'products', label: '🛍️ สินค้า' },
  { id: 'settings', label: '⚙️ ตั้งค่า' },
]

export default function EditorPage() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'build')
  const { form, setForm, saveForm, products, setProducts, saveProducts } = useAppStore()

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t) setTab(t)
  }, [searchParams])

  return (
    <div style={{ padding: '32px 36px' }} className="animate-fadeUp">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>แก้ไขฟอร์ม</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{form.title}</p>
        </div>
        <Link href="/form" target="_blank">
          <Btn variant="primary" size="lg">👁️ ดูตัวอย่างฟอร์ม</Btn>
        </Link>
      </div>

      <TabBar tabs={TABS} active={tab} setActive={setTab} />

      {tab === 'build' && <FormBuilder form={form} setForm={(f) => saveForm(f)} />}
      {tab === 'products' && <ProductManager products={products} setProducts={(p) => saveProducts(p)} />}
      {tab === 'settings' && <FormSettings form={form} setForm={(f) => saveForm(f)} />}
    </div>
  )
}
