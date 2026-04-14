'use client'

import React, { useMemo, useState } from 'react'

const NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27,
  13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33,
  1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]

function getColor(n: number) {
  if (n === 0) return '#0a7a3d'
  const red = new Set([
    32,19,21,25,34,27,36,30,23,5,16,1,14,9,18,7,12,3
  ])
  return red.has(n) ? '#c62828' : '#111'
}

export default function RouletteWheelPreview() {
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<number | null>(null)

  const spin = () => {
    const idx = Math.floor(Math.random() * NUMBERS.length)
    const finalNumber = NUMBERS[idx]

    setResult(finalNumber)
    setRotation(r => r + 360 * 5 + idx * (360 / NUMBERS.length))
  }

  const size = 280
  const radius = size / 2

  const wheel = useMemo(() => {
    return NUMBERS.map((n, i) => {
      const angle = (360 / NUMBERS.length) * i
      return (
        <div
          key={n}
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            top: radius - 10,
            left: radius - 10,
            transform: `rotate(${angle}deg) translate(${radius - 20}px) rotate(-${angle}deg)`,
            background: getColor(n),
            color: 'white',
            fontSize: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4
          }}
        >
          {n}
        </div>
      )
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '3px solid gold',
          position: 'relative',
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 3.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
          background: '#111'
        }}
      >
        {wheel}
      </div>

      <button
        onClick={spin}
        style={{
          padding: '8px 14px',
          border: '1px solid gold',
          background: 'transparent',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        SPIN
      </button>

      {result !== null && (
        <div style={{ color: 'gold', fontSize: 14 }}>
          RESULTADO: {result}
        </div>
      )}
    </div>
  )
}