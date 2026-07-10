'use client'

import { useState } from 'react'
import type { Product, ProductVariant, ProductVariantOption, SetItem } from '@/types'
import { Btn, Card, Label, Input, Select, IconBtn, SectionHeader } from '@/components/ui'
import ImageUploader from '@/components/ui/ImageUploader'
import { uid, fmt } from '@/lib/utils'

function ProductRow({ prod, onEdit, onDelete, active }: { prod: Product; onEdit: () => void; onDelete: () => void; active: boolean }) {
  return (
    <div style={{ background: active ? 'var(--bg-hover)' : 'var(--bg-deep)', border: `1px solid ${active ? 'var(--border-active)' : 'var(--border)'}`, borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s' }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {prod.images?.[0]
          ? <img src={prod.images[0]} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 22 }}>📦</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          <span style={{ background: 'var(--bg-panel)', borderRadius: 4, padding: '1px 6px', marginRight: 6, fontSize: 10, fontFamily: 'monospace' }}>{prod.code}</span>
          ฿{fmt(prod.price)}
          {prod.originalPrice ? ` (ปกติ ฿${fmt(prod.originalPrice)})` : ''}
          {prod.images.length > 0 ? ` · ${prod.images.length}รูป` : ''}
        </div>
        {prod.tags && prod.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {prod.tags.map(t => <span key={t} style={{ fontSize: 10, background: 'rgba(167,139,250,0.15)', color: 'var(--purple)', borderRadius: 4, padding: '1px 5px' }}>{t}</span>)}
          </div>
        )}
      </div>
      <IconBtn onClick={onEdit} title="แก้ไข">✏️</IconBtn>
      <IconBtn onClick={onDelete} title="ลบ">🗑️</IconBtn>
    </div>
  )
}

