// ─── Product Types ─────────────────────────────────────────────────────────────
export interface ProductVariantOption {
  id: string
  label: string
  code: string
  image?: string
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
export type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'dropdown' | 'choice' | 'checkbox' | 'file'
export type FieldWidth = 'full' | 'half'

export interface FieldCondition {
  fieldId: string
  operator: 'equals' | 'not_equals' | 'contains'
  value: string
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
  paymentSlip: string | null
  paymentStatus: PaymentStatus
  paymentConfirmedAt?: string
  paymentNote?: string
}
