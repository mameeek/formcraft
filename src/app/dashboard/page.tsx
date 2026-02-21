'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store'
import { StatCard, Card, Btn } from '@/components/ui'
import { fmt } from '@/lib/utils'

export default function DashboardPage() {
  const { form, submissions, products, loadFromDB } = useAppStore()
  
  useEffect(() => {
    loadFromDB()
  }, [])

  const totalRevenue = submissions.reduce((s, sub) => s + (sub.totalAmount || 0), 0)
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCount = submissions.filter((s) => s.submittedAt?.startsWith(todayStr)).length
  const avgOrder = submissions.length ? Math.round(totalRevenue / submissions.length) : 0

  // Product popularity
  const productMap: Record<string, { name: string; count: number; revenue: number }> = {}
  submissions.forEach((sub) => {
    ;(sub.items || []).forEach((item) => {
      if (!productMap[item.productId]) {
        productMap[item.productId] = { name: item.productName, count: 0, revenue: 0 }
      }
      productMap[item.productId].count++
      productMap[item.productId].revenue += item.unitPrice
    })
  })
  const topProducts = Object.entries(productMap).sort((a, b) => b[1].count - a[1].count).slice(0, 6)
  const recentSubs = [...submissions].reverse().slice(0, 6)

  return (
    <div style={{ padding: '32px 36px' }} className="animate-fadeUp">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 6 }}>สวัสดี 👋</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{form.title}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/editor"><Btn variant="ghost">✏️ แก้ไข</Btn></Link>
          <Link href="/form" target="_blank"><Btn variant="primary">👁️ ดูฟอร์ม →</Btn></Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="คำสั่งซื้อทั้งหมด" value={submissions.length} icon="📦" color="var(--purple)" />
        <StatCard label="วันนี้" value={todayCount} icon="📅" color="var(--green)" />
        <StatCard label="รายได้รวม" value={`฿${fmt(totalRevenue)}`} icon="💰" color="var(--amber)" />
        <StatCard label="เฉลี่ย/ออร์เดอร์" value={avgOrder ? `฿${fmt(avgOrder)}` : '–'} icon="📊" color="var(--blue)" />
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16 }}>สินค้าขายดี</h3>
          {topProducts.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>ยังไม่มีข้อมูล</div>
          ) : topProducts.map(([pid, d]) => (
            <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{d.name}</span>
              <span style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 700 }}>{d.count} ชิ้น</span>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>คำสั่งซื้อล่าสุด</h3>
            {submissions.length > 0 && (
              <Link href="/submissions"><Btn size="sm" variant="ghost">ดูทั้งหมด →</Btn></Link>
            )}
          </div>
          {recentSubs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>ยังไม่มีคำสั่งซื้อ</div>
          ) : recentSubs.map((sub) => (
            <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{sub.customerName || 'ไม่ระบุ'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(sub.submittedAt).toLocaleDateString('th-TH')} · {sub.shippingMethod === 'pickup' ? '🏫 รับเอง' : '📮 ส่ง'}
                </div>
              </div>
              <span style={{ color: 'var(--amber)', fontWeight: 700, fontSize: 13 }}>฿{fmt(sub.totalAmount || 0)}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <Link href="/editor?tab=products"><Btn variant="secondary">🛍️ จัดการสินค้า</Btn></Link>
        <Link href="/submissions"><Btn variant="secondary">📥 ดู & Export คำสั่งซื้อ</Btn></Link>
      </div>
    </div>
  )
}
