'use client'

import type { Product } from '@/types'
import ImageSlider from '@/components/ui/ImageSlider'
import { fmt } from '@/lib/utils'

interface ProductCardProps {
  prod: Product
  accentColor: string
  onAdd: () => void
  cartCount: number
}

export default function ProductCard({ prod, accentColor, onAdd, cartCount }: ProductCardProps) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${cartCount > 0 ? accentColor + '66' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 16, overflow: 'hidden',
      position: 'relative', transition: 'all 0.2s',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Cart badge */}
      {cartCount > 0 && (
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 5,
          background: accentColor, color: '#fff',
          borderRadius: '50%', width: 24, height: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {cartCount}
        </div>
      )}

      {/* Image slider */}
      <ImageSlider
        images={prod.images}
        alt={prod.name}
        height={180}
        fallbackEmoji={prod.type === 'set' ? '🎁' : '📦'}
      />

      {/* Info */}
      <div style={{ padding: '14px 14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {prod.type === 'set' && (
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
            color: accentColor, textTransform: 'uppercase', marginBottom: 4,
          }}>
            🎁 เซ็ตพิเศษ
          </div>
        )}

        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4, lineHeight: 1.4, flex: 1 }}>
          {prod.name}
        </div>

        {prod.description && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, lineHeight: 1.5 }}>
            {prod.description}
          </div>
        )}

        {prod.type === 'single' && prod.variants.length > 0 && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
            {prod.variants.map(v => v.name).join(' · ')}
          </div>
        )}

        {prod.type === 'set' && (prod.setItems?.length || 0) > 0 && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
            {prod.setItems?.length} รายการในเซ็ต
          </div>
        )}

        <div style={{
          fontSize: 20, fontWeight: 800, color: accentColor,
          fontFamily: 'var(--font-display)', marginBottom: 12,
        }}>
          ฿{fmt(prod.price)}
        </div>

        <button
          onClick={onAdd}
          style={{
            width: '100%',
            background: cartCount > 0 ? accentColor : 'transparent',
            border: `1.5px solid ${accentColor}`,
            color: cartCount > 0 ? '#fff' : accentColor,
            borderRadius: 9, padding: '9px 0',
            cursor: 'pointer', fontSize: 13, fontWeight: 700,
            fontFamily: 'var(--font-body)', transition: 'all 0.15s',
          }}
        >
          {cartCount > 0 ? `+ เพิ่มอีก` : '+ เพิ่มลงตะกร้า'}
        </button>
      </div>
    </div>
  )
}
