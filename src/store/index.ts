'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, FormConfig, Submission, CartItem, PaymentStatus } from '@/types'
import { defaultProducts, defaultForm } from '@/lib/defaults'
import { uid } from '@/lib/utils'

// ─── Helper ────────────────────────────────────────────────────────────────────
async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { 
    headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
            ...opts })
  if (!res.ok) throw new Error(`${opts?.method || 'GET'} ${url} → ${res.status}`)
  return res.json()
}

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

export const useAppStore = create<AppStore>()((set, get) => ({
  products: defaultProducts,
  form: defaultForm,
  submissions: [],
  loading: false,
  error: null,
  dbConnected: false,
// DEBUG
  loadFromDB: async () => {
  console.log('🔄 loadFromDB called')
  set({ loading: true, error: null })
  try {
    const [products, form, submissions] = await Promise.all([
      apiFetch<Product[]>('/api/products').catch((e) => { console.error('❌ products:', e); return null }),
      apiFetch<FormConfig | null>('/api/form').catch((e) => { console.error('❌ form:', e); return null }),
      apiFetch<Submission[]>('/api/submissions').catch((e) => { console.error('❌ submissions:', e); return null }),
    ])
    console.log('✅ loaded:', { products, form, submissions })
    set({
      products: products && products.length > 0 ? products : defaultProducts,
      form: form ?? defaultForm,
      submissions: submissions ?? [],
      loading: false,
      dbConnected: true,
    })
  } catch (e) {
    console.error('❌ loadFromDB failed:', e)
    set({ loading: false, error: 'ไม่สามารถเชื่อมต่อ Database ได้', dbConnected: false })
  }
},
// END DEBUG
  setProducts: (products) => set({ products }),

  saveProducts: async (products) => {
    set({ products })
    try {
      await apiFetch('/api/products', { method: 'PUT', body: JSON.stringify(products) })
    } catch (e) {
      console.error('saveProducts:', e)
      set({ error: 'บันทึกสินค้าไม่สำเร็จ' })
    }
  },

  setForm: (form) => set({ form }),

  saveForm: async (form) => {
    set({ form })
    try {
      await apiFetch('/api/form', { method: 'PUT', body: JSON.stringify(form) })
    } catch (e) {
      console.error('saveForm:', e)
      set({ error: 'บันทึกฟอร์มไม่สำเร็จ' })
    }
  },

  addSubmission: async (sub) => {
    const { id } = await apiFetch<{ id: string }>('/api/submissions', {
      method: 'POST',
      body: JSON.stringify(sub),
    })
    const newSub: Submission = { ...sub, id, submittedAt: new Date().toISOString(), paymentStatus: 'pending' }
    set((s) => ({ submissions: [newSub, ...s.submissions] }))
  },

  updateSubmissionPayment: async (id, status, note) => {
    set((s) => ({
      submissions: s.submissions.map((sub) =>
        sub.id === id ? { ...sub, paymentStatus: status, paymentConfirmedAt: new Date().toISOString(), paymentNote: note ?? sub.paymentNote } : sub
      ),
    }))
    try {
      await apiFetch(`/api/submissions/${id}`, { method: 'PATCH', body: JSON.stringify({ status, note }) })
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
      addItem: (item) => set((s) => ({ items: [...s.items, { ...item, cartId: uid() }] })),
      updateQty: (cartId, delta) => set((s) => ({
        items: s.items.map((i) => i.cartId === cartId ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter((i) => i.qty > 0),
      })),
      removeItem: (cartId) => set((s) => ({ items: s.items.filter((i) => i.cartId !== cartId) })),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'formcraft-cart' }
  )
)

// ─── Exported types ────────────────────────────────────────────────────────────
export type { AppStore }
