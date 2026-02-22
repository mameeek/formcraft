'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store'

export function DBProvider({ children }: { children: React.ReactNode }) {
  const loadFromDB = useAppStore((s) => s.loadFromDB)
  const error = useAppStore((s) => s.error)
  const loading = useAppStore((s) => s.loading)

  useEffect(() => {
    loadFromDB()
  }, [])

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      {loading && (
        <div style={{
          position: 'fixed', top: 16, right: 20, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.07)', borderRadius: 20,
          padding: '6px 14px', backdropFilter: 'blur(8px)',
          fontSize: 12, color: 'rgba(255,255,255,0.5)',
        }}>
          <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.15)', borderTop: '2px solid #a78bfa', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          กำลังโหลด...
        </div>
      )}
      {error && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#ef4444', color: '#fff', borderRadius: 10, padding: '10px 18px',
          fontSize: 13, fontWeight: 600, zIndex: 9999, maxWidth: 360, textAlign: 'center',
        }}>
          ⚠️ {error}
        </div>
      )}
      {children}
    </>
  )
}
