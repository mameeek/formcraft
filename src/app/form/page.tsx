'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useAppStore, useCartStore } from '@/store'
import type { CartItem, FormField, Product, ProductVariant, FieldCondition } from '@/types'
import { getProductVariants, fmt, buildReceiptLines } from '@/lib/utils'

// ─── Theme ────────────────────────────────────────────────────────────────────
function useTheme() {
  // Always light theme on public form
  const accent = '#e94560'
  const bg = '#f5f5f7'
  const text = '#111'
  const subtext = 'rgba(0,0,0,0.45)'
  const cardBg = 'rgba(0,0,0,0.04)'
  const cardBorder = 'rgba(0,0,0,0.1)'
  return { accent, bg, text, subtext, cardBg, cardBorder }
}

// ─── Condition evaluator ───────────────────────────────────────────────────────
function evalCond(cond: FieldCondition | null | undefined, vals: Record<string, string>, ship: string): boolean {
  if (!cond) return true
  const actual = cond.fieldId === '__shipping__' ? ship : (vals[cond.fieldId] || '')
  if (cond.operator === 'equals')     return actual === cond.value
  if (cond.operator === 'not_equals') return actual !== cond.value
  if (cond.operator === 'contains')   return actual.includes(cond.value)
  return true
}

// ─── Step tabs ─────────────────────────────────────────────────────────────────
const STEPS = ['info', 'products', 'cart', 'payment'] as const
type Step = typeof STEPS[number]
const STEP_LABELS: Record<Step, string> = { info: 'ข้อมูล', products: 'สินค้า', cart: 'ตะกร้า', payment: 'ชำระเงิน' }

function StepTabs({ current, setCurrent, accent, subtext, canGoTo }: {
  current: Step; setCurrent: (s: Step) => void; accent: string; subtext: string
  canGoTo: (s: Step) => boolean
}) {
  const idx = STEPS.indexOf(current)
  return (
    <div style={{ display: 'flex', marginTop: 12 }}>
      {STEPS.map((s, i) => {
        const allowed = canGoTo(s)
        return (
          <button key={s}
            onClick={() => allowed && setCurrent(s)}
            style={{
              flex: 1, textAlign: 'center', fontSize: 11, fontWeight: i <= idx ? 700 : 400,
              color: i <= idx ? accent : !allowed ? 'rgba(0,0,0,0.2)' : subtext,
              paddingBottom: 8, background: 'none', border: 'none',
              borderBottom: `2px solid ${i <= idx ? accent : 'rgba(0,0,0,0.1)'}`,
              transition: 'all 0.25s',
              cursor: allowed ? 'pointer' : 'not-allowed',
            }}>
            {STEP_LABELS[s]}
          </button>
        )
      })}
    </div>
  )
}

// ─── Lightbox (proper popup, not fullscreen div) ──────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="full" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain', display: 'block' }} />
        <button onClick={onClose} style={{
          position: 'absolute', top: -14, right: -14,
          background: '#fff', border: 'none', borderRadius: '50%', width: 34, height: 34,
          fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333',
        }}>✕</button>
      </div>
    </div>
  )
}

// ─── Product card image slider (click → open modal, not lightbox) ─────────────
function CardImageSlider({ images, name, aspectRatio, onCardClick }: {
  images: string[]; name: string; aspectRatio?: string; onCardClick: () => void
}) {
  const [current, setCurrent] = useState(0)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const validImgs = images.filter(Boolean)
  const ratio = aspectRatio === '4/3' ? '4/3' : aspectRatio === '3/4' ? '3/4' : aspectRatio === '16/9' ? '16/9' : '1/1'

  if (!validImgs.length) return (
    <div onClick={onCardClick} style={{ aspectRatio: ratio, background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, cursor: 'pointer', borderRadius: '12px 12px 0 0' }}>
      📦
    </div>
  )

  return (
    <>
      <div style={{ aspectRatio: ratio, position: 'relative', overflow: 'hidden', borderRadius: '12px 12px 0 0', background: '#eee' }}>
        {validImgs.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt={name}
            onClick={onCardClick}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: i === current ? 1 : 0, transition: 'opacity 0.3s', cursor: 'pointer' }}
          />
        ))}
        {/* Navigation arrows — only for multi-image, stop propagation so card click != nav */}
        {validImgs.length > 1 && <>
          <button onClick={e => { e.stopPropagation(); setCurrent(c => (c - 1 + validImgs.length) % validImgs.length) }}
            style={{ ...arrowStyle, left: 6 }}>‹</button>
          <button onClick={e => { e.stopPropagation(); setCurrent(c => (c + 1) % validImgs.length) }}
            style={{ ...arrowStyle, right: 6 }}>›</button>
          <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 2 }}>
            {validImgs.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setCurrent(i) }}
                className={`slider-dot ${i === current ? 'active' : ''}`} />
            ))}
          </div>
        </>}
      </div>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  )
}

