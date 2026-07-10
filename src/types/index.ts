// ─── Product Types ─────────────────────────────────────────────────────────────
export interface ProductVariantOption {
  id: string
  label: string
  code: string
  image?: string
  /** Replaces the product's base price when this option is selected (e.g. size XL costs more). Unset = use base price. */
  priceOverride?: number
}

export interface ProductVariant {
  id: string
  name: string
  required: boolean
  options: ProductVariantOption[]
  expandAsProducts?: boolean  // show each option as separate card
}

export interface SetItem {
  productId: string
  label: string
}

export interface Product {
  id: string
  type: 'single' | 'set'
  name: string
  code: string
  price: number
  originalPrice?: number
  images: string[]
  variants: ProductVariant[]
  setItems?: SetItem[]
  description?: string
  tags?: string[]
  aspectRatio?: 'square' | '4/3' | '3/4' | '16/9' | 'auto'
}

// ─── Form Types ────────────────────────────────────────────────────────────────
export type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'dropdown' | 'choice' | 'checkbox' | 'file' | 'shipping'
export type FieldWidth = 'full' | 'half'

export interface ConditionRule {
  fieldId: string
  operator: 'equals' | 'not_equals' | 'contains'
  value: string
}

/** An AND/OR group of rules — shown/hidden when the whole group evaluates
 *  true. Forms saved before this existed have a flat { fieldId, operator,
 *  value } instead of { logic, rules } — normalizeCondition() (lib/utils.ts)
 *  reads either shape as a 1-rule AND group; nothing needs migrating. */
export interface FieldCondition {
  logic: 'AND' | 'OR'
  rules: ConditionRule[]
}

export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder: string
  required: boolean
  options?: string[]
  width?: FieldWidth
  condition?: FieldCondition | null
  validationRegex?: string        // custom regex pattern
  validationMessage?: string      // error message when regex fails
  /** type==='shipping' only: cost added when the 2nd option (delivery) is selected. options[0]=pickup, options[1]=delivery. */
  shippingCost?: number
}

export interface FormSection {
  id: string
  title: string
  fields: FormField[]
  condition?: FieldCondition | null  // hide whole section if condition fails
}

export interface FormConfig {
  id: string
  title: string
  subtitle: string
  coverColor: string
  accentColor: string
  theme: 'dark' | 'light'
  logoEmoji: string
  bannerImage?: string
  qrCodeImage?: string
  published: boolean
  shipping: {
    enabled: boolean
    cost: number
  }
  paymentNote: string
  promptPayId: string
  sections: FormSection[]
  scheduling?: {
    enabled: boolean
    opensAt?: string | null   // ISO datetime; null/unset = no start restriction
    closesAt?: string | null  // ISO datetime; null/unset = no end restriction
  }
  responseLimit?: {
    enabled: boolean
    max: number
  }
}

// ─── Multi-form / permissions ──────────────────────────────────────────────────
export type FormRole = 'owner' | 'editor' | 'submissions' | 'viewer'

export interface FormMeta {
  id: string
  slug: string
  ownerEmail: string
  createdAt: string
  title: string   // pulled from this form's form_config.data.title, for display
  role: FormRole
}

export interface FormPermission {
  formId: string
  email: string
  role: Exclude<FormRole, 'owner'>
  grantedAt: string
}

// ─── Cart & Order Types ────────────────────────────────────────────────────────
export interface CartItem {
  cartId: string
  productId: string
  productName: string
  productCode: string
  productImages: string[]
  unitPrice: number
  qty: number
  variantSelections: Record<string, string>
  variantCodes: Record<string, string>
  isSet: boolean
  setDetails?: Array<{ productName: string; productCode: string; variantLabel: string; variantCode: string }>
}

export type PaymentStatus = 'pending' | 'confirmed' | 'rejected'

export interface Submission {
  id: string
  submittedAt: string
  customerName: string
  customerPhone: string
  customerEmail: string
  fieldValues: Record<string, string>
  items: CartItem[]
  shippingMethod: 'pickup' | 'delivery'
  subtotal: number
  shipping: number
  totalAmount: number
  /** undefined = not fetched yet (admin list loads without it), null = no slip, string = URL */
  paymentSlip?: string | null
  paymentStatus: PaymentStatus
  paymentConfirmedAt?: string
  paymentNote?: string
}
