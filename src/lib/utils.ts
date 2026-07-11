import type { Product, ProductVariant, CartItem, Submission, FieldCondition, ConditionRule, SetItem } from '@/types'

export function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

/** Reads a saved `condition` value as a { logic, rules } group whether it's
 *  the current shape or the legacy flat { fieldId, operator, value } shape
 *  saved by older versions of the editor — old data keeps working as a
 *  1-rule AND group with no migration needed. */
export function normalizeCondition(cond: unknown): FieldCondition | null {
  if (!cond || typeof cond !== 'object') return null
  const c = cond as Record<string, unknown>
  if (Array.isArray(c.rules)) return c as unknown as FieldCondition
  if (typeof c.fieldId === 'string') {
    const rule: ConditionRule = { fieldId: c.fieldId, operator: c.operator as ConditionRule['operator'], value: String(c.value ?? '') }
    return { logic: 'AND', rules: [rule] }
  }
  return null
}

/** Turn a title into a URL-friendly slug (lowercase, ascii/digits/dash only — falls
 *  back to a random id when the title has no ascii characters, e.g. Thai-only titles). */
export function slugify(title: string): string {
  const s = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || uid()
}

export function fmt(n: number): string {
  return n.toLocaleString('th-TH')
}

/** Get all variants for a product, flattening set-item variants with prefix.
 *  Prefixed by the set item's own `id` (not `productId`) so two instances of
 *  the same product in one set (e.g. a shirt fixed at S, another at XL) get
 *  independent variant keys instead of colliding. A variant dimension the
 *  admin already fixed via `item.fixedOptions` is left out here — it's
 *  decided, not something the customer picks. */
export function getProductVariants(prod: Product, allProducts: Product[]): ProductVariant[] {
  if (prod.type === 'single') return prod.variants || []
  if (prod.type === 'set') {
    const all: ProductVariant[] = []
    ;(prod.setItems || []).forEach((item) => {
      const sp = allProducts.find((p) => p.id === item.productId)
      if (sp?.variants?.length) {
        sp.variants.forEach((v) => {
          if (item.fixedOptions?.[v.id]) return
          all.push({
            ...v,
            id: `${item.id}__${v.id}`,
            name: `${sp.name} – ${v.name}`,
          })
        })
      }
    })
    return all
  }
  return []
}

/** A set only switches to computing its price from its items (instead of the
 *  flat, manually-typed `price` field) once the admin actually uses the
 *  per-item features that need it — the same product added twice, or any
 *  item given its own fixed option/price/variant price table. Plain/legacy
 *  sets (each item just a bare reference, no per-item config) can never
 *  match this, so existing deliberate bundle-discount pricing never changes
 *  underneath anyone. */
function setUsesComputedPricing(prod: Product): boolean {
  const items = prod.setItems || []
  if (items.length === 0) return false
  const hasDuplicateProduct = new Set(items.map(i => i.productId)).size < items.length
  const hasPerItemConfig = items.some(i =>
    i.priceOverride != null ||
    (i.fixedOptions && Object.keys(i.fixedOptions).length > 0) ||
    (i.variantPriceOverrides && Object.keys(i.variantPriceOverrides).length > 0)
  )
  return hasDuplicateProduct || hasPerItemConfig
}

/** One set item's price contribution, given whatever the customer picked
 *  for its (non-fixed) variant dimensions. `priceOverride` (a single flat
 *  price) only means anything once every variant dimension is fixed to one
 *  option — if any dimension is still left for the customer to choose, a
 *  leftover flat override has to be ignored entirely (it's stale data from
 *  before that dimension was unfixed), or the pre-selection price would be
 *  a number that was never actually configured for this item. */
function resolveSetItemPrice(item: SetItem, sp: Product | undefined, selections: Record<string, string>): number {
  if (!sp) return item.priceOverride ?? 0
  const allFixed = (sp.variants || []).length > 0 && sp.variants.every((v) => item.fixedOptions?.[v.id])
  const noVariants = !sp.variants?.length
  const flatPriceApplies = allFixed || noVariants
  let price = flatPriceApplies ? (item.priceOverride ?? sp.price) : sp.price
  ;(sp.variants || []).forEach((v) => {
    const chosen = item.fixedOptions?.[v.id] || selections[`${item.id}__${v.id}`]
    if (!chosen) return
    const setPrice = item.variantPriceOverrides?.[v.id]?.[chosen]
    if (setPrice != null) { price = setPrice; return }
    if (flatPriceApplies) {
      const opt = v.options.find((o) => o.label === chosen)
      if (opt?.priceOverride != null) price = opt.priceOverride
    }
  })
  return price
}

/**
 * Effective unit price for a product given the currently selected variant
 * options — e.g. a shirt normally costs 10, but size XL is selected and that
 * option has priceOverride=30, so this returns 30. Checks variants in order;
 * if more than one selected option happens to carry an override, the last
 * one checked wins. Selections not tied to any priceOverride don't change
 * anything, so this is safe to call even for products with no custom pricing.
 *
 * Sets are different: once the admin uses per-item pricing (see
 * setUsesComputedPricing above), the total is the live sum of each item's
 * own resolved price instead of the flat `price` field.
 */
