'use client'

import { useState } from 'react'
import type { Product, ProductVariant } from '@/types'
import ImageSlider from '@/components/ui/ImageSlider'
import { getProductVariants, fmt } from '@/lib/utils'

interface ConfigureModalProps {
  prod: Product
  allProducts: Product[]
  accentColor: string
  onAdd: (data: { selections: Record<string, string>; qty: number }) => void
  onCancel: () => void
}

export default function ConfigureModal({ prod, allProducts, accentColor, onAdd, onCancel }: ConfigureModalProps) {
  const variants = getProductVariants(prod, allProducts)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [qty, setQty] = useState(1)

  const handleAdd = () => {
    const missing = variants.filter(v => v.required && !selections[v.id])
    if (missing.length) {
      alert(`กรุณาเลือก: ${missing.map(v => v.name).join(', ')}`)
      return
    }
    onAdd({ selections: { ...selections }, qty })
  }

  // Gather all images (product + set sub-products)
  const allImages: string[] = [...(prod.images || [])]
  if (prod.type === 'set') {
    ;(prod.setItems || []).forEach(item => {
      const sp = allProducts.find(p => p.id === item.productId)
      if (sp?.images) allImages.push(...sp.images)
    })
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 100, padding: '0 0 0',
      }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div style={{
        background: '#1c1c2e',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 560,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'fadeUp 0.25s ease',
      }}>
        {/* Image slider at top */}
        <ImageSlider
          images={allImages}
          alt={prod.name}
          height={260}
          fallbackEmoji={prod.type === 'set' ? '🎁' : '📦'}
          rounded={false}
        />

        <div style={{ padding: '22px 24px 32px' }}>
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            {prod.type === 'set' && (
              <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                🎁 เซ็ตพิเศษ
              </div>
            )}
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)', marginBottom: 4 }}>
              {prod.name}
            </div>
            {prod.description && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55 }}>
                {prod.description}
              </div>
            )}
            <div style={{ fontSize: 26, fontWeight: 800, color: accentColor, fontFamily: 'var(--font-display)', marginTop: 8 }}>
              ฿{fmt(prod.price)}
            </div>
          </div>

          {/* Set contents */}
          {prod.type === 'set' && (prod.setItems?.length || 0) > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                ประกอบด้วย
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(prod.setItems || []).map(item => {
                  const sp = allProducts.find(p => p.id === item.productId)
                  return (
                    <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 10px' }}>
                      {sp?.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sp.images[0]} alt={sp.name} style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 16 }}>📦</span>
                      )}
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{sp?.name || item.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Variants */}
          {variants.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16, fontStyle: 'italic' }}>
              ไม่มีตัวเลือกเพิ่มเติม
            </div>
          )}
          {variants.map(v => (
            <div key={v.id} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, fontWeight: 600 }}>
                {v.name} {v.required && <span style={{ color: accentColor }}>*</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {v.options.map(opt => {
                  const selected = selections[v.id] === opt
                  return (
                    <button
                      key={opt}
                      onClick={() => setSelections({ ...selections, [v.id]: opt })}
                      style={{
                        padding: '9px 18px', borderRadius: 9, cursor: 'pointer',
                        border: `1.5px solid ${selected ? accentColor : 'rgba(255,255,255,0.12)'}`,
                        background: selected ? accentColor + '22' : 'transparent',
                        color: selected ? accentColor : 'rgba(255,255,255,0.7)',
                        fontSize: 13, fontWeight: selected ? 700 : 400,
                        fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                      }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Qty */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>จำนวน</span>
            <button onClick={() => setQty(Math.max(1, qty - 1))} style={qtyBtn}>−</button>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, width: 32, textAlign: 'center', fontFamily: 'var(--font-display)' }}>{qty}</span>
            <button onClick={() => setQty(qty + 1)} style={qtyBtn}>+</button>
            <span style={{ marginLeft: 'auto', color: accentColor, fontWeight: 800, fontSize: 20, fontFamily: 'var(--font-display)' }}>
              ฿{fmt(prod.price * qty)}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onCancel} style={{
              flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)', borderRadius: 13, padding: '14px 0',
              cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-body)',
            }}>
              ยกเลิก
            </button>
            <button onClick={handleAdd} style={{
              flex: 2, background: accentColor, border: 'none', color: '#fff',
              borderRadius: 13, padding: '14px 0', cursor: 'pointer',
              fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)',
            }}>
              🛒 เพิ่มลงตะกร้า
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const qtyBtn: React.CSSProperties = {
  width: 36, height: 36,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 9, color: '#fff', fontSize: 18, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--font-body)',
}
