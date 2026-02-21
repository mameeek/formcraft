'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/store'

const navItems = [
  { href: '/dashboard',   label: 'หน้าหลัก',     icon: '⊞' },
  { href: '/editor',      label: 'แก้ไขฟอร์ม',    icon: '✦' },
  { href: '/submissions', label: 'คำสั่งซื้อ',    icon: '◈' },
  { href: '/form',        label: 'ดูฟอร์ม',       icon: '◉', external: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { form, submissions } = useAppStore()

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
          const Tag = n.external ? 'a' : Link
          const extraProps = n.external ? { href: n.href, target: '_blank' } : { href: n.href }

          return (
            // @ts-ignore
            <Tag key={n.href} {...extraProps} style={{ textDecoration: 'none' }}>
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
                {n.external && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.4 }}>↗</span>
                )}
              </div>
            </Tag>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
        FormCraft
      </div>
    </div>
  )
}