export function getEffectiveUnitPrice(
  prod: Product,
  allProducts: Product[],
  selections: Record<string, string>
): number {
  if (prod.type === 'set' && setUsesComputedPricing(prod)) {
    return (prod.setItems || []).reduce((sum, item) => {
      const sp = allProducts.find((p) => p.id === item.productId)
      return sum + resolveSetItemPrice(item, sp, selections)
    }, 0)
  }
  let price = prod.price
  const variants = getProductVariants(prod, allProducts)
  for (const v of variants) {
    const selectedLabel = selections[v.id]
    if (!selectedLabel) continue
    const opt = v.options.find((o) => o.label === selectedLabel)
    if (opt?.priceOverride != null) price = opt.priceOverride
  }
  return price
}

/** Build compact CSV product code for a cart item */
export function buildItemCode(item: CartItem): string {
  const codes = Object.values(item.variantCodes).join('_')
  return codes ? `${item.productCode}_${codes}` : item.productCode
}

/**
 * One submission's cart flattened to raw product+variant codes, set
 * contents broken apart into their real components — e.g. a set line with
 * two jackets (2XL + 2XL) contributes to the same `jacket_2xl` count as a
 * standalone 2XL jacket would. Merges duplicates within this submission
 * (two separate set instances both containing a 2XL jacket combine into
 * one count of 2). Used to fill one `__raw_<code>` column per code (see
 * buildRawItemCodes) — independent of the per-product columns, which keep
 * sets bundled.
 */
export function buildRawItemCountsForSubmission(sub: Submission): Record<string, number> {
  const counts: Record<string, number> = {}
  ;(sub.items || []).forEach(item => {
    if (item.isSet && item.setDetails?.length) {
      item.setDetails.forEach(d => {
        const code = d.variantCode ? `${d.productCode}_${d.variantCode}` : d.productCode
        counts[code] = (counts[code] || 0) + item.qty
      })
    } else {
      const variantCodes = Object.values(item.variantCodes).filter(Boolean).join('_')
      const code = variantCodes ? `${item.productCode}_${variantCodes}` : item.productCode
      counts[code] = (counts[code] || 0) + item.qty
    }
  })
  return counts
}

/**
 * The full universe of raw product+variant codes for a catalog — every
 * single product's own options (a set is always built from single
 * products, so this already covers whatever shows up broken out of a set
 * too; no separate enumeration needed). Used to give every submission row
 * the same fixed set of `__raw_<code>` columns regardless of what that
 * particular row happens to contain.
 */
export function buildRawItemCodes(products: Product[]): string[] {
  const codes: string[] = []
  products.filter(p => p.type === 'single').forEach(p => {
    if (!p.variants.length) { codes.push(p.code); return }
    p.variants.forEach(v => v.options.forEach(o => codes.push(`${p.code}_${o.code}`)))
  })
  return codes
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
  // One column per raw product+variant code, independent of the per-product
  // columns above — those keep sets bundled, these break every set apart
  // into its raw components for shipping/production counts.
  const rawCodes = buildRawItemCodes(products)
  const rawHeaders = rawCodes.map(c => `__raw_${c}`)

  const headerRow = [...baseHeaders, ...productHeaders, ...rawHeaders]

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

    const rawCounts = buildRawItemCountsForSubmission(sub)
    const rawCols = rawCodes.map(c => rawCounts[c] || 0)

    return [...base, ...productCols, ...rawCols]
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

    varGroups.forEach((vItems) => {
      const item = vItems[0]
      const qty = vItems.reduce((s, i) => s + i.qty, 0)
      // Each variant combo can have its own price (e.g. a set priced per
      // size), so this has to come from this specific group, not the first
      // cart line of the whole product — that would silently apply one
      // combo's price to every other combo of the same product.
      const unitPrice = item.unitPrice
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

export interface RawItemCount {
  code: string    // e.g. "jacket_2xl" — matches the codes used in CSV export columns
  label: string   // human-readable, e.g. "MWIT Jacket: 2XL"
  count: number
}

/**
 * Flattens every cart item across a set of submissions down to raw
 * product+variant units — a set line like "2 jackets (S + M)" contributes
 * one count each to jacket_s and jacket_m, same as if they'd been bought
 * standalone. Meant for shipping/production: "how many 2XL jackets do I
 * need in total", regardless of which bundle they were ordered as part of.
 */
export function buildRawItemCounts(submissions: Submission[]): RawItemCount[] {
  const counts: Record<string, RawItemCount> = {}
  const add = (code: string, label: string, qty: number) => {
    if (!counts[code]) counts[code] = { code, label, count: 0 }
    counts[code].count += qty
  }

  submissions.forEach(sub => {
    ;(sub.items || []).forEach(item => {
      if (item.isSet && item.setDetails?.length) {
        item.setDetails.forEach(d => {
          const code = d.variantCode ? `${d.productCode}_${d.variantCode}` : d.productCode
          const label = d.variantLabel ? `${d.productName}: ${d.variantLabel}` : d.productName
          add(code, label, item.qty)
        })
      } else {
        const variantCodes = Object.values(item.variantCodes).filter(Boolean).join('_')
        const code = variantCodes ? `${item.productCode}_${variantCodes}` : item.productCode
        const variantLabels = Object.values(item.variantSelections).join(' / ')
        const label = variantLabels ? `${item.productName}: ${variantLabels}` : item.productName
        add(code, label, item.qty)
      }
    })
  })

  return Object.values(counts).sort((a, b) => b.count - a.count)
}
