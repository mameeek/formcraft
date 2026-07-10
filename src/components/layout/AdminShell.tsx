'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, useAuthStore } from '@/store'
import Sidebar from '@/components/layout/Sidebar'

// Wraps every /dashboard, /editor and /submissions page: redirects to /login
// when there's no admin session, and only then loads submissions (loadAdminData)
// so that data never reaches the browser before the user is authenticated.
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { session, initialized, init } = useAuthStore()
  const loadAdminData = useAppStore((s) => s.loadAdminData)
  const submissionsLoaded = useAppStore((s) => s.submissionsLoaded)

  useEffect(() => { init() }, [init])

  useEffect(() => {
    if (initialized && !session) router.replace('/login')
  }, [initialized, session, router])

  useEffect(() => {
    if (session && !submissionsLoaded) loadAdminData()
  }, [session, submissionsLoaded, loadAdminData])

  if (!initialized || !session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', color: 'var(--text-muted)', fontSize: 13 }}>
        กำลังตรวจสอบสิทธิ์...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
