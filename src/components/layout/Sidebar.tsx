'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAppStore, useAuthStore, useUnsavedGuard } from '@/store'

const navItems = [
  { href: '/dashboard',   label: 'หน้าหลัก',     icon: '⊞' },
  { href: '/editor',      label: 'แก้ไขฟอร์ม',    icon: '✦' },
  { href: '/submissions', label: 'คำสั่งซื้อ',    icon: '◈' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { form, submissions, currentFormSlug } = useAppStore()
  const signOut = useAuthStore((s) => s.signOut)
  const guardNavigate = useUnsavedGuard((s) => s.guardNavigate)

  const formId = searchParams.get('f') || ''
  const qs = formId ? `?f=${formId}` : ''

  // Every in-app navigation goes through guardNavigate so a dirty editor
  // draft can't be silently abandoned by clicking somewhere else in the app.
  const go = (e: React.MouseEvent, href: string) => {
    e.preventDefault()
    guardNavigate(() => router.push(href))
  }

  const handleSignOut = () => {
    guardNavigate(async () => {
      await signOut()
      router.replace('/login')
    })
  }

  return (
    <div style={{
      width: 230, background: 'var(--bg-deep)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ padding: '22px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, background: 'var(--accent)',
            borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: '#fff',
          }}>
            F
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#fff', lineHeight: 1 }}>
              FormCraft
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              Next.js · Dynamic Forms
            </div>
          </div>
        </div>
      </div>

      {/* Form info */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/forms" onClick={(e) => go(e, '/forms')} style={{ textDecoration: 'none', fontSize: 11, color: 'var(--purple)', display: 'inline-block', marginBottom: 8 }}>
          ← ฟอร์มทั้งหมด
        </Link>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          ฟอร์มปัจจุบัน
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.4 }}>
          {form.logoEmoji} {form.title}
        </div>
        <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: form.published ? 'var(--green)' : 'var(--text-muted)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {form.published ? 'เผยแพร่แล้ว' : 'ยังไม่เผยแพร่'}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {navItems.map((n) => {
          const isActive = pathname === n.href || pathname.startsWith(n.href + '/')

          const target = `${n.href}${qs}`
          return (
            <Link key={n.href} href={target} onClick={(e) => go(e, target)} style={{ textDecoration: 'none' }}>
              <div style={{
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--border-active)' : 'transparent'}`,
                color: isActive ? 'var(--purple)' : 'var(--text-muted)',
                borderRadius: 9, padding: '10px 13px',
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                marginBottom: 2, transition: 'all 0.15s', cursor: 'pointer',
              }}>
                <span style={{ fontSize: 15, opacity: isActive ? 1 : 0.5 }}>{n.icon}</span>
                <span>{n.label}</span>
                {n.href === '/submissions' && submissions.length > 0 && (
                  <span style={{
                    marginLeft: 'auto', background: 'var(--accent)', color: '#fff',
                    borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                  }}>
                    {submissions.length}
                  </span>
                )}
              </div>
            </Link>
          )
        })}

        {currentFormSlug && (
          <Link href={`/form?f=${currentFormSlug}`} target="_blank" style={{ textDecoration: 'none' }}>
            <div style={{
              color: 'var(--text-muted)', borderRadius: 9, padding: '10px 13px',
              display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
              marginBottom: 2, cursor: 'pointer',
            }}>
              <span style={{ fontSize: 15, opacity: 0.5 }}>◉</span>
              <span>ดูฟอร์ม</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.4 }}>↗</span>
            </div>
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
        <button onClick={handleSignOut} style={{
          width: '100%', background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-muted)', borderRadius: 8, padding: '8px 0',
          fontSize: 12, cursor: 'pointer', marginBottom: 8,
        }}>
          ออกจากระบบ
        </button>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>FormCraft</div>
      </div>
    </div>
  )
}
