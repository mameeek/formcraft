'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store'

export function DBProvider({ children }: { children: React.ReactNode }) {
  const loadFromDB = useAppStore((s) => s.loadFromDB)
  const error = useAppStore((s) => s.error)

  useEffect(() => {
    loadFromDB()
  }, [])

  return (
    <>
      {error && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#ef4444', color: '#fff', borderRadius: 10, padding: '10px 18px',
          fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          maxWidth: 360, textAlign: 'center',
        }}>
          ⚠️ {error}
        </div>
      )}
      {children}
    </>
  )
}
