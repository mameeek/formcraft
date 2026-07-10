'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppStore, useAuthStore, useFormsStore } from '@/store'
import Sidebar from '@/components/layout/Sidebar'
import UnsavedGuardModal from '@/components/layout/UnsavedGuardModal'

function Checking() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', color: 'var(--text-muted)', fontSize: 13 }}>
      กำลังตรวจสอบสิทธิ์...
    </div>
  )
}

// Wraps every /dashboard, /editor and /submissions page: redirects to /login
// when there's no admin session, resolves the caller's role for the form in
// ?f=, redirects to /forms if that's missing or access was denied, and only
// then loads that form's data (loadAdminData) — nothing reaches the browser
// before both authentication AND per-form authorization are confirmed.
function AdminShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const formId = searchParams.get('f')

  const { session, initialized, init } = useAuthStore()
  const resolveFormRole = useFormsStore((s) => s.resolveFormRole)
  const currentFormId = useAppStore((s) => s.currentFormId)
  const role = useAppStore((s) => s.role)
  const setRole = useAppStore((s) => s.setRole)
  const loadAdminData = useAppStore((s) => s.loadAdminData)

  useEffect(() => { init() }, [init])

  useEffect(() => {
    if (!initialized) return
    if (!session) { router.replace('/login'); return }
    if (!formId) { router.replace('/forms'); return }
  }, [initialized, session, formId, router])

  useEffect(() => {
    if (!session || !formId) return
    if (formId === currentFormId) return // already resolved/loading this form
    let cancelled = false
    setRole(null)
    resolveFormRole(formId).then((r) => {
      if (cancelled) return
      if (!r) { router.replace('/forms'); return }
      setRole(r)
      loadAdminData(formId)
    })
    return () => { cancelled = true }
  }, [session, formId, currentFormId, resolveFormRole, setRole, loadAdminData, router])

  if (!initialized || !session || !formId || !role || currentFormId !== formId) {
    return <Checking />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </main>
      <UnsavedGuardModal />
    </div>
  )
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Checking />}>
      <AdminShellInner>{children}</AdminShellInner>
    </Suspense>
  )
}
