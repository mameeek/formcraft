'use client'

import React from 'react'

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type BtnSize    = 'sm' | 'md' | 'lg'

const btnStyles: Record<BtnVariant, React.CSSProperties> = {
  primary:   { background: 'var(--accent)',    color: '#fff', border: 'none' },
  secondary: { background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid rgba(167,139,250,0.3)' },
  ghost:     { background: 'transparent',      color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  danger:    { background: 'transparent',      color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' },
}

const btnSizes: Record<BtnSize, React.CSSProperties> = {
  sm: { padding: '5px 12px',  fontSize: 12, borderRadius: 7 },
  md: { padding: '9px 18px',  fontSize: 13, borderRadius: 9 },
  lg: { padding: '13px 26px', fontSize: 15, borderRadius: 12 },
}

interface BtnProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: BtnVariant
  size?: BtnSize
  disabled?: boolean
  style?: React.CSSProperties
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
}

export function Btn({ children, onClick, variant = 'ghost', size = 'md', disabled, style, type = 'button', fullWidth }: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontWeight: 600, whiteSpace: 'nowrap',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s ease',
        width: fullWidth ? '100%' : undefined,
        justifyContent: fullWidth ? 'center' : undefined,
        ...btnStyles[variant],
        ...btnSizes[size],
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  placeholder?: string
  type?: string
  style?: React.CSSProperties
  rows?: number
  required?: boolean
  name?: string
}

const inputBase: React.CSSProperties = {
  width: '100%', background: 'var(--bg-deep)',
  border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13,
  padding: '9px 12px', outline: 'none',
  transition: 'border-color 0.15s',
}

export function Input({ value, onChange, placeholder, type = 'text', style, rows, required, name }: InputProps) {
  if (type === 'textarea') {
    return (
      <textarea
        value={value} onChange={onChange} placeholder={placeholder}
        rows={rows || 3} required={required} name={name}
        style={{ ...inputBase, resize: 'vertical', lineHeight: 1.55, ...style }}
      />
    )
  }
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      required={required} name={name}
      style={{ ...inputBase, ...style }}
    />
  )
}

// ─── Large form input (public facing) ─────────────────────────────────────────
export function FormInput({ value, onChange, placeholder, type = 'text', style, rows, required, accentColor }: InputProps & { accentColor?: string }) {
  const base: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
    color: '#fff', fontSize: 15,
    padding: '13px 16px', outline: 'none',
    transition: 'border-color 0.2s',
  }
  if (type === 'textarea') {
    return (
      <textarea value={value} onChange={onChange} placeholder={placeholder}
        rows={rows || 3} required={required}
        style={{ ...base, resize: 'vertical', lineHeight: 1.6, ...style }} />
    )
  }
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      required={required} style={{ ...base, ...style }} />
  )
}

// ─── Label ────────────────────────────────────────────────────────────────────
export function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 11, color: 'var(--text-muted)', fontWeight: 700,
      letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 7,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ value, onChange, children, style }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  children: React.ReactNode; style?: React.CSSProperties
}) {
  return (
    <select value={value} onChange={onChange} style={{
      ...inputBase, cursor: 'pointer', ...style,
    }}>
      {children}
    </select>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style, className }: {
  children: React.ReactNode; style?: React.CSSProperties; className?: string
}) {
  return (
    <div className={className} style={{
      background: 'var(--bg-panel)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 22, ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, color }: {
  label: string; value: string | number; icon: string; color: string
}) {
  return (
    <Card>
      <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </Card>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
export function TabBar({ tabs, active, setActive }: {
  tabs: { id: string; label: string }[]
  active: string
  setActive: (id: string) => void
}) {
  return (
    <div style={{
      display: 'flex', gap: 3,
      background: 'var(--bg-deep)', padding: 4,
      borderRadius: 11, width: 'fit-content', marginBottom: 24,
    }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => setActive(t.id)} style={{
          padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
          background: active === t.id ? 'var(--bg-hover)' : 'transparent',
          color: active === t.id ? 'var(--purple)' : 'var(--text-muted)',
          transition: 'all 0.15s',
        }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 10, color: 'var(--text-muted)', fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Icon Button ──────────────────────────────────────────────────────────────
export function IconBtn({ children, onClick, title, style }: {
  children: React.ReactNode; onClick?: () => void; title?: string; style?: React.CSSProperties
}) {
  return (
    <button onClick={onClick} title={title} style={{
      background: 'transparent', border: 'none', cursor: 'pointer',
      padding: '4px 6px', color: 'var(--text-muted)', fontSize: 14,
      borderRadius: 6, transition: 'all 0.15s', lineHeight: 1, ...style,
    }}>
      {children}
    </button>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ children, color = 'var(--purple)' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      background: color + '22', color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700,
    }}>
      {children}
    </span>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action }: {
  icon: string; title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <Card style={{ textAlign: 'center', padding: '52px 24px' }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 6 }}>
        {title}
      </div>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>{subtitle}</div>}
      {action}
    </Card>
  )
}