// ─── Modal image slider (click → lightbox) ───────────────────────────────────
function ModalImageSlider({ images, name }: { images: string[]; name: string }) {
  const [current, setCurrent] = useState(0)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const validImgs = images.filter(Boolean)

  // reset if images change (variant switch)
  const prev = useRef(images)
  if (prev.current !== images) { prev.current = images; if (current >= validImgs.length) setCurrent(0) }

  if (!validImgs.length) return (
    <div style={{ height: 240, background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>📦</div>
  )

  return (
    <>
      <div style={{ height: 260, position: 'relative', background: '#f0f0f0', overflow: 'hidden', cursor: 'zoom-in' }}>
        {validImgs.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt={name} onClick={() => setLightbox(src)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: i === current ? 1 : 0, transition: 'opacity 0.3s' }}
          />
        ))}
        {validImgs.length > 1 && <>
          <button onClick={e => { e.stopPropagation(); setCurrent(c => (c - 1 + validImgs.length) % validImgs.length) }}
            style={{ ...arrowStyle, left: 8 }}>‹</button>
          <button onClick={e => { e.stopPropagation(); setCurrent(c => (c + 1) % validImgs.length) }}
            style={{ ...arrowStyle, right: 8 }}>›</button>
          <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 2 }}>
            {validImgs.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setCurrent(i) }}
                className={`slider-dot ${i === current ? 'active' : ''}`} />
            ))}
          </div>
        </>}
        <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 10, color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.4)', borderRadius: 4, padding: '2px 6px', pointerEvents: 'none' }}>
          กดรูปเพื่อขยาย
        </div>
      </div>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  )
}

const arrowStyle: React.CSSProperties = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 2,
  background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
  borderRadius: 8, width: 28, height: 28, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
}

// ─── Virtual product interface ─────────────────────────────────────────────────
interface VirtualProduct {
  realProductId: string; variantId: string; optionId: string; optionLabel: string; optionCode: string
  name: string; code: string; price: number; images: string[]; tags?: string[]; aspectRatio?: string
}

// ─── Product Card (grid) ──────────────────────────────────────────────────────
function ProductCard({ prod, virtual, cartItems, accent, cardBg, cardBorder, text, subtext, onOpen }: {
  prod: Product; virtual?: VirtualProduct
  cartItems: CartItem[]; accent: string; cardBg: string; cardBorder: string; text: string; subtext: string
  onOpen: () => void
}) {
  const name   = virtual ? virtual.name   : prod.name
  const images = virtual ? virtual.images : prod.images
  const cartCount = virtual
    ? cartItems.filter(c => c.productId === prod.id && c.variantSelections[virtual.variantId] === virtual.optionLabel).reduce((s, c) => s + c.qty, 0)
    : cartItems.filter(c => c.productId === prod.id).reduce((s, c) => s + c.qty, 0)

  return (
    <div style={{ background: cardBg, border: `1.5px solid ${cartCount > 0 ? accent + '80' : cardBorder}`, borderRadius: 13, overflow: 'hidden', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.15s' }}>
      {cartCount > 0 && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 5, background: accent, color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{cartCount}</div>
      )}
      <CardImageSlider images={images} name={name} aspectRatio={prod.aspectRatio} onCardClick={onOpen} />
      <div onClick={onOpen} style={{ padding: '10px 12px 13px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {prod.type === 'set' && <div style={{ fontSize: 9, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>🎁 เซ็ต</div>}
        <div style={{ fontSize: 13, fontWeight: 700, color: text, lineHeight: 1.35, marginBottom: 4 }}>{name}</div>
        {prod.type === 'set' && (prod.setItems?.length || 0) > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 5 }}>
            {prod.setItems!.map(si => <span key={si.productId} style={{ fontSize: 10, background: accent + '15', color: accent, borderRadius: 4, padding: '1px 6px' }}>{si.label}</span>)}
          </div>
        )}
        {prod.tags && prod.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 5 }}>
            {prod.tags.map(t => <span key={t} style={{ fontSize: 10, background: 'rgba(0,0,0,0.06)', color: subtext, borderRadius: 4, padding: '1px 6px' }}>{t}</span>)}
          </div>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 5 }}>
          {prod.originalPrice && <div style={{ fontSize: 11, color: subtext, textDecoration: 'line-through' }}>฿{fmt(prod.originalPrice)}</div>}
          <div style={{ fontSize: 17, fontWeight: 800, color: accent }}>฿{fmt(prod.price)}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Configure Modal ──────────────────────────────────────────────────────────
