'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, FormConfig, Submission, CartItem, PaymentStatus } from '@/types'
import { defaultProducts, defaultForm } from '@/lib/defaults'
import { uid } from '@/lib/utils'
import { supabase } from '@/lib/db'

// ─── App Store ─────────────────────────────────────────────────────────────────
interface AppStore {
  products: Product[]
  form: FormConfig
  submissions: Submission[]
  loading: boolean
  error: string | null
  dbConnected: boolean

  loadFromDB: () => Promise<void>
  setProducts: (p: Product[]) => void
  saveProducts: (p: Product[]) => Promise<void>
  setForm: (f: FormConfig) => void
  saveForm: (f: FormConfig) => Promise<void>
  addSubmission: (s: Omit<Submission, 'id' | 'submittedAt' | 'paymentStatus'>) => Promise<void>
  updateSubmissionPayment: (id: string, status: PaymentStatus, note?: string) => Promise<void>
  resetAll: () => void
}

function mapRow(row: any): Submission {
  return {
    id:                 row.id,
    customerName:       row.customer_name,
    customerPhone:      row.customer_phone,
    customerEmail:      row.customer_email,
    fieldValues:        row.field_values,
    items:              row.items,
    shippingMethod:     row.shipping_method,
    subtotal:           row.subtotal,
    shipping:           row.shipping,
    totalAmount:        row.total_amount,
    paymentSlip:        row.payment_slip,
    paymentStatus:      row.payment_status,
    paymentConfirmedAt: row.payment_confirmed_at,
    paymentNote:        row.payment_note,
    submittedAt:        row.submitted_at,
  }
}

export const useAppStore = create<AppStore>()((set, get) => ({
  products: defaultProducts,
  form: defaultForm,
  submissions: [],
  loading: false,
  error: null,
  dbConnected: false,

  loadFromDB: async () => {
    if (get().loading) return
    set({ loading: true, error: null })
    try {
      const [
        { data: prodRows,  error: prodErr  },
        { data: formRow,   error: formErr  },
        { data: subRows,   error: subErr   },
      ] = await Promise.all([
        supabase.from('products').select('data').order('created_at', { ascending: true }),
        supabase.from('form_config').select('data').eq('id', 'main').maybeSingle(),
        supabase.from('submissions').select('*').order('submitted_at', { ascending: false }),
      ])

      if (prodErr)  console.error('❌ products:', prodErr)
      if (formErr)  console.error('❌ form:', formErr)
      if (subErr)   console.error('❌ submissions:', subErr)

      const products    = prodRows  ? (prodRows  as any[]).map(r => r.data) : null
      const form        = formRow   ? (formRow   as any).data               : null
      const submissions = subRows   ? (subRows   as any[]).map(mapRow)      : null

      set({
        products:    products && products.length > 0 ? products : defaultProducts,
        form:        form ?? defaultForm,
        submissions: submissions ?? [],
        loading:     false,
        dbConnected: true,
      })
    } catch (e) {
      console.error('❌ loadFromDB failed:', e)
      set({ loading: false, error: 'ไม่สามารถเชื่อมต่อ Database ได้', dbConnected: false })
    }
  },

  setProducts: (products) => set({ products }),

  saveProducts: async (products) => {
    set({ products })
    try {
      await supabase.from('products').delete().neq('id', '__none__')
      if (products.length > 0) {
        const { error } = await supabase.from('products').insert(
          products.map(p => ({ id: p.id, data: p })) as any
        )
        if (error) throw error
      }
    } catch (e) {
      console.error('saveProducts:', e)
      set({ error: 'บันทึกสินค้าไม่สำเร็จ' })
    }
  },

  setForm: (form) => set({ form }),

  saveForm: async (form) => {
    set({ form })
    try {
      const { error } = await supabase
        .from('form_config')
        .upsert({ id: 'main', data: form, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      if (error) throw error
    } catch (e) {
      console.error('saveForm:', e)
      set({ error: 'บันทึกฟอร์มไม่สำเร็จ' })
    }
  },

  addSubmission: async (sub) => {
    const id = uid()
    const now = new Date().toISOString()
    const { error } = await supabase.from('submissions').insert({
      id,
      customer_name:   sub.customerName  || '',
      customer_phone:  sub.customerPhone || '',
      customer_email:  sub.customerEmail || '',
      field_values:    sub.fieldValues   || {},
      items:           sub.items         || [],
      shipping_method: sub.shippingMethod || 'pickup',
      subtotal:        sub.subtotal      || 0,
      shipping:        sub.shipping      || 0,
      total_amount:    sub.totalAmount   || 0,
      payment_slip:    sub.paymentSlip   || null,
      payment_status:  'pending',
      submitted_at:    now,
    } as any)
    if (error) throw error
    const newSub: Submission = { ...sub, id, submittedAt: now, paymentStatus: 'pending' }
    set((s) => ({ submissions: [newSub, ...s.submissions] }))
  },

  updateSubmissionPayment: async (id, status, note) => {
    const now = new Date().toISOString()
    set((s) => ({
      submissions: s.submissions.map((sub) =>
        sub.id === id
          ? { ...sub, paymentStatus: status, paymentConfirmedAt: now, paymentNote: note ?? sub.paymentNote }
          : sub
      ),
    }))
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          payment_status:       status,
          payment_confirmed_at: now,
          payment_note:         note || null,
        } as any)
        .eq('id', id)
      if (error) throw error
    } catch (e) {
      console.error('updateSubmissionPayment:', e)
    }
  },

  resetAll: () => set({ products: defaultProducts, form: defaultForm, submissions: [] }),
}))

// ─── Cart Store (localStorage) ─────────────────────────────────────────────────
interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'cartId'>) => void
  updateQty: (cartId: string, delta: number) => void
  removeItem: (cartId: string) => void
  clearCart: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem:    (item)         => set((s) => ({ items: [...s.items, { ...item, cartId: uid() }] })),
      updateQty:  (cartId, delta) => set((s) => ({
        items: s.items.map((i) => i.cartId === cartId ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter((i) => i.qty > 0),
      })),
      removeItem: (cartId)       => set((s) => ({ items: s.items.filter((i) => i.cartId !== cartId) })),
      clearCart:  ()             => set({ items: [] }),
    }),
    { name: 'formcraft-cart' }
  )
)

// ─── Exported types ────────────────────────────────────────────────────────────
export type { AppStore }
