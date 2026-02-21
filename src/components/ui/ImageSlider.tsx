'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'

interface ImageSliderProps {
  images: string[]
  alt: string
  height?: number
  fallbackEmoji?: string
  rounded?: boolean
}

export default function ImageSlider({
  images,
  alt,
  height = 200,
  fallbackEmoji = '📦',
  rounded = true,
}: ImageSliderProps) {
  const [current, setCurrent] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const validImages = images.filter(Boolean)
  const hasImages = validImages.length > 0

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrent((c) => (c - 1 + validImages.length) % validImages.length)
  }, [validImages.length])

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrent((c) => (c + 1) % validImages.length)
  }, [validImages.length])

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height,
    background: 'var(--bg-deep)',
    borderRadius: rounded ? 12 : 0,
    overflow: 'hidden',
    flexShrink: 0,
  }

  // Fallback when no images
  if (!hasImages) {
    return (
      <div style={{
        ...containerStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: height * 0.35,
        background: 'linear-gradient(135deg, var(--bg-panel), var(--bg-deep))',
      }}>
        {fallbackEmoji}
      </div>
    )
  }

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Images */}
      {validImages.map((src, i) => (
        <div
          key={src}
          style={{
            position: 'absolute', inset: 0,
            opacity: i === current ? 1 : 0,
            transition: 'opacity 0.35s ease',
          }}
        >
          <Image
            src={src}
            alt={`${alt} ${i + 1}`}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={i === 0}
          />
        </div>
      ))}

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      {/* Nav arrows – only when multiple images */}
      {validImages.length > 1 && (
        <>
          <button
            onClick={prev}
            style={{
              position: 'absolute', left: 8, top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', borderRadius: 8,
              width: 30, height: 30, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.2s, transform 0.15s',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            ‹
          </button>
          <button
            onClick={next}
            style={{
              position: 'absolute', right: 8, top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', borderRadius: 8,
              width: 30, height: 30, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.2s',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            ›
          </button>

          {/* Dot indicators */}
          <div style={{
            position: 'absolute', bottom: 10, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', gap: 5, alignItems: 'center',
          }}>
            {validImages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i) }}
                className={`slider-dot ${i === current ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Counter */}
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            color: '#fff', fontSize: 10, fontWeight: 600,
            padding: '3px 7px', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {current + 1}/{validImages.length}
          </div>
        </>
      )}
    </div>
  )
}