function ConfigureModal({ prod, allProducts, accent, cardBg, cardBorder, text, subtext,
  cartItems, prefillVariant, updateQty, addItem, onClose }: {
  prod: Product; allProducts: Product[]
  accent: string; cardBg: string; cardBorder: string; text: string; subtext: string
  cartItems: CartItem[]
  prefillVariant?: { variantId: string; optionLabel: string; optionCode: string }
  updateQty: (id: string, d: number) => void
  addItem: (item: Omit<CartItem, 'cartId'>) => void
  onClose: () => void
}) {
  const allVariants = getProductVariants(prod, allProducts)

  const initSelections = prefillVariant ? { [prefillVariant.variantId]: prefillVariant.optionLabel } : {}
  const initCodes      = prefillVariant ? { [prefillVariant.variantId]: prefillVariant.optionCode  } : {}
  const [selections, setSelections]   = useState<Record<string, string>>(initSelections)
  const [selCodes, setSelCodes]       = useState<Record<string, string>>(initCodes)
  const [qty, setQty]                 = useState(1)
  const [setIdx, setSetIdx]           = useState(0)

  // Pick image: prefer option image from selected variant, then product images
  const activeImages = useMemo(() => {
    for (const v of prod.variants) {
      const sel = selections[v.id]
      if (sel) {
        const opt = v.options.find(o => o.label === sel)
        if (opt?.image) return [opt.image, ...prod.images.filter(i => i !== opt.image)]
      }
    }
    return prod.images
  }, [prod, selections])

  const existingItems = cartItems.filter(c => c.productId === prod.id)
  const runningTotal  = qty * prod.price

  const getSubProdId = (vid: string) => vid.includes('__') ? vid.split('__')[0] : null

  const handleAdd = () => {
    const missing = allVariants.filter(v => v.required && !selections[v.id])
    if (missing.length) { alert(`กรุณาเลือก: ${missing.map(v => v.name).join(', ')}`); return }

    let setDetails: CartItem['setDetails']
    if (prod.type === 'set') {
      setDetails = (prod.setItems || []).map(si => {
        const sp = allProducts.find(p => p.id === si.productId)
        const labs: string[] = [], codes: string[] = []
        Object.entries(selections).forEach(([vid, val]) => {
          if (vid.startsWith(si.productId + '__')) {
            labs.push(val); codes.push(selCodes[vid] || val)
          }
        })
        return { productName: sp?.name || si.label, productCode: sp?.code || si.productId, variantLabel: labs.join('/'), variantCode: codes.join('_') }
      })
    }

    addItem({ productId: prod.id, productName: prod.name, productCode: prod.code, productImages: prod.images, unitPrice: prod.price, qty, variantSelections: { ...selections }, variantCodes: { ...selCodes }, isSet: prod.type === 'set', setDetails })

    // Reset for both set and single
    setSelections(prefillVariant ? { [prefillVariant.variantId]: prefillVariant.optionLabel } : {})
    setSelCodes(prefillVariant ? { [prefillVariant.variantId]: prefillVariant.optionCode } : {})
    setQty(1)
    if (prod.type === 'set') setSetIdx(i => i + 1)
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
      <div className="animate-slideUp" style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' }}>
        <ModalImageSlider images={activeImages} name={prod.name} />

        <div style={{ padding: '18px 20px 36px' }}>
          {prod.type === 'set' && <div style={{ fontSize: 10, color: accent, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>🎁 เซ็ตพิเศษ</div>}
          <div style={{ fontSize: 19, fontWeight: 800, color: text, marginBottom: 4 }}>{prod.name}</div>
          {prod.description && <div style={{ fontSize: 13, color: subtext, marginBottom: 8, lineHeight: 1.55 }}>{prod.description}</div>}

          {prod.type === 'set' && (prod.setItems?.length || 0) > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: subtext, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>ประกอบด้วย</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {prod.setItems!.map(si => {
                  const sp = allProducts.find(p => p.id === si.productId)
                  return (
                    <div key={si.productId} style={{ display: 'flex', alignItems: 'center', gap: 5, background: accent + '12', border: `1px solid ${accent}28`, borderRadius: 8, padding: '4px 10px' }}>
                      {sp?.images?.[0] && <img src={sp.images[0]} alt="" style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'cover' }} />}
                      <span style={{ fontSize: 12, color: text }}>{sp?.name || si.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: text }}>฿{fmt(prod.price)}</span>
            {prod.originalPrice && <span style={{ fontSize: 13, color: subtext, textDecoration: 'line-through' }}>฿{fmt(prod.originalPrice)}</span>}
          </div>

          {prod.type === 'set' && setIdx > 0 && (
            <div style={{ background: accent + '12', border: `1px solid ${accent}28`, borderRadius: 10, padding: '8px 14px', marginBottom: 14, fontSize: 13, color: accent, fontWeight: 700 }}>
              กำลังเพิ่มเซ็ตที่ {setIdx + 1}
            </div>
          )}

          {existingItems.length > 0 && (
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: subtext, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>ในตะกร้าแล้ว</div>
              {existingItems.map(item => {
                const varStr = Object.values(item.variantSelections).join(' / ') || prod.name
                return (
                  <div key={item.cartId} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ flex: 1, fontSize: 12, color: text, lineHeight: 1.5 }}>
                      {varStr}
                      {item.isSet && item.setDetails && <div style={{ fontSize: 11, color: subtext }}>{item.setDetails.map(d => `${d.productName}${d.variantLabel ? ': ' + d.variantLabel : ''}`).join(' · ')}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => updateQty(item.cartId, -1)} style={qMini}>−</button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: text, width: 22, textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.cartId, 1)} style={qMini}>+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Variants */}
          {allVariants.map(v => {
            const subProdId = getSubProdId(v.id)
            const subProd   = subProdId ? allProducts.find(p => p.id === subProdId) : null
            return (
              <div key={v.id} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: text, marginBottom: 8, fontWeight: 700 }}>
                  {subProd ? `${subProd.name} – ` : ''}{v.name}
                  {v.required && <span style={{ color: accent }}> *</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {v.options.map(opt => {
                    const selected = selections[v.id] === opt.label
                    return (
                      <button key={opt.id} onClick={() => { setSelections(s => ({ ...s, [v.id]: opt.label })); setSelCodes(c => ({ ...c, [v.id]: opt.code })) }} style={{
                        padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `1.5px solid ${selected ? accent : cardBorder}`,
                        background: selected ? accent + '18' : '#fff',
                        color: selected ? accent : '#444',
                        fontSize: 13, fontWeight: selected ? 700 : 400, transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {opt.image && <img src={opt.image} alt={opt.label} style={{ width: 20, height: 20, borderRadius: 3, objectFit: 'cover' }} />}
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Qty + running total */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '12px 16px' }}>
            <span style={{ fontSize: 13, color: subtext }}>จำนวน</span>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} style={qBtn}>−</button>
            <span style={{ color: text, fontWeight: 800, fontSize: 18, width: 26, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => setQty(q => q + 1)} style={qBtn}>+</button>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: subtext }}>ยอดรวม</div>
              <div style={{ color: text, fontWeight: 800, fontSize: 20 }}>฿{fmt(runningTotal)}</div>
            </div>
          </div>

          <button onClick={handleAdd} style={{ width: '100%', background: accent, border: 'none', color: '#fff', borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
            {prod.type === 'set' ? '🎁 เพิ่มเซ็ตนี้' : '🛒 เพิ่มลงตะกร้า'}
          </button>
          <button onClick={onClose} style={{ width: '100%', background: 'transparent', border: `1px solid ${cardBorder}`, color: subtext, borderRadius: 12, padding: '11px 0', fontSize: 14, cursor: 'pointer' }}>
            ← กลับดูสินค้า
          </button>
        </div>
      </div>
    </div>
  )
}

const qBtn: React.CSSProperties  = { width: 34, height: 34, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const qMini: React.CSSProperties = { width: 26, height: 26, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 6, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }

// ─── Info Step ────────────────────────────────────────────────────────────────
function InfoStep({ form, fieldValues, setFieldValues, shippingMethod, setShippingMethod, errors, onNext, accent, text, subtext, cardBg, cardBorder }: {
  form: AppStore['form']
  fieldValues: Record<string, string>; setFieldValues: (v: Record<string, string>) => void
  shippingMethod: string; setShippingMethod: (v: string) => void
  errors: Record<string, string>; onNext: () => void

  accent: string; text: string; subtext: string; cardBg: string; cardBorder: string
}) {
  const inputSt: React.CSSProperties = {
    width: '100%', background: '#fff', border: `1px solid ${cardBorder}`,
    borderRadius: 10, color: text, fontSize: 15, padding: '11px 14px', outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  }

  return (
    <div>
      {form.sections.map(sec => {
        if (!evalCond(sec.condition, fieldValues, shippingMethod)) return null
        return (
          <div key={sec.id} style={{ marginBottom: 26 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: text, marginBottom: 14 }}>{sec.title}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {sec.fields.map(f => {
                if (!evalCond(f.condition, fieldValues, shippingMethod)) return null
                const isHalf = f.width === 'half'
                return (
                  <div key={f.id} style={{ width: isHalf ? 'calc(50% - 6px)' : '100%', minWidth: 120, boxSizing: 'border-box' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: subtext, marginBottom: 6 }}>
                      {f.label}{f.required && <span style={{ color: accent }}> *</span>}
                    </label>
                    {(f.type === 'text' || f.type === 'email' || f.type === 'tel') && (
                      <input type={f.type} value={fieldValues[f.id] || ''} onChange={e => setFieldValues({ ...fieldValues, [f.id]: e.target.value })} placeholder={f.placeholder} style={inputSt} />
                    )}
                    {f.type === 'textarea' && (
                      <textarea value={fieldValues[f.id] || ''} onChange={e => setFieldValues({ ...fieldValues, [f.id]: e.target.value })} placeholder={f.placeholder} rows={3} style={{ ...inputSt, resize: 'vertical', lineHeight: 1.5 }} />
                    )}
                    {(f.type === 'select' || f.type === 'dropdown') && (
                      <select value={fieldValues[f.id] || ''} onChange={e => setFieldValues({ ...fieldValues, [f.id]: e.target.value })} style={{ ...inputSt, cursor: 'pointer', appearance: 'auto' }}>
                        <option value="">-- เลือก --</option>
                        {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    {f.type === 'choice' && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {(f.options || []).map(o => {
                          const sel = fieldValues[f.id] === o
                          return (
                            <button key={o} type="button" onClick={() => setFieldValues({ ...fieldValues, [f.id]: o })}
                              style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${sel ? accent : cardBorder}`, background: sel ? accent + '15' : '#fff', color: sel ? accent : '#444', fontWeight: sel ? 700 : 400, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                              {o}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {f.type === 'checkbox' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(f.options || []).map(o => {
                          const vals = (fieldValues[f.id] || '').split(',').filter(Boolean)
                          const checked = vals.includes(o)
                          return (
                            <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 14, color: text }}>
                              <input type="checkbox" checked={checked} onChange={() => {
                                const next = checked ? vals.filter(v => v !== o) : [...vals, o]
                                setFieldValues({ ...fieldValues, [f.id]: next.join(',') })
                              }} />
                              {o}
                            </label>
                          )
                        })}
                      </div>
                    )}
                    {errors[f.id] && <div style={{ fontSize: 12, color: '#e94560', marginTop: 5 }}>⚠ {errors[f.id]}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {form.shipping?.enabled && (
        <div style={{ marginBottom: 26 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: text, marginBottom: 12 }}>วิธีรับสินค้า</h3>
          {[{ val: 'pickup', icon: '🏫', label: 'รับที่สถานที่', note: 'ฟรี' },
            { val: 'delivery', icon: '📮', label: 'จัดส่งทางไปรษณีย์', note: `+฿${form.shipping.cost}` }].map(opt => (
            <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', background: shippingMethod === opt.val ? accent + '10' : '#fff', border: `1.5px solid ${shippingMethod === opt.val ? accent : cardBorder}`, borderRadius: 12, marginBottom: 9, cursor: 'pointer', transition: 'all 0.15s' }}>
              <input type="radio" name="shipping" value={opt.val} checked={shippingMethod === opt.val} onChange={() => setShippingMethod(opt.val)} style={{ accentColor: accent }} />
              <span style={{ fontSize: 24 }}>{opt.icon}</span>
              <div>
                <div style={{ fontSize: 14, color: text, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: subtext }}>{opt.note}</div>
              </div>
            </label>
          ))}
        </div>
      )}
      <button onClick={onNext} style={pBtn(accent)}>ถัดไป →</button>
    </div>
  )
}

// ─── Products Step ─────────────────────────────────────────────────────────────
function ProductsStep({ products, cartItems, accent, cardBg, cardBorder, text, subtext, onOpen, onNext, onBack }: {
  products: Product[]; cartItems: CartItem[]
  accent: string; cardBg: string; cardBorder: string; text: string; subtext: string
  onOpen: (prod: Product, virtual?: VirtualProduct) => void
  onNext: () => void; onBack: () => void
}) {
  const singles = products.filter(p => p.type === 'single')
  const sets    = products.filter(p => p.type === 'set')
  const totalQty = cartItems.reduce((s, c) => s + c.qty, 0)
  const subtotal  = cartItems.reduce((s, c) => s + c.unitPrice * c.qty, 0)

  const expandedSingles: Array<{ prod: Product; virtual?: VirtualProduct }> = []
  singles.forEach(prod => {
    const expandV = prod.variants.find(v => v.expandAsProducts)
    if (expandV) {
      expandV.options.forEach(opt => {
        expandedSingles.push({
          prod,
          virtual: {
            realProductId: prod.id, variantId: expandV.id,
            optionId: opt.id, optionLabel: opt.label, optionCode: opt.code,
            name: `${prod.name} – ${opt.label}`, code: `${prod.code}_${opt.code}`,
            price: prod.price, images: opt.image ? [opt.image, ...prod.images] : prod.images,
            tags: prod.tags, aspectRatio: prod.aspectRatio,
          },
        })
      })
    } else {
      expandedSingles.push({ prod })
    }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: text }}>เลือกสินค้า</h2>
        {totalQty > 0 && (
          <button onClick={onNext} style={{ background: accent, border: 'none', color: '#fff', borderRadius: 18, padding: '7px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
            ดูตะกร้า ({totalQty}) →
          </button>
        )}
      </div>

      {sets.length > 0 && <>
        <div style={{ fontSize: 11, color: subtext, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>🎁 เซ็ตสุดคุ้ม</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12, marginBottom: 24 }}>
          {sets.map(p => <ProductCard key={p.id} prod={p} cartItems={cartItems} accent={accent} cardBg={cardBg} cardBorder={cardBorder} text={text} subtext={subtext} onOpen={() => onOpen(p)} />)}
        </div>
      </>}

      <div style={{ fontSize: 11, color: subtext, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>📦 สินค้า</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 11, marginBottom: 24 }}>
        {expandedSingles.map(({ prod, virtual }, i) => (
          <ProductCard key={virtual ? virtual.name : prod.id + i} prod={prod} virtual={virtual} cartItems={cartItems} accent={accent} cardBg={cardBg} cardBorder={cardBorder} text={text} subtext={subtext} onOpen={() => onOpen(prod, virtual)} />
        ))}
      </div>

      {totalQty > 0 && (
        <button onClick={onNext} style={{ ...pBtn(accent), display: 'flex', justifyContent: 'space-between', padding: '14px 20px', marginBottom: 10 }}>
          <span>🛒 ดูตะกร้า ({totalQty})</span>
          <span>฿{fmt(subtotal)} →</span>
        </button>
      )}
      <button onClick={onBack} style={sBtn}>← ย้อนกลับ</button>
    </div>
  )
}

// ─── Delete popup ─────────────────────────────────────────────────────────────
function DeleteConfirm({ itemName, onConfirm, onCancel, accent }: { itemName: string; onConfirm: () => void; onCancel: () => void; accent: string }) {
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="animate-scaleIn" style={{ background: '#fff', borderRadius: 16, padding: '24px', maxWidth: 320, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 8 }}>ลบสินค้าออก?</div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 22, lineHeight: 1.55 }}>
          ต้องการลบ <strong>{itemName}</strong> ออกจากตะกร้า?
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, background: '#f5f5f5', border: 'none', color: '#555', borderRadius: 10, padding: '10px 0', cursor: 'pointer', fontSize: 14 }}>ยกเลิก</button>
          <button onClick={onConfirm} style={{ flex: 1, background: accent, border: 'none', color: '#fff', borderRadius: 10, padding: '10px 0', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>ลบออก</button>
        </div>
      </div>
    </div>
  )
}

// ─── Cart Step ────────────────────────────────────────────────────────────────
function CartStep({ items, updateQty, removeItem, subtotal, shippingCost, shippingMethod, accent, text, subtext, cardBg, cardBorder, onNext, onBack, onAddMore }: {
  items: CartItem[]; updateQty: (id: string, d: number) => void; removeItem: (id: string) => void
  subtotal: number; shippingCost: number; shippingMethod: string
  accent: string; text: string; subtext: string; cardBg: string; cardBorder: string
  onNext: () => void; onBack: () => void; onAddMore: () => void
}) {
  const total = subtotal + shippingCost
  const [deleteTarget, setDeleteTarget] = useState<{ cartId: string; name: string } | null>(null)
  const receiptLines = buildReceiptLines(items)

  const handleMinus = (item: CartItem) => {
    if (item.qty === 1) {
      const varStr = Object.values(item.variantSelections).join(' / ')
      setDeleteTarget({ cartId: item.cartId, name: `${item.productName}${varStr ? ' · ' + varStr : ''}` })
    } else {
      updateQty(item.cartId, -1)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 19, fontWeight: 800, color: text, marginBottom: 18 }}>ตะกร้าสินค้า</h2>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
          <div style={{ fontSize: 15, color: subtext }}>ตะกร้าว่างเปล่า</div>
        </div>
      ) : <>
        {items.map(item => {
          const varStr = Object.values(item.variantSelections).join(' / ')
          return (
            <div key={item.cartId} style={{ background: '#fff', border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '12px 14px', marginBottom: 9, display: 'flex', gap: 11, alignItems: 'center' }}>
              <div style={{ width: 50, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#f0f0f0' }}>
                {item.productImages?.[0]
                  ? <img src={item.productImages[0]} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📦</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{item.productName}</div>
                {varStr && <div style={{ fontSize: 11, color: subtext, marginTop: 1 }}>{varStr}</div>}
                {item.isSet && item.setDetails && <div style={{ fontSize: 11, color: subtext }}>{item.setDetails.map(d => `${d.productName}${d.variantLabel ? ': ' + d.variantLabel : ''}`).join(' · ')}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => handleMinus(item)} style={qMini}>−</button>
                <span style={{ fontSize: 13, fontWeight: 700, color: text, width: 20, textAlign: 'center' }}>{item.qty}</span>
                <button onClick={() => updateQty(item.cartId, 1)} style={qMini}>+</button>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: text, minWidth: 54, textAlign: 'right' }}>฿{fmt(item.unitPrice * item.qty)}</span>
            </div>
          )
        })}

        {/* Receipt summary */}
        <div style={{ background: '#fff', border: `1px solid ${cardBorder}`, borderRadius: 13, padding: '15px 16px', marginTop: 12 }}>
          <div style={{ fontWeight: 700, color: text, marginBottom: 12, fontSize: 14 }}>สรุปรายการ</div>
          {receiptLines.map((line, i) => {
            if (line.type === 'divider') return <div key={i} style={{ borderTop: '1px dashed rgba(0,0,0,0.1)', margin: '8px 0' }} />
            if (line.type === 'product-header') {
              const showUnit = (line.qty || 1) > 1
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 13, color: text }}>
                  <span style={{ fontWeight: 600 }}>{line.name}</span>
                  <span style={{ marginLeft: 12, whiteSpace: 'nowrap' }}>
                    {showUnit ? `฿${fmt(line.unitPrice!)} × ${line.qty} = ฿${fmt(line.total!)}` : `฿${fmt(line.total!)}`}
                  </span>
                </div>
              )
            }
            if (line.type === 'variant-row') return <div key={i} style={{ color: subtext, fontSize: 12, paddingLeft: 8, marginBottom: 2 }}>{line.variantStr}</div>
            if (line.type === 'set-detail') return <div key={i} style={{ color: subtext, fontSize: 12, paddingLeft: 8, marginBottom: 1 }}>{line.detail}</div>
            return null
          })}

          <div style={{ borderTop: `1px solid ${cardBorder}`, marginTop: 10, paddingTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: subtext, fontSize: 12, marginBottom: 5 }}>
              <span>ค่าจัดส่ง</span>
              <span>{shippingCost > 0 ? `฿${fmt(shippingCost)}` : 'ฟรี'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, color: text, borderTop: `1px solid ${cardBorder}`, paddingTop: 8 }}>
              <span>ยอดสุทธิ</span><span>฿{fmt(total)}</span>
            </div>
          </div>
        </div>
      </>}

      <button onClick={onAddMore} style={{ ...sBtn, width: '100%', marginTop: 14, marginBottom: 9 }}>+ เพิ่มสินค้า</button>
      <button onClick={onNext} disabled={items.length === 0} style={{ ...pBtn(accent), opacity: items.length === 0 ? 0.4 : 1, marginBottom: 9 }}>
        ชำระเงิน ฿{fmt(subtotal + shippingCost)} →
      </button>
      <button onClick={onBack} style={sBtn}>← ย้อนกลับ</button>

      {deleteTarget && (
        <DeleteConfirm itemName={deleteTarget.name} accent={accent}
          onConfirm={() => { removeItem(deleteTarget.cartId); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  )
}

// ─── Payment Step ─────────────────────────────────────────────────────────────
function PaymentStep({ form, total, slipFile, setSlipFile, onSubmit, onBack, accent, text, subtext, cardBg, cardBorder }: {
  form: AppStore['form']
  total: number; slipFile: File | null; setSlipFile: (f: File | null) => void
  onSubmit: () => void; onBack: () => void
  accent: string; text: string; subtext: string; cardBg: string; cardBorder: string
}) {
  const cells = 11
  const qrPat = Array.from({ length: cells * cells }, (_, i) => {
    const r = Math.floor(i / cells), c = i % cells
    return (r < 3 && c < 3) || (r < 3 && c > cells - 4) || (r > cells - 4 && c < 3) || Math.sin(r * 3.7 + c * 2.3) > 0.1
  })

  return (
    <div>
      <h2 style={{ fontSize: 19, fontWeight: 800, color: text, marginBottom: 18 }}>ชำระเงิน</h2>

      <div style={{ background: '#fff', border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 22, textAlign: 'center', marginBottom: 16 }}>
        {form.qrCodeImage
          ? <img src={form.qrCodeImage} alt="QR" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 10, margin: '0 auto 12px', display: 'block' }} />
          : (
            <div style={{ background: '#fff', border: '1px solid #eee', padding: 12, borderRadius: 12, display: 'inline-block', marginBottom: 12 }}>
              <svg width={154} height={154} viewBox={`0 0 ${cells * 14} ${cells * 14}`}>
                {qrPat.map((f, i) => f ? <rect key={i} x={(i % cells) * 14 + 1} y={Math.floor(i / cells) * 14 + 1} width={12} height={12} fill="#222" rx={1.5} /> : null)}
              </svg>
              <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>PromptPay (ตัวอย่าง)</div>
            </div>
          )}
        <div style={{ fontSize: 13, color: subtext }}>เลขที่: <strong style={{ color: text }}>{form.promptPayId}</strong></div>
        <div style={{ fontSize: 24, fontWeight: 800, color: text, margin: '8px 0' }}>฿{fmt(total)}</div>
        {form.paymentNote && <div style={{ fontSize: 12, color: subtext, marginTop: 6 }}>{form.paymentNote}</div>}
      </div>

      <div style={{ background: '#fff', border: `1px solid ${cardBorder}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 12 }}>แนบสลิปการโอน <span style={{ color: accent }}>*</span></div>
        <label style={{ display: 'block', border: `2px dashed ${slipFile ? accent : cardBorder}`, borderRadius: 11, padding: '24px 18px', textAlign: 'center', cursor: 'pointer', background: slipFile ? accent + '08' : 'transparent', transition: 'all 0.2s' }}>
          <input type="file" accept="image/*" onChange={e => setSlipFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
          {slipFile ? (
            <><div style={{ fontSize: 28, marginBottom: 5 }}>✅</div>
              <div style={{ fontSize: 13, color: accent, fontWeight: 600 }}>{slipFile.name}</div>
              <div style={{ fontSize: 11, color: subtext, marginTop: 3 }}>คลิกเพื่อเปลี่ยน</div></>
          ) : (
            <><div style={{ fontSize: 28, marginBottom: 5 }}>📷</div>
              <div style={{ fontSize: 14, color: subtext }}>คลิกอัปโหลดสลิป</div>
              <div style={{ fontSize: 11, color: subtext, opacity: 0.6, marginTop: 3 }}>JPG · PNG · HEIC</div></>
          )}
        </label>
      </div>

      <button onClick={onSubmit} disabled={!slipFile} style={{ ...pBtn(accent), opacity: slipFile ? 1 : 0.4, marginBottom: 9 }}>✅ ยืนยันคำสั่งซื้อ</button>
      <button onClick={onBack} style={sBtn}>← ย้อนกลับ</button>
    </div>
  )
}

// ─── Done Screen ──────────────────────────────────────────────────────────────
function DoneScreen({ shippingMethod, slipName, text, subtext, cardBorder }: {
  shippingMethod: string; slipName?: string; text: string; subtext: string; cardBorder: string
}) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }} className="animate-scaleIn">
      <div style={{ fontSize: 68, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: text, marginBottom: 10 }}>สั่งซื้อสำเร็จ!</h2>
      <p style={{ color: subtext, fontSize: 14, lineHeight: 1.7 }}>
        ขอบคุณที่อุดหนุน 💛<br />
        เราจะตรวจสอบและดำเนินการโดยเร็ว
      </p>
      <div style={{ background: '#fff', border: `1px solid ${cardBorder}`, borderRadius: 13, padding: '16px 22px', margin: '22px auto', maxWidth: 260 }}>
        <div style={{ fontSize: 14, color: subtext }}>{shippingMethod === 'pickup' ? '🏫 รับที่สถานที่' : '📮 จัดส่งทางไปรษณีย์'}</div>
        {slipName && <div style={{ fontSize: 12, color: subtext, marginTop: 5 }}>📎 {slipName}</div>}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FormPage() {
  const { form, products, addSubmission, loadFromDB } = useAppStore()
    useEffect(() => {
      loadFromDB()
    }, [])
  
  const { items, addItem, updateQty, removeItem, clearCart } = useCartStore()
  const { accent, bg, text, subtext, cardBg, cardBorder } = useTheme()

  const [step, setStep] = useState<Step>('info')

  const [infoValid, setInfoValid] = useState(false)

  const canGoTo = (s: Step) => {
    if (s === 'info') return true
    if (s === 'products') return infoValid
    if (s === 'cart') return infoValid
    if (s === 'payment') return infoValid && items.length > 0
    return false
  }
  
  const [fieldValues, setFieldValues]       = useState<Record<string, string>>({})
  const [shippingMethod, setShippingMethod] = useState('pickup')
  const [slipFile, setSlipFile]             = useState<File | null>(null)
  const [errors, setErrors]                 = useState<Record<string, string>>({})
  const [done, setDone]                     = useState(false)
  const [doneSlipName, setDoneSlipName]     = useState<string>()
  const [modalProd, setModalProd]           = useState<{ prod: Product; virtual?: VirtualProduct } | null>(null)

  const subtotal    = items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
  const shippingCost = shippingMethod === 'delivery' && form.shipping?.enabled ? (form.shipping.cost || 0) : 0
  const total       = subtotal + shippingCost

  const validate = () => {
    const e: Record<string, string> = {}
    form.sections.forEach(sec => {
      if (!evalCond(sec.condition, fieldValues, shippingMethod)) return
      sec.fields.forEach(f => {
        if (!evalCond(f.condition, fieldValues, shippingMethod)) return
        if (f.required && !fieldValues[f.id]?.trim()) {
          e[f.id] = 'กรุณากรอกข้อมูล'
        } else if (fieldValues[f.id] && f.validationRegex) {
          try { if (!new RegExp(f.validationRegex).test(fieldValues[f.id])) e[f.id] = f.validationMessage || 'รูปแบบไม่ถูกต้อง' } catch {}
        }
      })
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = useCallback(async () => {
    // Store slip as base64 so it persists
    let slipData: string | null = null
    if (slipFile) {
      slipData = await new Promise<string>((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(slipFile)
      })
    }
    const allFields = form.sections.flatMap(s => s.fields)
    const nameF  = allFields.find(f => f.type === 'text' && (f.label.includes('ชื่อ') || f.label.toLowerCase().includes('name')))
    const phoneF = allFields.find(f => f.type === 'tel')
    const emailF = allFields.find(f => f.type === 'email')
    addSubmission({ customerName: nameF ? (fieldValues[nameF.id] || 'ไม่ระบุ') : 'ไม่ระบุ', customerPhone: phoneF ? (fieldValues[phoneF.id] || '') : '', customerEmail: emailF ? (fieldValues[emailF.id] || '') : '', fieldValues, items, shippingMethod: shippingMethod as 'pickup' | 'delivery', subtotal, shipping: shippingCost, totalAmount: total, paymentSlip: slipData })
    setDoneSlipName(slipFile?.name)
    clearCart()
    setDone(true)
  }, [fieldValues, items, shippingMethod, subtotal, shippingCost, total, slipFile, addSubmission, clearCart])

  return (
    <div style={{ minHeight: '100vh', background: bg }}>
      {form.bannerImage && (
        <div style={{ width: '100%', maxHeight: 200, overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={form.bannerImage} alt="banner" style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      {/* Sticky header */}
      <div style={{ background: `${bg}f0`, backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '14px 18px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: text }}>{form.logoEmoji} {form.title}</div>
              <div style={{ fontSize: 12, color: subtext, marginTop: 1 }}>{form.subtitle}</div>
            </div>
            {items.length > 0 && (
              <button onClick={() => setStep('cart')} style={{ background: accent, border: 'none', color: '#fff', borderRadius: 18, padding: '6px 13px', cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                🛒 {items.reduce((s, i) => s + i.qty, 0)} · ฿{fmt(subtotal)}
              </button>
            )}
          </div>
          {!done && <StepTabs current={step} setCurrent={setStep} accent={accent} subtext={subtext} canGoTo={canGoTo} />}
        </div>
      </div>

      {/* Content */}
      <div key={done ? 'done' : step} className="animate-fadeUp" style={{ maxWidth: 640, margin: '0 auto', padding: '24px 18px 100px' }}>
        {done ? (
          <DoneScreen shippingMethod={shippingMethod} slipName={doneSlipName} text={text} subtext={subtext} cardBorder={cardBorder} />
        ) : step === 'info' ? (
          <InfoStep form={form} fieldValues={fieldValues} setFieldValues={setFieldValues}
            shippingMethod={shippingMethod} setShippingMethod={setShippingMethod}
            errors={errors} onNext={() => { if (validate()) { setInfoValid(true); setStep('products') } }}
            accent={accent} text={text} subtext={subtext} cardBg={cardBg} cardBorder={cardBorder} />
        ) : step === 'products' ? (
          <ProductsStep products={products} cartItems={items} accent={accent} cardBg={cardBg} cardBorder={cardBorder} text={text} subtext={subtext}
            onOpen={(prod, virtual) => setModalProd({ prod, virtual })}
            onNext={() => setStep('cart')} onBack={() => setStep('info')} />
        ) : step === 'cart' ? (
          <CartStep items={items} updateQty={updateQty} removeItem={removeItem}
            subtotal={subtotal} shippingCost={shippingCost} shippingMethod={shippingMethod}
            accent={accent} text={text} subtext={subtext} cardBg={cardBg} cardBorder={cardBorder}
            onNext={() => setStep('payment')} onBack={() => setStep('products')} onAddMore={() => setStep('products')} />
        ) : (
          <PaymentStep form={form} total={total} slipFile={slipFile} setSlipFile={setSlipFile}
            accent={accent} text={text} subtext={subtext} cardBg={cardBg} cardBorder={cardBorder}
            onSubmit={handleSubmit} onBack={() => setStep('cart')} />
        )}
      </div>

      {modalProd && (
        <ConfigureModal prod={modalProd.prod} allProducts={products}
          accent={accent} cardBg={cardBg} cardBorder={cardBorder} text={text} subtext={subtext}
          cartItems={items} prefillVariant={modalProd.virtual ? { variantId: modalProd.virtual.variantId, optionLabel: modalProd.virtual.optionLabel, optionCode: modalProd.virtual.optionCode } : undefined}
          updateQty={updateQty} addItem={addItem} onClose={() => setModalProd(null)} />
      )}
    </div>
  )
}

const pBtn = (bg: string): React.CSSProperties => ({ width: '100%', background: bg, border: 'none', color: '#fff', borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'block', boxSizing: 'border-box' })
const sBtn: React.CSSProperties = { width: '100%', background: 'transparent', border: '1px solid rgba(0,0,0,0.15)', color: '#666', borderRadius: 12, padding: '12px 0', fontSize: 14, cursor: 'pointer', display: 'block', boxSizing: 'border-box' }
