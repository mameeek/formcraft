import type { Product, ProductVariant, CartItem, Submission } from '@/types'

export function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

export function fmt(n: number): string {
  return n.toLocaleString('th-TH')
}

/** Get all variants for a product, flattening set-item variants with prefix. */
export function getProductVariants(prod: Product, allProducts: Product[]): ProductVariant[] {
  if (prod.type === 'single') return prod.variants || []
  if (prod.type === 'set') {
    const all: ProductVariant[] = []
    ;(prod.setItems || []).forEach((item) => {
      const sp = allProducts.find((p) => p.id === item.productId)
      if (sp?.variants?.length) {
        sp.variants.forEach((v) =>
          all.push({
            ...v,
            id: `${item.productId}__${v.id}`,
            name: `${sp.name} – ${v.name}`,
          })
        )
      }
    })
    return all
  }
  return []
}

/** Build compact CSV product code for a cart item */
export function buildItemCode(item: CartItem): string {
  const codes = Object.values(item.variantCodes).join('_')
  return codes ? `${item.productCode}_${codes}` : item.productCode
}

/** Export submissions as CSV with per-product columns */
export function exportSubmissionsCSV(
  submissions: Submission[],
  products: Product[],
  onlyConfirmed = false,
  formFields: Array<{ id: string; label: string }> = []
): void {
  const rows = onlyConfirmed ? submissions.filter(s => s.paymentStatus === 'confirmed') : submissions

  const singleProducts = products.filter(p => p.type === 'single')
  const setProducts = products.filter(p => p.type === 'set')

  // Use actual form field labels as headers
  const fieldHeaders = formFields.length ? formFields.map(f => f.label) : ['ชื่อ', 'เบอร์', 'อีเมล']
  const baseHeaders = ['ID', 'วันที่', ...fieldHeaders, 'การจัดส่ง', 'ค่าส่ง', 'ยอดรวม', 'สถานะชำระ']
  const productHeaders = [
    ...singleProducts.map(p => p.code),
    ...setProducts.map(p => p.code),
  ]

  const headerRow = [...baseHeaders, ...productHeaders]

  const dataRows = rows.map(sub => {
    const fieldVals = formFields.length
      ? formFields.map(f => sub.fieldValues?.[f.id] || '')
      : [sub.customerName || '', sub.customerPhone || '', sub.customerEmail || '']

    const base = [
      sub.id,
      new Date(sub.submittedAt).toLocaleString('th-TH'),
      ...fieldVals,
      sub.shippingMethod === 'pickup' ? 'รับที่สถานที่' : 'ไปรษณีย์',
      sub.shipping || 0,
      sub.totalAmount || 0,
      sub.paymentStatus,
    ]

    // Per-product columns
    const productCols = [...singleProducts, ...setProducts].map(prod => {
      const bought = (sub.items || []).filter(i => i.productId === prod.id)
      if (!bought.length) return '0'

      if (prod.type === 'single') {
        return bought.map(item => {
          const code = buildItemCode(item)
          return `${code}*${item.qty}`
        }).join(';') || '0'
      } else {
        // set: encode as set_c_(subcode1*qty/subcode2*qty)@setqty
        return bought.map(item => {
          const innerCode = item.setDetails
            ?.map(d => {
              const vc = d.variantCode ? `${d.productCode}_${d.variantCode}` : d.productCode
              return `${vc}*1`
            })
            .join('/') || ''
          return `${prod.code}_(${innerCode})@${item.qty}`
        }).join(';') || '0'
      }
    })

    return [...base, ...productCols]
  })

  const csv = [headerRow, ...dataRows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, "'")}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders_${onlyConfirmed ? 'confirmed_' : ''}${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Receipt line for cart display */
export interface ReceiptLine {
  type: 'product-header' | 'variant-row' | 'set-detail' | 'divider'
  // product-header: name + price on same line
  name?: string
  unitPrice?: number
  qty?: number
  total?: number
  // variant-row: "M / กรมท่า / 36th Anniversary" — all variants joined
  variantStr?: string
  // set-detail: sub-item line
  detail?: string
  isSet?: boolean
}

/**
 * Build receipt lines:
 * เสื้อยืด                      279    ← product-header (qty=1, no ×)
 * M / กรมท่า / 36th             ← variant-row (no price, just label)
 * เสื้อยืด               279×2=558    ← product-header (qty>1)
 * S / ขาว / OPH26               ← variant-row
 * เซ็ต C                        449    ← product-header
 * พวงกุญแจ: มังกร               ← set-detail
 * [divider between different productId groups]
 */
export function buildReceiptLines(items: CartItem[]): ReceiptLine[] {
  const lines: ReceiptLine[] = []

  // Group by productId, preserving insertion order
  const byProduct = new Map<string, CartItem[]>()
  items.forEach(item => {
    const g = byProduct.get(item.productId) || []
    g.push(item)
    byProduct.set(item.productId, g)
  })

  let firstProd = true
  byProduct.forEach((pItems) => {
    if (!firstProd) lines.push({ type: 'divider' })
    firstProd = false

    // Sub-group by variant combo key
    const varGroups = new Map<string, CartItem[]>()
    pItems.forEach(item => {
      const key = JSON.stringify(item.variantSelections)
      const g = varGroups.get(key) || []
      g.push(item)
      varGroups.set(key, g)
    })

    const isSet = pItems[0].isSet
    const name = pItems[0].productName
    const unitPrice = pItems[0].unitPrice

    varGroups.forEach((vItems) => {
      const item = vItems[0]
      const qty = vItems.reduce((s, i) => s + i.qty, 0)
      const total = unitPrice * qty

      // Variant string: join all selected values with " / "
      const variantStr = Object.values(item.variantSelections).join(' / ')

      lines.push({
        type: 'product-header',
        name,
        unitPrice,
        qty,
        total,
        isSet,
      })

      if (!isSet) {
        if (variantStr) {
          lines.push({ type: 'variant-row', variantStr })
        }
      } else {
        // Set details
        ;(item.setDetails || []).forEach(d => {
          const detail = d.variantLabel ? `${d.productName}: ${d.variantLabel}` : d.productName
          lines.push({ type: 'set-detail', detail })
        })
      }
    })
  })

  return lines
}
