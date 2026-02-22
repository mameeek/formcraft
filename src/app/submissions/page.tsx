'use client'

import { useState, useMemo } from 'react'
import { useAppStore } from '@/store'
import type { Submission, PaymentStatus } from '@/types'
import { Btn, TabBar, Card, StatCard } from '@/components/ui'
import { fmt, exportSubmissionsCSV, buildReceiptLines } from '@/lib/utils'

const STATUS_COLOR: Record<PaymentStatus, string> = {
  pending: 'var(--amber)', confirmed: 'var(--green)', rejected: '#f87171'
}
const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: '⏳ รอยืนยัน', confirmed: '✅ ยืนยันแล้ว', rejected: '❌ ปฏิเสธ'
}

// ─── Expandable row ────────────────────────────────────────────────────────────
function SlipLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="slip" style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: 12, objectFit: 'contain', display: 'block' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: -14, right: -14, background: '#fff', border: 'none', borderRadius: '50%', width: 34, height: 34, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
    </div>
  )
}

function SubmissionRow({ sub, onConfirm, form }: {
  sub: Submission
  onConfirm: (id: string, status: PaymentStatus, note?: string) => void
  form: AppStore['form']
}) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState(sub.paymentNote || '')
  const [slipLightbox, setSlipLightbox] = useState(false)

  return (
    <>
      <tr onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', background: expanded ? 'var(--bg-panel)' : 'transparent', transition: 'background 0.15s' }}>
        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>
          {new Date(sub.submittedAt).toLocaleDateString('th-TH')}<br />
          <span style={{ fontSize: 10 }}>{new Date(sub.submittedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
        </td>
        <td style={{ padding: '11px 14px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>{sub.customerName || '–'}</td>
        <td style={{ padding: '11px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>{sub.customerPhone || '–'}</td>
        <td style={{ padding: '11px 14px', maxWidth: 180 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {(sub.items || []).map(i => i.productName).join(', ')}
          </div>
        </td>
        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', fontSize: 12 }}>
          {sub.shippingMethod === 'pickup' ? <span style={{ color: 'var(--green)' }}>🏫 รับเอง</span> : <span style={{ color: 'var(--blue)' }}>📮 ส่ง</span>}
        </td>
        <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--amber)', whiteSpace: 'nowrap' }}>฿{fmt(sub.totalAmount || 0)}</td>
        <td style={{ padding: '11px 14px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[sub.paymentStatus], background: STATUS_COLOR[sub.paymentStatus] + '22', borderRadius: 12, padding: '3px 8px' }}>
            {STATUS_LABEL[sub.paymentStatus]}
          </span>
        </td>
        <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 14 }}>{expanded ? '▲' : '▼'}</td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={8} style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', padding: 0 }}>
            <div style={{ padding: '16px 16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Items */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>รายการสินค้า</div>
                  {(sub.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, background: 'var(--bg-deep)', borderRadius: 9, padding: '9px 12px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-panel)' }}>
                        {item.productImages?.[0]
                          ? <img src={item.productImages[0]} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 18 }}>📦</div>}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{item.productName} × {item.qty}</div>
                        {!item.isSet && Object.values(item.variantSelections).map(v => (
                          <span key={v} style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 4 }}>{v}</span>
                        ))}
                        {item.isSet && (item.setDetails || []).map((d, j) => (
                          <div key={j} style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.productName}{d.variantLabel ? ': ' + d.variantLabel : ''}</div>
                        ))}
                        <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700, marginTop: 2 }}>฿{fmt(item.unitPrice * item.qty)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>การชำระเงิน</div>
                  <div style={{ background: 'var(--bg-deep)', borderRadius: 10, padding: 14 }}>
                    {sub.paymentSlip ? (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>สลิปโอนเงิน</div>
                        <div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={sub.paymentSlip!} alt="slip"
                            onClick={() => setSlipLightbox(true)}
                            style={{ maxWidth: '100%', maxHeight: 130, borderRadius: 8, border: '1px solid var(--border)', display: 'block', cursor: 'zoom-in' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <button onClick={() => setSlipLightbox(true)} style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--blue)', fontSize: 11, cursor: 'pointer', padding: 0 }}>🔍 ดูรูปเต็ม</button>
                          {slipLightbox && <SlipLightbox src={sub.paymentSlip!} onClose={() => setSlipLightbox(false)} />}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>ไม่มีสลิป</div>
                    )}

                    {/* Confirm/reject buttons */}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>หมายเหตุ</div>
                    <input value={note} onChange={e => setNote(e.target.value)} placeholder="หมายเหตุการยืนยัน" style={{ width: '100%', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 7, color: '#fff', fontSize: 12, padding: '7px 10px', marginBottom: 10, outline: 'none' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => onConfirm(sub.id, 'confirmed', note)} style={{ flex: 1, background: 'var(--green)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>✅ ยืนยัน</button>
                      <button onClick={() => onConfirm(sub.id, 'rejected', note)} style={{ flex: 1, background: 'transparent', border: '1px solid #f87171', color: '#f87171', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>❌ ปฏิเสธ</button>
                      {sub.paymentStatus !== 'pending' && (
                        <button onClick={() => onConfirm(sub.id, 'pending', '')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>รีเซ็ต</button>
                      )}
                    </div>

                    {sub.paymentConfirmedAt && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
                        ยืนยันเมื่อ: {new Date(sub.paymentConfirmedAt).toLocaleString('th-TH')}
                      </div>
                    )}
                  </div>

                  {/* Form answers */}
                  <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>ข้อมูลที่กรอก</div>
                  {form.sections.flatMap(s => s.fields).map(f => {
                    const v = sub.fieldValues?.[f.id]
                    if (!v) return null
                    return (
                      <div key={f.id} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{f.label}:</span>{v}
                      </div>
                    )
                  })}
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>ID:</span> <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{sub.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Answers view (field responses) ───────────────────────────────────────────
function AnswersView({ submissions, form }: { submissions: Submission[]; form: AppStore["form"] }) {
  const allFields = form.sections.flatMap(s => s.fields)
  const [filter, setFilter] = useState("")

  const filtered = submissions.filter(s =>
    !filter || s.customerName?.toLowerCase().includes(filter.toLowerCase()) ||
    s.customerPhone?.includes(filter) || s.id.includes(filter)
  )

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="🔍 ค้นหาด้วยชื่อ, เบอร์, ID..."
          style={{ background: "var(--bg-deep)", border: "1px solid var(--border)", borderRadius: 9, color: "#fff", fontSize: 13, padding: "9px 14px", width: "100%", maxWidth: 360, outline: "none" }} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--bg-deep)" }}>
              <th style={th}>ID</th>
              <th style={th}>วันที่</th>
              {allFields.map(f => <th key={f.id} style={th}>{f.label}</th>)}
              <th style={th}>จัดส่ง</th>
              <th style={th}>ยอดรวม</th>
              <th style={th}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(sub => (
              <tr key={sub.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={td}><span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)" }}>{sub.id.slice(0, 7)}</span></td>
                <td style={td}>{new Date(sub.submittedAt).toLocaleDateString("th-TH")}</td>
                {allFields.map(f => <td key={f.id} style={td}>{sub.fieldValues?.[f.id] || "–"}</td>)}
                <td style={td}>{sub.shippingMethod === "pickup" ? "รับเอง" : "ส่ง"}</td>
                <td style={{ ...td, color: "var(--amber)", fontWeight: 700 }}>฿{fmt(sub.totalAmount || 0)}</td>
                <td style={td}>
                  <span style={{ color: STATUS_COLOR[sub.paymentStatus], fontSize: 11 }}>{STATUS_LABEL[sub.paymentStatus]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>ไม่พบข้อมูล</div>}
      </div>
    </div>
  )
}

// ─── CSV preview ───────────────────────────────────────────────────────────────
function CsvView({ submissions, products, form }: {
  submissions: Submission[]
  products: AppStore["products"]
  form: AppStore["form"]
}) {
  const [filter, setFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("all")
  const formFields = form.sections.flatMap(s => s.fields).map(f => ({ id: f.id, label: f.label }))

  const filtered = submissions.filter(s => {
    const matchStatus = statusFilter === "all" || s.paymentStatus === statusFilter
    const matchText = !filter || s.customerName?.toLowerCase().includes(filter.toLowerCase()) || s.customerPhone?.includes(filter)
    return matchStatus && matchText
  })

  const singleProds = products.filter(p => p.type === "single")
  const setProds = products.filter(p => p.type === "set")

  const buildProductCol = (sub: Submission, prod: (typeof singleProds)[0]) => {
    const bought = (sub.items || []).filter(i => i.productId === prod.id)
    if (!bought.length) return "0"
    if (prod.type === "single") {
      return bought.map(i => {
        const codes = Object.values(i.variantCodes).filter(Boolean).join("_")
        return `${codes ? prod.code + "_" + codes : prod.code}*${i.qty}`
      }).join(";") || "0"
    }
    return bought.map(i => {
      const inner = (i.setDetails || []).map(d => {
        const vc = d.variantCode ? `${d.productCode}_${d.variantCode}` : d.productCode
        return `${vc}*1`
      }).join("/")
      return `${prod.code}_(${inner})@${i.qty}`
    }).join(";") || "0"
  }

  const headers = [...formFields.map(f => f.label), "จัดส่ง", "ยอดรวม", "สถานะ", ...singleProds.map(p => p.code), ...setProds.map(p => p.code)]

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="🔍 ค้นหา..."
          style={{ background: "var(--bg-deep)", border: "1px solid var(--border)", borderRadius: 9, color: "#fff", fontSize: 13, padding: "9px 14px", flex: 1, minWidth: 200, outline: "none" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | "pending" | "confirmed" | "rejected")}
          style={{ background: "var(--bg-deep)", border: "1px solid var(--border)", borderRadius: 9, color: "#fff", fontSize: 13, padding: "9px 14px", cursor: "pointer" }}>
          <option value="all">ทั้งหมด</option>
          <option value="pending">รอยืนยัน</option>
          <option value="confirmed">ยืนยันแล้ว</option>
          <option value="rejected">ปฏิเสธ</option>
        </select>
        <Btn onClick={() => exportSubmissionsCSV(filtered, products, false, formFields)} variant="secondary" size="sm">⬇ Export ({filtered.length})</Btn>
        <Btn onClick={() => exportSubmissionsCSV(filtered.filter(s => s.paymentStatus === "confirmed"), products, true, formFields)} variant="secondary" size="sm">⬇ ยืนยันแล้ว</Btn>
      </div>

      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 800 }}>
          <thead>
            <tr style={{ background: "var(--bg-deep)" }}>
              {headers.map(h => (
                <th key={h} style={{ ...th, fontFamily: /^[a-z_]+$/.test(h) ? "monospace" : "inherit", fontSize: /^[a-z_]+$/.test(h) ? 10 : 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(sub => (
              <tr key={sub.id} style={{ borderBottom: "1px solid var(--border)" }}>
                {formFields.map(f => <td key={f.id} style={td}>{sub.fieldValues?.[f.id] || "–"}</td>)}
                <td style={td}>{sub.shippingMethod === "pickup" ? "รับเอง" : "ส่ง"}</td>
                <td style={{ ...td, color: "var(--amber)", fontWeight: 700 }}>฿{fmt(sub.totalAmount || 0)}</td>
                <td style={td}><span style={{ color: STATUS_COLOR[sub.paymentStatus], fontSize: 10 }}>{STATUS_LABEL[sub.paymentStatus]}</span></td>
                {[...singleProds, ...setProds].map(prod => (
                  <td key={prod.id} style={{ ...td, fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)" }}>
                    {buildProductCol(sub, prod)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>ไม่พบข้อมูล</div>}
      </div>

      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
        แสดง {filtered.length} จาก {submissions.length} รายการ
      </div>
    </div>
  )
}

// ─── Summary ───────────────────────────────────────────────────────────────────
function SummaryView({ submissions, products }: { submissions: Submission[]; products: AppStore['products'] }) {
  const confirmed = submissions.filter(s => s.paymentStatus === 'confirmed')
  const pending = submissions.filter(s => s.paymentStatus === 'pending')
  const totalRevenue = confirmed.reduce((s, sub) => s + (sub.totalAmount || 0), 0)
  const avgOrder = confirmed.length ? Math.round(totalRevenue / confirmed.length) : 0

  const productMap: Record<string, { name: string; count: number; revenue: number }> = {}
  submissions.forEach(sub => {
    ;(sub.items || []).forEach(item => {
      if (!productMap[item.productId]) productMap[item.productId] = { name: item.productName, count: 0, revenue: 0 }
      productMap[item.productId].count += item.qty
      productMap[item.productId].revenue += item.unitPrice * item.qty
    })
  })
  const productList = Object.entries(productMap).sort((a, b) => b[1].count - a[1].count)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard label="คำสั่งซื้อทั้งหมด" value={submissions.length} icon="📦" color="var(--purple)" />
        <StatCard label="ยืนยันแล้ว" value={confirmed.length} icon="✅" color="var(--green)" />
        <StatCard label="รอยืนยัน" value={pending.length} icon="⏳" color="var(--amber)" />
        <StatCard label="รายได้ (ยืนยัน)" value={`฿${fmt(totalRevenue)}`} icon="💰" color="var(--amber)" />
        <StatCard label="เฉลี่ย/ออร์เดอร์" value={avgOrder ? `฿${fmt(avgOrder)}` : '–'} icon="📊" color="var(--blue)" />
      </div>
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16 }}>สรุปยอดสินค้า</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>สินค้า</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>จำนวน</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>มูลค่า</span>
        </div>
        {productList.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>ยังไม่มีข้อมูล</div>
        ) : productList.map(([pid, d]) => (
          <div key={pid} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px', padding: '9px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>{d.name}</span>
            <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--purple)', fontWeight: 700 }}>{d.count} ชิ้น</span>
            <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--amber)', fontWeight: 700 }}>฿{fmt(d.revenue)}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'table',   label: '📋 คำตอบ' },
  { id: 'csv',     label: '📊 ตาราง' },
  { id: 'payment', label: '💳 ยืนยันชำระ' },
  { id: 'summary', label: '📈 สรุป' },
]

const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'var(--bg-deep)' }
const td: React.CSSProperties = { padding: '10px 12px', color: 'var(--text-secondary)', verticalAlign: 'top' }

export default function SubmissionsPage() {
  const { submissions, form, products, updateSubmissionPayment, loading } = useAppStore()
  const [tab, setTab] = useState('table')

  if (loading) return (
    <div style={{ padding: '32px 36px' }} className="animate-fadeUp">
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ width: 160, height: 28, background: 'rgba(255,255,255,0.07)', borderRadius: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />
          <div style={{ width: 200, height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />
        </div>
        <div style={{ width: 120, height: 36, background: 'rgba(255,255,255,0.07)', borderRadius: 8, animation: 'pulse 1.4s ease-in-out infinite' }} />
      </div>

      {/* Tab skeleton */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[80, 70, 90, 60].map((w, i) => (
          <div key={i} style={{ width: w, height: 32, background: 'rgba(255,255,255,0.07)', borderRadius: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
      </div>

      {/* Table skeleton */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-deep)' }}>
              {['วันที่', 'ชื่อ', 'เบอร์', 'สินค้า', 'จัดส่ง', 'ยอดรวม', 'สถานะ', ''].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(6)].map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                {[60, 100, 80, 140, 60, 60, 80, 20].map((w, j) => (
                  <td key={j} style={{ padding: '14px 12px' }}>
                    <div style={{ width: w, height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 4, animation: 'pulse 1.4s ease-in-out infinite' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '32px 36px' }} className="animate-fadeUp">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>คำสั่งซื้อ</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{submissions.length} รายการ · ยืนยันแล้ว {submissions.filter(s => s.paymentStatus === 'confirmed').length}</p>
        </div>
        <Btn onClick={() => exportSubmissionsCSV(submissions, products, false, form.sections.flatMap(s => s.fields).map(f => ({ id: f.id, label: f.label })))} variant="secondary" disabled={submissions.length === 0}>
          📥 Export CSV
        </Btn>
      </div>

      <TabBar tabs={TABS} active={tab} setActive={setTab} />

      {tab === 'table' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-deep)' }}>
                {['วันที่', 'ชื่อ', 'เบอร์', 'สินค้า', 'จัดส่ง', 'ยอดรวม', 'สถานะ', ''].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...submissions].reverse().map(sub => (
                <SubmissionRow key={sub.id} sub={sub} form={form} onConfirm={updateSubmissionPayment} />
              ))}
            </tbody>
          </table>
          {submissions.length === 0 && <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>ยังไม่มีคำสั่งซื้อ</div>}
        </div>
      )}

      {tab === 'csv' && <CsvView submissions={submissions} products={products} form={form} />}

      {tab === 'payment' && (
        <div>
          <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>กดที่รายการเพื่อดูสลิปและยืนยันการชำระเงิน</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)' }}>
                  {['วันที่', 'ชื่อ', 'เบอร์', 'สินค้า', 'จัดส่ง', 'ยอดรวม', 'สถานะ', ''].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...submissions].filter(s => s.paymentStatus !== 'confirmed').reverse().map(sub => (
                  <SubmissionRow key={sub.id} sub={sub} form={form} onConfirm={updateSubmissionPayment} />
                ))}
                {submissions.filter(s => s.paymentStatus !== 'confirmed').length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>ยืนยันครบทุกรายการแล้ว ✅</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'summary' && <SummaryView submissions={submissions} products={products} />}
    </div>
  )
}
