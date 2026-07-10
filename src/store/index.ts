'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'
import type { Product, FormConfig, Submission, CartItem, PaymentStatus, FormMeta, FormPermission, FormRole } from '@/types'
import { defaultProducts, defaultForm, blankFormConfig } from '@/lib/defaults'
import { uid } from '@/lib/utils'
import { supabase } from '@/lib/db'

// ─── App Store (current form's data) ───────────────────────────────────────────
interface AppStore {
  products: Product[]
  form: FormConfig
  submissions: Submission[]
  loading: boolean
  submissionsLoaded: boolean
  error: string | null
  dbConnected: boolean
  /** The form all reads/writes below are scoped to. Set by loadPublicData/loadAdminData. */
  currentFormId: string | null
  /** currentFormId's public slug (for building /form/?f=<slug> links) — admin side only. */
  currentFormSlug: string | null
  /** Caller's role on currentFormId, resolved by AdminShell. null until resolved / no access. */
  role: FormRole | null
  setRole: (role: FormRole | null) => void

  /** Public data only (products + form config) for one form, resolved by slug — safe for the unauthenticated form page. */
  loadPublicData: (slug: string) => Promise<void>
  /** Public data + submissions for one form, by id — only call once an admin session + role is confirmed. */
  loadAdminData: (formId: string) => Promise<void>
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
  currentFormId: null,
  currentFormSlug: null,
  role: null,
  setRole: (role) => set({ role }),

  loadPublicData: async (slug) => {
    if (get().loading) return
    set({ loading: true, error: null })
    try {
      const { data: formId, error: idErr } = await supabase.rpc('form_id_for_slug', { p_slug: slug })
      if (idErr) throw idErr
      if (!formId) {
        set({ loading: false, error: 'ไม่พบฟอร์มนี้', currentFormId: null })
        return
      }

      const [
        { data: prodRows, error: prodErr },
        { data: formRow,  error: formErr },
      ] = await Promise.all([
        supabase.from('products').select('data').eq('form_id', formId),
        supabase.from('form_config').select('data').eq('id', formId).maybeSingle(),
      ])

      if (prodErr) console.error('❌ products:', prodErr)
      if (formErr) console.error('❌ form:', formErr)

      const products = prodRows ? (prodRows as any[]).map(r => r.data) : null
      const form     = formRow  ? (formRow  as any).data               : null

      set({
        products:      products ?? [],
        form:          form ?? defaultForm,
        loading:       false,
        dbConnected:   true,
        currentFormId: formId,
      })
    } catch (e) {
      console.error('❌ loadPublicData failed:', e)
      set({ loading: false, error: 'ไม่สามารถเชื่อมต่อ Database ได้', dbConnected: false })
    }
  },

  loadAdminData: async (formId) => {
    if (get().loading) return
    set({ loading: true, error: null })
    try {
      const [
        { data: prodRows, error: prodErr },
        { data: formRow,  error: formErr },
        { data: subRows,  error: subErr  },
        { data: formMeta, error: metaErr },
      ] = await Promise.all([
        supabase.from('products').select('data').eq('form_id', formId),
        supabase.from('form_config').select('data').eq('id', formId).maybeSingle(),
        supabase.from('submissions').select(SUBMISSION_LIST_COLUMNS).eq('form_id', formId).order('submitted_at', { ascending: false }),
        supabase.from('forms').select('slug').eq('id', formId).maybeSingle(),
      ])

      if (prodErr) console.error('❌ products:', prodErr)
      if (formErr) console.error('❌ form:', formErr)
      if (subErr)  console.error('❌ submissions:', subErr)
      if (metaErr) console.error('❌ form meta:', metaErr)

      const products    = prodRows ? (prodRows as any[]).map(r => r.data) : null
      const form        = formRow  ? (formRow  as any).data               : null
      const submissions = subRows  ? (subRows  as any[]).map(mapRow)      : null

      set({
        products:          products ?? [],
        form:              form ?? defaultForm,
        submissions:       submissions ?? [],
        loading:           false,
        submissionsLoaded: true,
        dbConnected:       true,
        currentFormId:     formId,
        currentFormSlug:   (formMeta as any)?.slug ?? null,
      })
    } catch (e) {
      console.error('❌ loadAdminData failed:', e)
      set({ loading: false, error: 'ไม่สามารถเชื่อมต่อ Database ได้', dbConnected: false })
    }
  },

  setProducts: (products) => set({ products }),

