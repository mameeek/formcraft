'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'
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
  submissionsLoaded: boolean
  error: string | null
  dbConnected: boolean

  /** Public data only (products + form config) — safe for the unauthenticated form page. */
  loadPublicData: () => Promise<void>
  /** Public data + submissions — only call this once an admin session is confirmed. */
  loadAdminData: () => Promise<void>
  setProducts: (p: Product[]) => void
  /** Returns true on success, false if the write failed (store.error is set too). */
  saveProducts: (p: Product[]) => Promise<boolean>
  setForm: (f: FormConfig) => void
  /** Returns true on success, false if the write failed (store.error is set too). */
  saveForm: (f: FormConfig) => Promise<boolean>
  addSubmission: (s: Omit<Submission, 'id' | 'submittedAt' | 'paymentStatus'>) => Promise<void>
  updateSubmissionPayment: (id: string, status: PaymentStatus, note?: string) => Promise<void>
  /** Fetches payment_slip for one submission on demand — the admin list loads without it. */
  loadSubmissionSlip: (id: string) => Promise<void>
  resetAll: () => void
}

// Columns for the admin list — payment_slip is deliberately excluded, it's
// fetched per-row only once its detail view is opened (loadSubmissionSlip).
const SUBMISSION_LIST_COLUMNS = 'id, customer_name, customer_phone, customer_email, field_values, items, shipping_method, subtotal, shipping, total_amount, payment_status, payment_confirmed_at, payment_note, submitted_at'

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
    paymentSlip:        row.payment_slip, // undefined when not selected — see SUBMISSION_LIST_COLUMNS
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
  submissionsLoaded: false,
  error: null,
  dbConnected: false,

  loadPublicData: async () => {
    if (get().loading) return
    set({ loading: true, error: null })
    try {
      const [
        { data: prodRows, error: prodErr },
        { data: formRow,  error: formErr },
      ] = await Promise.all([
        supabase.from('products').select('data'),
        supabase.from('form_config').select('data').eq('id', 'main').maybeSingle(),
      ])

      if (prodErr) console.error('❌ products:', prodErr)
      if (formErr) console.error('❌ form:', formErr)

      const products = prodRows ? (prodRows as any[]).map(r => r.data) : null
      const form     = formRow  ? (formRow  as any).data               : null

      set({
        products:    products && products.length > 0 ? products : defaultProducts,
        form:        form ?? defaultForm,
        loading:     false,
        dbConnected: true,
      })
    } catch (e) {
      console.error('❌ loadPublicData failed:', e)
      set({ loading: false, error: 'ไม่สามารถเชื่อมต่อ Database ได้', dbConnected: false })
    }
  },

  loadAdminData: async () => {
    if (get().loading) return
    set({ loading: true, error: null })
    try {
      const [
        { data: prodRows, error: prodErr },
        { data: formRow,  error: formErr },
        { data: subRows,  error: subErr  },
      ] = await Promise.all([
        supabase.from('products').select('data'),
        supabase.from('form_config').select('data').eq('id', 'main').maybeSingle(),
        supabase.from('submissions').select(SUBMISSION_LIST_COLUMNS).order('submitted_at', { ascending: false }),
      ])

      if (prodErr) console.error('❌ products:', prodErr)
      if (formErr) console.error('❌ form:', formErr)
      if (subErr)  console.error('❌ submissions:', subErr)

      const products    = prodRows ? (prodRows as any[]).map(r => r.data) : null
      const form        = formRow  ? (formRow  as any).data               : null
      const submissions = subRows  ? (subRows  as any[]).map(mapRow)      : null

      set({
        products:          products && products.length > 0 ? products : defaultProducts,
        form:              form ?? defaultForm,
        submissions:       submissions ?? [],
        loading:           false,
        submissionsLoaded: true,
        dbConnected:       true,
      })
    } catch (e) {
      console.error('❌ loadAdminData failed:', e)
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
      return true
    } catch (e) {
      console.error('saveProducts:', e)
      set({ error: 'บันทึกสินค้าไม่สำเร็จ' })
      return false
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
      return true
    } catch (e) {
      console.error('saveForm:', e)
      set({ error: 'บันทึกฟอร์มไม่สำเร็จ' })
      return false
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

  loadSubmissionSlip: async (id) => {
    const existing = get().submissions.find((s) => s.id === id)
    if (!existing || existing.paymentSlip !== undefined) return // already loaded (or already null)
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('payment_slip')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      const slip = (data as any)?.payment_slip ?? null
      set((s) => ({
        submissions: s.submissions.map((sub) => sub.id === id ? { ...sub, paymentSlip: slip } : sub),
      }))
    } catch (e) {
      console.error('loadSubmissionSlip:', e)
    }
  },

  resetAll: () => set({ products: defaultProducts, form: defaultForm, submissions: [] }),
}))

// ─── Auth Store (Supabase Auth — gates the admin dashboard) ────────────────────
interface AuthStore {
  session: Session | null
  initialized: boolean
  error: string | null
  signingIn: boolean
  init: () => void
  signInWithPassword: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  session: null,
  initialized: false,
  error: null,
  signingIn: false,

  init: () => {
    if (get().initialized) return
    set({ initialized: true })
    supabase.auth.getSession().then(({ data }) => set({ session: data.session }))
    supabase.auth.onAuthStateChange((_event, session) => set({ session }))
  },

  signInWithPassword: async (email, password) => {
    set({ signingIn: true, error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ signingIn: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
      return false
    }
    set({ signingIn: false, session: data.session })
    return true
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null })
  },
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