function VariantOptionRow({ opt, onUpdate, onRemove, productImages, basePrice }: {
  opt: ProductVariantOption
  onUpdate: (key: keyof ProductVariantOption, val: string | number | undefined) => void
  onRemove: () => void
  productImages: string[]
  basePrice: number
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'var(--bg-deep)', borderRadius: 8, padding: '8px 10px' }}>
        {/* Thumbnail — click opens picker */}
        <button onClick={() => setPickerOpen(p => !p)} style={{ width: 36, height: 36, borderRadius: 7, overflow: 'hidden', border: `1px dashed ${opt.image ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-panel)', padding: 0 }}>
          {opt.image
            ? <img src={opt.image} alt={opt.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>🖼️</span>}
        </button>
        <Input value={opt.label} onChange={e => onUpdate('label', e.target.value)} placeholder="ชื่อตัวเลือก" style={{ flex: 2 }} />
        <Input value={opt.code} onChange={e => onUpdate('code', e.target.value)} placeholder="code" style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }} />
        <Input type="number" value={opt.priceOverride != null ? String(opt.priceOverride) : ''}
          onChange={e => onUpdate('priceOverride', e.target.value === '' ? undefined : Number(e.target.value))}
          placeholder={`฿${basePrice}`} style={{ width: 78, fontSize: 12, flexShrink: 0 }} />
        {opt.image && (
          <button onClick={() => { onUpdate('image', ''); setPickerOpen(false) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: 2, flexShrink: 0 }} title="ลบรูป">🗑️</button>
        )}
        <IconBtn onClick={onRemove}>✕</IconBtn>
      </div>

      {/* Image picker from product images */}
      {pickerOpen && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginTop: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>เลือกรูปจากสินค้า (คลิกเพื่อใช้เป็นรูปตัวเลือก)</div>
          {productImages.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>ยังไม่มีรูปสินค้า — อัปโหลดรูปในส่วนด้านบนก่อน</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {productImages.map((src, i) => (
                <button key={i} onClick={() => { onUpdate('image', src); setPickerOpen(false) }}
                  style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', padding: 0, border: `2px solid ${opt.image === src ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', flexShrink: 0, background: 'none' }}>
                  <img src={src} alt={`รูป ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setPickerOpen(false)} style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>ปิด</button>
        </div>
      )}
    </div>
  )
}

function ProductEditorPanel({ initial, singleProducts, onSave, onCancel }: {
  initial: Product; singleProducts: Product[]; onSave: (p: Product) => void; onCancel: () => void
}) {
  const [p, setP] = useState<Product>({ ...initial })

  const addVariant = () => setP({ ...p, variants: [...p.variants, { id: uid(), name: 'ตัวเลือกใหม่', required: true, options: [], expandAsProducts: false }] })
  const removeVariant = (vid: string) => setP({ ...p, variants: p.variants.filter(v => v.id !== vid) })
  const updateVariant = (vid: string, key: keyof ProductVariant, val: unknown) =>
    setP({ ...p, variants: p.variants.map(v => v.id === vid ? { ...v, [key]: val } : v) })

  const addOption = (vid: string) => setP({
    ...p, variants: p.variants.map(v => v.id === vid ? { ...v, options: [...v.options, { id: uid(), label: '', code: '' }] } : v)
  })
  const updateOption = (vid: string, oid: string, key: keyof ProductVariantOption, val: string | number | undefined) =>
    setP({ ...p, variants: p.variants.map(v => v.id === vid ? { ...v, options: v.options.map(o => o.id === oid ? { ...o, [key]: val } : o) } : v) })
  const removeOption = (vid: string, oid: string) =>
    setP({ ...p, variants: p.variants.map(v => v.id === vid ? { ...v, options: v.options.filter(o => o.id !== oid) } : v) })

  const addSetItem = (productId: string) => {
    const prod = singleProducts.find(pr => pr.id === productId)
    if (!prod) return
    setP({ ...p, setItems: [...(p.setItems || []), { productId, label: prod.name }] })
  }
  const removeSetItem = (productId: string) => setP({ ...p, setItems: (p.setItems || []).filter(i => i.productId !== productId) })

  return (
    <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-active)', borderRadius: 14, padding: 22, position: 'sticky', top: 20, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--purple)', marginBottom: 18 }}>
        {initial.name ? `✏️ ${p.name}` : '➕ สินค้าใหม่'}
      </div>

      {/* Images */}
      <Label>รูปภาพสินค้า</Label>
      <div style={{ marginBottom: 14 }}>
        {p.images.length > 0 && (
          <div style={{ aspectRatio: p.aspectRatio === 'square' ? '1/1' : p.aspectRatio === '4/3' ? '4/3' : p.aspectRatio === '3/4' ? '3/4' : '16/9', maxHeight: 180, overflow: 'hidden', borderRadius: 10, marginBottom: 8, background: 'var(--bg-panel)' }}>
            <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <ImageUploader images={p.images} onChange={imgs => setP({ ...p, images: imgs })} />
      </div>

      <Label>อัตราส่วนรูป (Aspect Ratio)</Label>
      <Select value={p.aspectRatio || 'square'} onChange={e => setP({ ...p, aspectRatio: e.target.value as any })} style={{ marginBottom: 14 }}>
        <option value="square">1:1 สี่เหลี่ยมจัตุรัส</option>
        <option value="4/3">4:3 แนวนอน</option>
        <option value="3/4">3:4 แนวตั้ง</option>
        <option value="16/9">16:9 ไวด์สกรีน</option>
        <option value="auto">Auto</option>
      </Select>

      <Label>ชื่อสินค้า</Label>
      <Input value={p.name} onChange={e => setP({ ...p, name: e.target.value })} placeholder="ชื่อสินค้า" style={{ marginBottom: 10 }} />

      <Label>Code สินค้า <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(ใช้ใน CSV, ไม่มีช่องว่าง)</span></Label>
      <Input value={p.code} onChange={e => setP({ ...p, code: e.target.value.replace(/\s/g, '_').toLowerCase() })} placeholder="เช่น shirt, keychain" style={{ marginBottom: 10, fontFamily: 'monospace' }} />

      <Label>คำอธิบาย</Label>
      <Input type="textarea" value={p.description || ''} onChange={e => setP({ ...p, description: e.target.value })} placeholder="รายละเอียดสินค้า" style={{ marginBottom: 10 }} rows={2} />

      <Label>Tags (คั่นด้วย comma)</Label>
      <Input value={(p.tags || []).join(',')} onChange={e => setP({ ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="เช่น เสื้อผ้า, ของที่ระลึก" style={{ marginBottom: 12 }} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <Label>ราคา (฿)</Label>
          <Input type="number" value={String(p.price)} onChange={e => setP({ ...p, price: Number(e.target.value) })} />
        </div>
        {p.type === 'set' && (
          <div style={{ flex: 1 }}>
            <Label>ราคาเต็ม (ขีดทับ)</Label>
            <Input type="number" value={String(p.originalPrice || '')} onChange={e => setP({ ...p, originalPrice: Number(e.target.value) || undefined })} placeholder="0" />
          </div>
        )}
      </div>

      {/* Variants */}
      {p.type === 'single' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Label style={{ margin: 0 }}>Variants</Label>
            <Btn onClick={addVariant} size="sm" variant="secondary">+ เพิ่ม</Btn>
          </div>
          {p.variants.map(v => (
            <Card key={v.id} style={{ marginBottom: 12, padding: 14, background: 'var(--bg-panel)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Input value={v.name} onChange={e => updateVariant(v.id, 'name', e.target.value)} placeholder="ชื่อ เช่น ลาย, สี, ไซส์" style={{ flex: 1 }} />
                <IconBtn onClick={() => removeVariant(v.id)}>✕</IconBtn>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700 }}>
                ตัวเลือก (ชื่อ + code + ราคาพิเศษถ้ามี)
              </div>
              {v.options.map(opt => (
                <VariantOptionRow key={opt.id} opt={opt}
                  onUpdate={(key, val) => updateOption(v.id, opt.id, key, val)}
                  onRemove={() => removeOption(v.id, opt.id)}
                  productImages={p.images || []} basePrice={p.price} />
              ))}
              <button onClick={() => addOption(v.id)} style={{ fontSize: 12, color: 'var(--purple)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0' }}>+ เพิ่มตัวเลือก</button>

              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={v.required} onChange={e => updateVariant(v.id, 'required', e.target.checked)} />
                  บังคับเลือก
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--purple)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={v.expandAsProducts || false} onChange={e => updateVariant(v.id, 'expandAsProducts', e.target.checked)} />
                  แสดงแต่ละตัวเลือกเป็นสินค้าแยก
                </label>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Set items */}
      {p.type === 'set' && (
        <div>
          <Label>สินค้าในเซ็ต</Label>
          {(p.setItems || []).map(item => {
            const prod = singleProducts.find(pr => pr.id === item.productId)
            return (
              <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', marginBottom: 7, fontSize: 13 }}>
                <span>{prod?.name || item.productId}</span>
                <IconBtn onClick={() => removeSetItem(item.productId)}>✕</IconBtn>
              </div>
            )
          })}
          <Select value="" onChange={e => { if (e.target.value) addSetItem(e.target.value) }}>
            <option value="">+ เพิ่มสินค้าเข้าเซ็ต</option>
            {singleProducts.filter(pr => !(p.setItems || []).find(i => i.productId === pr.id)).map(pr => (
              <option key={pr.id} value={pr.id}>{pr.name}</option>
            ))}
          </Select>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <Btn onClick={() => onSave(p)} variant="primary" style={{ flex: 1 }} disabled={!p.name || !p.code}>
          💾 บันทึก
        </Btn>
        <Btn onClick={onCancel} variant="ghost">ยกเลิก</Btn>
      </div>
    </div>
  )
}

export default function ProductManager({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newProd, setNewProd] = useState<Product | null>(null)

  const singles = products.filter(p => p.type === 'single')
  const sets = products.filter(p => p.type === 'set')

  const startNew = (type: 'single' | 'set') => {
    setEditingId(null)
    setNewProd({ id: uid(), type, name: '', code: '', price: 0, images: [], variants: [], setItems: [], tags: [], aspectRatio: 'square' })
  }

  const saveProd = (prod: Product) => {
    if (products.find(p => p.id === prod.id)) {
      setProducts(products.map(p => p.id === prod.id ? prod : p))
    } else {
      setProducts([...products, prod])
    }
    setEditingId(null)
    setNewProd(null)
  }

  const deleteProd = (id: string) => {
    if (window.confirm('ลบสินค้านี้?')) {
      setProducts(products.filter(p => p.id !== id))
      if (editingId === id) setEditingId(null)
    }
  }

  const editingProd = editingId ? products.find(p => p.id === editingId) : newProd

  return (
    <div style={{ display: 'grid', gridTemplateColumns: editingProd ? '1fr 420px' : '1fr', gap: 24, alignItems: 'start' }}>
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <Btn onClick={() => startNew('single')} variant="primary">+ สินค้าเดี่ยว</Btn>
          <Btn onClick={() => startNew('set')} variant="secondary">+ เซ็ตสินค้า</Btn>
        </div>

        <SectionHeader>สินค้าเดี่ยว ({singles.length})</SectionHeader>
        {singles.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>ยังไม่มีสินค้า</div>}
        {singles.map(p => (
          <ProductRow key={p.id} prod={p} active={editingId === p.id}
            onEdit={() => { setNewProd(null); setEditingId(p.id) }}
            onDelete={() => deleteProd(p.id)} />
        ))}

        <SectionHeader style={{ marginTop: 24 }}>เซ็ตสินค้า ({sets.length})</SectionHeader>
        {sets.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>ยังไม่มีเซ็ต</div>}
        {sets.map(p => (
          <ProductRow key={p.id} prod={p} active={editingId === p.id}
            onEdit={() => { setNewProd(null); setEditingId(p.id) }}
            onDelete={() => deleteProd(p.id)} />
        ))}
      </div>

      {editingProd && (
        <ProductEditorPanel key={editingProd.id} initial={editingProd} singleProducts={singles}
          onSave={saveProd} onCancel={() => { setEditingId(null); setNewProd(null) }} />
      )}
    </div>
  )
}