  saveProducts: async (products) => {
    set({ products })
    const formId = get().currentFormId
    if (!formId) { set({ error: 'ไม่พบฟอร์มปัจจุบัน' }); return false }
    try {
      await supabase.from('products').delete().eq('form_id', formId)
      if (products.length > 0) {
        const { error } = await supabase.from('products').insert(
          products.map(p => ({ id: p.id, form_id: formId, data: p })) as any
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
    const formId = get().currentFormId
    if (!formId) { set({ error: 'ไม่พบฟอร์มปัจจุบัน' }); return false }
    try {
      const { error } = await supabase
        .from('form_config')
        .upsert({ id: formId, data: form, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      if (error) throw error
      return true
    } catch (e) {
      console.error('saveForm:', e)
      set({ error: 'บันทึกฟอร์มไม่สำเร็จ' })
      return false
    }
  },

  addSubmission: async (sub) => {
    const formId = get().currentFormId
    if (!formId) throw new Error('ไม่พบฟอร์มปัจจุบัน')
    const id = uid()
    const now = new Date().toISOString()
    const { error } = await supabase.from('submissions').insert({
      id,
      form_id:         formId,
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

  resetAll: () => set({ products: defaultProducts, form: defaultForm, submissions: [], currentFormId: null, currentFormSlug: null, role: null }),
}))

// ─── Forms Store (the forms list, creation, and per-form permissions) ─────────
interface FormsStore {
  forms: FormMeta[]
  loading: boolean
  error: string | null
  canCreateForms: boolean

  listMyForms: () => Promise<void>
  checkCanCreateForms: () => Promise<void>
  createForm: (title: string, slug: string) => Promise<string | null>
  listFormPermissions: (formId: string) => Promise<FormPermission[]>
  grantFormPermission: (formId: string, email: string, role: Exclude<FormRole, 'owner'>) => Promise<boolean>
  revokeFormPermission: (formId: string, email: string) => Promise<boolean>
  /** null = no access at all (hide/redirect); otherwise the caller's role for that form. */
  resolveFormRole: (formId: string) => Promise<FormRole | null>
}

function myEmail(): string {
  return (useAuthStore.getState().session?.user?.email || '').toLowerCase()
}

export const useFormsStore = create<FormsStore>()((set) => ({
  forms: [],
  loading: false,
  error: null,
  canCreateForms: false,

  listMyForms: async () => {
    set({ loading: true, error: null })
    try {
      const email = myEmail()
      const { data: formRows, error } = await supabase.from('forms').select('id, slug, owner_email, created_at')
      if (error) throw error

      const ids = (formRows || []).map((f: any) => f.id)
      const [{ data: configRows }, { data: permRows }] = await Promise.all([
        ids.length ? supabase.from('form_config').select('id, data').in('id', ids) : Promise.resolve({ data: [] as any[] }),
        supabase.from('form_permissions').select('form_id, role').eq('email', email),
      ])

      const titleByFormId = new Map((configRows || []).map((c: any) => [c.id, c.data?.title || '']))
      const roleByFormId  = new Map((permRows   || []).map((p: any) => [p.form_id, p.role]))

      const forms: FormMeta[] = (formRows || []).map((f: any) => ({
        id: f.id,
        slug: f.slug,
        ownerEmail: f.owner_email,
        createdAt: f.created_at,
        title: titleByFormId.get(f.id) || f.slug,
        role: f.owner_email === email ? 'owner' : (roleByFormId.get(f.id) || 'viewer'),
      }))

      set({ forms, loading: false })
    } catch (e) {
      console.error('listMyForms:', e)
      set({ loading: false, error: 'โหลดรายการฟอร์มไม่สำเร็จ' })
    }
  },

  checkCanCreateForms: async () => {
    const email = myEmail()
    if (!email) { set({ canCreateForms: false }); return }
    const { data, error } = await supabase.from('platform_admins').select('email').eq('email', email).maybeSingle()
    set({ canCreateForms: !error && !!data })
  },

  createForm: async (title, slug) => {
    const email = myEmail()
    if (!email) return null
    const id = uid()
    try {
      const { error: formErr } = await supabase.from('forms').insert({ id, slug, owner_email: email } as any)
      if (formErr) throw formErr
      const config = { ...blankFormConfig(title), id }
      const { error: cfgErr } = await supabase.from('form_config').insert({ id, data: config } as any)
      if (cfgErr) throw cfgErr
      return id
    } catch (e) {
      console.error('createForm:', e)
      set({ error: 'สร้างฟอร์มไม่สำเร็จ (slug อาจซ้ำ)' })
      return null
    }
  },

  listFormPermissions: async (formId) => {
    const { data, error } = await supabase
      .from('form_permissions')
      .select('form_id, email, role, granted_at')
      .eq('form_id', formId)
      .order('granted_at', { ascending: true })
    if (error) { console.error('listFormPermissions:', error); return [] }
    return (data || []).map((r: any) => ({ formId: r.form_id, email: r.email, role: r.role, grantedAt: r.granted_at }))
  },

  grantFormPermission: async (formId, email, role) => {
    const { error } = await supabase
      .from('form_permissions')
      .upsert({ form_id: formId, email: email.trim().toLowerCase(), role } as any, { onConflict: 'form_id,email' })
    if (error) { console.error('grantFormPermission:', error); return false }
    return true
  },

  revokeFormPermission: async (formId, email) => {
    const { error } = await supabase
      .from('form_permissions')
      .delete()
      .eq('form_id', formId)
      .eq('email', email.trim().toLowerCase())
    if (error) { console.error('revokeFormPermission:', error); return false }
    return true
  },

  resolveFormRole: async (formId) => {
    const email = myEmail()
    if (!email) return null
    const { data: formRow, error } = await supabase.from('forms').select('owner_email').eq('id', formId).maybeSingle()
    if (error || !formRow) return null
    if ((formRow as any).owner_email === email) return 'owner'
    const { data: permRow } = await supabase.from('form_permissions').select('role').eq('form_id', formId).eq('email', email).maybeSingle()
    return (permRow as any)?.role ?? null
  },
}))

// ─── Auth Store (Supabase Auth — gates the admin dashboard) ────────────────────
interface AuthStore {
  session: Session | null
  initialized: boolean
  error: string | null
  signingIn: boolean
  init: () => void
  signInWithPassword: (email: string, password: string) => Promise<boolean>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

let authInitStarted = false

export const useAuthStore = create<AuthStore>()((set) => ({
  session: null,
  initialized: false,
  error: null,
  signingIn: false,

  // `initialized` only flips once the session lookup has actually resolved —
  // flipping it synchronously (before getSession() resolves) meant every page
  // that gates on (initialized, !session) briefly saw "logged out" on a hard
  // reload, even for an already-authenticated user, and bounced through /login.
  init: () => {
    if (authInitStarted) return
    authInitStarted = true
    supabase.auth.getSession().then(({ data }) => set({ session: data.session, initialized: true }))
    supabase.auth.onAuthStateChange((_event, session) => set({ session, initialized: true }))
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

  signInWithGoogle: async () => {
    set({ error: null })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    })
    if (error) set({ error: 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ' })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null })
  },
}))

// ─── Unsaved Changes Guard (Discord-style "you have unsaved changes") ─────────
// The editor registers its save/discard handlers here while it has a dirty
// draft. Anything that navigates away in-app (Sidebar links, etc.) should call
// guardNavigate() instead of navigating directly — if there's a dirty draft it
// stashes the navigation and shows a Save/Discard/Cancel modal instead of just
// leaving; browser tab close/refresh is handled separately via beforeunload.
interface UnsavedGuardStore {
  dirty: boolean
  pendingAction: (() => void) | null
  saveHandler: (() => Promise<boolean>) | null
  discardHandler: (() => void) | null
  setDirty: (dirty: boolean) => void
  registerHandlers: (save: () => Promise<boolean>, discard: () => void) => void
  clearHandlers: () => void
  /** Call instead of navigating directly. Runs `action` now if clean, otherwise defers it. */
  guardNavigate: (action: () => void) => void
  resolvePending: (choice: 'save' | 'discard' | 'cancel') => Promise<void>
}

export const useUnsavedGuard = create<UnsavedGuardStore>()((set, get) => ({
  dirty: false,
  pendingAction: null,
  saveHandler: null,
  discardHandler: null,

  setDirty: (dirty) => set({ dirty }),
  registerHandlers: (save, discard) => set({ saveHandler: save, discardHandler: discard }),
  clearHandlers: () => set({ saveHandler: null, discardHandler: null, dirty: false, pendingAction: null }),

  guardNavigate: (action) => {
    if (get().dirty) set({ pendingAction: action })
    else action()
  },

  resolvePending: async (choice) => {
    const { pendingAction, saveHandler, discardHandler } = get()
    if (choice === 'cancel') { set({ pendingAction: null }); return }
    if (choice === 'save') {
      const ok = saveHandler ? await saveHandler() : false
      if (!ok) return // save failed — stay put, keep the pending nav so they can retry or cancel
    }
    if (choice === 'discard') discardHandler?.()
    set({ dirty: false, pendingAction: null })
    pendingAction?.()
  },
}))

// ─── Cart Store (localStorage, one per form so carts never leak between forms) ─
interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'cartId'>) => void
  updateQty: (cartId: string, delta: number) => void
  removeItem: (cartId: string) => void
  clearCart: () => void
}

function createCartStore(formKey: string) {
  return create<CartStore>()(
    persist(
      (set) => ({
        items: [],
        addItem:    (item)          => set((s) => ({ items: [...s.items, { ...item, cartId: uid() }] })),
        updateQty:  (cartId, delta) => set((s) => ({
          items: s.items.map((i) => i.cartId === cartId ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter((i) => i.qty > 0),
        })),
        removeItem: (cartId)        => set((s) => ({ items: s.items.filter((i) => i.cartId !== cartId) })),
        clearCart:  ()               => set({ items: [] }),
      }),
      { name: `formcraft-cart-${formKey}` }
    )
  )
}

const cartStoreCache = new Map<string, ReturnType<typeof createCartStore>>()

/** Pass the form's slug (or id) so each form gets its own isolated cart. */
export function useCartStore(formKey: string) {
  let store = cartStoreCache.get(formKey)
  if (!store) {
    store = createCartStore(formKey)
    cartStoreCache.set(formKey, store)
  }
  return store()
}

// ─── Exported types ────────────────────────────────────────────────────────────
export type { AppStore }
