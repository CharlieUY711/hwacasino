'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useWallet } from '@/hooks/useWallet'

const GOLD = '#D4AF37'
const GOLD_LIGHT = '#F0D060'
const DARK = '#0A0A0A'
const GREEN_FELT = '#0a3d24'

// Orden real de la ruleta europea
const WHEEL_ORDER = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
]

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])

function getColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green'
  return RED_NUMBERS.has(n) ? 'red' : 'black'
}

const CHIPS = [
  { value: 100,   label: '100',  bg: '#e8e8e8', color: '#111', border: '#bbb' },
  { value: 500,   label: '500',  bg: '#16a34a', color: '#fff', border: '#15803d' },
  { value: 1000,  label: '1K',   bg: '#dc2626', color: '#fff', border: '#b91c1c' },
  { value: 2000,  label: '2K',   bg: '#2563eb', color: '#fff', border: '#1d4ed8' },
  { value: 5000,  label: '5K',   bg: '#1a1a1a', color: GOLD,   border: GOLD },
  { value: 10000, label: '10K',  bg: '#7c3aed', color: '#fff', border: '#6d28d9' },
  { value: 50000, label: '50K',  bg: '#b45309', color: '#fff', border: GOLD },
]

// Números fríos y calientes mock
const MOCK_HOT = [17, 32, 5, 21, 0]
const MOCK_COLD = [3, 36, 14, 25, 8]
const MOCK_HISTORY = [
  17, 0, 32, 5, 21, 14, 7, 32, 19, 3,
  25, 11, 17, 0, 6, 32, 21, 8, 14, 17
]

// Grid de la mesa (columnas de 3, de arriba abajo)
// Orden visual: fila 3 arriba, fila 1 abajo
const TABLE_COLS: number[][] = []
for (let col = 0; col < 12; col++) {
  TABLE_COLS.push([
    col * 3 + 3,
    col * 3 + 2,
    col * 3 + 1,
  ])
}

type BetSpot = {
  id: string
  type: 'number' | 'color' | 'parity' | 'dozen' | 'column' | 'half' | 'split2' | 'split4'
  value: string
  amount: number
}

export default function RoulettePlayPage() {
  const router = useRouter()
  const { balance, formatChips } = useWallet()
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedChip, setSelectedChip] = useState(CHIPS[0])
  const [bets, setBets] = useState<BetSpot[]>([])
  const [lastBets, setLastBets] = useState<BetSpot[]>([])
  const [spinning, setSpinning] = useState(false)
  const [resultNumber, setResultNumber] = useState<number | null>(null)
  const [resultColor, setResultColor] = useState<string | null>(null)
  const [totalPayout, setTotalPayout] = useState<number | null>(null)
  const [totalWon, setTotalWon] = useState<boolean | null>(null)
  const [history, setHistory] = useState<number[]>(MOCK_HISTORY)
  const [activeTab, setActiveTab] = useState<'hot' | 'cold' | 'history'>('hot')
  const [error, setError] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  const wheelRef = useRef<SVGGElement>(null)
  const ballRef = useRef<SVGCircleElement>(null)
  const currentRotation = useRef(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/'); return }
      setUserId(user.id)
    })
  }, [router])

  // Calcular ángulo del número en la rueda
  function getAngleForNumber(n: number): number {
    const idx = WHEEL_ORDER.indexOf(n)
    return (idx / 37) * 360
  }

  function addBet(type: BetSpot['type'], value: string) {
    const id = `${type}:${value}`
    setBets(prev => {
      const existing = prev.find(b => b.id === id)
      if (existing) {
        return prev.map(b => b.id === id ? { ...b, amount: b.amount + selectedChip.value } : b)
      }
      return [...prev, { id, type, value, amount: selectedChip.value }]
    })
  }

  function removeLast() {
    setBets(prev => {
      if (prev.length === 0) return prev
      const copy = [...prev]
      const last = copy[copy.length - 1]
      if (last.amount > selectedChip.value) {
        copy[copy.length - 1] = { ...last, amount: last.amount - selectedChip.value }
      } else {
        copy.pop()
      }
      return copy
    })
  }

  function clearBets() { setBets([]) }

  function repeatBets() {
    if (lastBets.length > 0) setBets(lastBets)
  }

  function doubleBets() {
    setBets(prev => prev.map(b => ({ ...b, amount: b.amount * 2 })))
  }

  const totalBet = bets.reduce((sum, b) => sum + b.amount, 0)

  function getBetOnSpot(id: string): number {
    return bets.find(b => b.id === id)?.amount ?? 0
  }

  async function spin() {
    if (!userId || spinning || bets.length === 0) return
    setSpinning(true)
    setError(null)
    setShowResult(false)
    setResultNumber(null)

    // Animación rueda — giro continuo rápido
    if (wheelRef.current) {
      currentRotation.current += 1440 + Math.random() * 360
      wheelRef.current.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.1, 1.0)'
      wheelRef.current.style.transform = `rotate(${currentRotation.current}deg)`
    }

    // Llamar al backend por cada apuesta
    let netPayout = 0
    let anyWin = false
    let spinResult: number | null = null
    let spinColor: string | null = null

    try {
      for (const bet of bets) {
        const res = await fetch('/api/play/roulette', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            bet_type: bet.type,
            bet_value: bet.value,
            amount: bet.amount,
          }),
        })
        const data = await res.json()
        if (data.error) {
          setError(data.error === 'insufficient_balance' ? 'Saldo insuficiente' : 'Error al procesar')
          setSpinning(false)
          return
        }
        if (spinResult === null) {
          spinResult = data.result
          spinColor = data.color
        }
        netPayout += data.payout
        if (data.won) anyWin = true
      }
    } catch {
      setError('Error de conexión')
      setSpinning(false)
      return
    }

    // Esperar animación y mostrar resultado
    setTimeout(() => {
      if (spinResult !== null && wheelRef.current) {
        // Ajustar rueda al número exacto
        const targetAngle = getAngleForNumber(spinResult)
        const snap = currentRotation.current - (currentRotation.current % 360) + (360 - targetAngle)
        currentRotation.current = snap
        wheelRef.current.style.transition = 'transform 1s cubic-bezier(0.0, 0.0, 0.2, 1.0)'
        wheelRef.current.style.transform = `rotate(${snap}deg)`
      }

      setTimeout(() => {
        setResultNumber(spinResult)
        setResultColor(spinColor)
        setTotalPayout(netPayout)
        setTotalWon(anyWin)
        setHistory(prev => [spinResult!, ...prev].slice(0, 30))
        setLastBets(bets)
        setBets([])
        setSpinning(false)
        setShowResult(true)
      }, 1100)
    }, 4100)
  }

  const colorHex = (c: string) => c === 'red' ? '#cc2200' : c === 'green' ? '#15803d' : '#111'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Montserrat:wght@200;300;400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${DARK}; overflow-x: hidden; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGold {
          0%,100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.4); }
          50%      { box-shadow: 0 0 0 8px rgba(212,175,55,0); }
        }
        @keyframes resultIn {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        .chip-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; cursor: pointer; }
        .chip-btn:hover { transform: scale(1.12) translateY(-3px); }
        .chip-btn.active { transform: scale(1.2) translateY(-5px); box-shadow: 0 8px 20px rgba(212,175,55,0.5); }

        .bet-cell { position: relative; transition: background 0.15s ease; cursor: pointer; user-select: none; }
        .bet-cell:hover { background: rgba(212,175,55,0.15) !important; }
        .bet-cell:active { background: rgba(212,175,55,0.25) !important; }

        .spin-btn {
          background: linear-gradient(135deg, #f2ca50 0%, #b89124 50%, #f2ca50 100%);
          background-size: 200% 100%;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .spin-btn:hover:not(:disabled) {
          animation: shimmer 1s linear infinite;
          transform: scale(1.02);
          box-shadow: 0 0 40px rgba(212,175,55,0.5);
        }
        .spin-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .action-btn { transition: all 0.15s ease; cursor: pointer; }
        .action-btn:hover { background: rgba(255,255,255,0.1) !important; }

        .tab-btn { transition: all 0.2s ease; cursor: pointer; }

        .result-overlay {
          animation: resultIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        .number-badge {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.6rem; font-weight: 700; flex-shrink: 0;
        }
      `}</style>

      <main style={{ minHeight: '100dvh', background: DARK, fontFamily: "'Montserrat', sans-serif", maxWidth: '480px', margin: '0 auto', paddingBottom: '80px' }}>

        {/* ── HEADER ── */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(212,175,55,0.12)', background: 'rgba(10,10,10,0.95)', position: 'sticky', top: 0, zIndex: 90 }}>
          <button onClick={() => router.push('/roulette')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '0.55rem', letterSpacing: '0.25em', fontFamily: "'Montserrat', sans-serif" }}>← MESAS</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: GOLD, fontStyle: 'italic', letterSpacing: '0.1em' }}>HWA</span>
            <span style={{ fontSize: '0.5rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>ROULETTE</span>
          </div>
          <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '3px', padding: '6px 12px' }}>
            <span style={{ fontSize: '0.65rem', color: GOLD, fontWeight: 700, letterSpacing: '0.05em' }}>{formatChips(balance)}</span>
          </div>
        </div>

        {/* ── RUEDA SVG ── */}
        <div style={{ background: 'radial-gradient(ellipse at center, #1a0e00 0%, #0a0a0a 70%)', padding: '24px 20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 240, height: 240 }}>
            <svg width="240" height="240" viewBox="0 0 240 240" style={{ overflow: 'visible' }}>
              {/* Sombra exterior */}
              <defs>
                <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(212,175,55,0.1)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
                <filter id="shadow">
                  <feDropShadow dx="0" dy="4" stdDeviation="12" floodColor="rgba(0,0,0,0.8)" />
                </filter>
              </defs>

              {/* Aro exterior decorativo */}
              <circle cx="120" cy="120" r="118" fill="#1a1200" stroke={GOLD} strokeWidth="2.5" />
              <circle cx="120" cy="120" r="112" fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="1" />

              {/* Grupo giratorio */}
              <g ref={wheelRef} style={{ transformOrigin: '120px 120px', transform: 'rotate(0deg)' }}>
                {WHEEL_ORDER.map((num, i) => {
                  const angle = (i / 37) * 360
                  const startAngle = (angle - 360 / 37 / 2) * Math.PI / 180
                  const endAngle = (angle + 360 / 37 / 2) * Math.PI / 180
                  const r1 = 108, r2 = 55
                  const x1 = 120 + r1 * Math.cos(startAngle)
                  const y1 = 120 + r1 * Math.sin(startAngle)
                  const x2 = 120 + r1 * Math.cos(endAngle)
                  const y2 = 120 + r1 * Math.sin(endAngle)
                  const x3 = 120 + r2 * Math.cos(endAngle)
                  const y3 = 120 + r2 * Math.sin(endAngle)
                  const x4 = 120 + r2 * Math.cos(startAngle)
                  const y4 = 120 + r2 * Math.sin(startAngle)
                  const c = getColor(num)
                  const fill = c === 'green' ? '#0d5c1e' : c === 'red' ? '#8B0000' : '#111'

                  // Texto del número
                  const midAngle = angle * Math.PI / 180
                  const rText = 82
                  const tx = 120 + rText * Math.cos(midAngle)
                  const ty = 120 + rText * Math.sin(midAngle)

                  return (
                    <g key={num}>
                      <path
                        d={`M ${x1} ${y1} A ${r1} ${r1} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${r2} ${r2} 0 0 0 ${x4} ${y4} Z`}
                        fill={fill}
                        stroke="rgba(212,175,55,0.25)"
                        strokeWidth="0.5"
                      />
                      <text
                        x={tx} y={ty}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="rgba(255,255,255,0.9)"
                        fontSize="7"
                        fontWeight="700"
                        fontFamily="Montserrat, sans-serif"
                        transform={`rotate(${angle + 90}, ${tx}, ${ty})`}
                      >
                        {num}
                      </text>
                    </g>
                  )
                })}

                {/* Separadores dorados */}
                {WHEEL_ORDER.map((_, i) => {
                  const angle = ((i / 37) * 360 - 360 / 37 / 2) * Math.PI / 180
                  return (
                    <line
                      key={`sep-${i}`}
                      x1={120 + 55 * Math.cos(angle)}
                      y1={120 + 55 * Math.sin(angle)}
                      x2={120 + 108 * Math.cos(angle)}
                      y2={120 + 108 * Math.sin(angle)}
                      stroke="rgba(212,175,55,0.5)"
                      strokeWidth="0.8"
                    />
                  )
                })}

                {/* Hub central */}
                <circle cx="120" cy="120" r="54" fill="#0d0d0d" stroke={GOLD} strokeWidth="1.5" />
                <circle cx="120" cy="120" r="46" fill="url(#wheelGlow)" stroke="rgba(212,175,55,0.2)" strokeWidth="1" />
                <circle cx="120" cy="120" r="12" fill={GOLD} />
                <circle cx="120" cy="120" r="6" fill="#0d0d0d" />
              </g>

              {/* Puntero fijo */}
              <polygon
                points="120,8 115,22 125,22"
                fill={GOLD}
                filter="url(#shadow)"
              />
              <circle cx="120" cy="24" r="3" fill={GOLD} />

              {/* Bolita (posición fija mientras no gira, animada al girar) */}
              <circle
                ref={ballRef}
                cx="120"
                cy="20"
                r="5"
                fill="#f0f0f0"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1"
                style={{ display: spinning ? 'block' : 'none' }}
              />
            </svg>

            {/* Número resultado en el hub */}
            {resultNumber !== null && !spinning && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 44, height: 44, borderRadius: '50%', background: colorHex(resultColor!), border: `2px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', color: '#fff', fontWeight: 700 }}>{resultNumber}</span>
              </div>
            )}
          </div>

          {/* Apuesta total */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.42rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>APUESTA TOTAL</p>
              <p style={{ fontSize: '0.85rem', color: totalBet > 0 ? GOLD : 'rgba(255,255,255,0.2)', fontWeight: 700 }}>{totalBet.toLocaleString('es-UY')} N</p>
            </div>
            {bets.length > 0 && (
              <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
                {bets.length} apuesta{bets.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* ── PANEL CALIENTES / FRÍOS / HISTORIAL ── */}
        <div style={{ margin: '0 16px 16px', background: '#111', border: '1px solid rgba(212,175,55,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
            {(['hot', 'cold', 'history'] as const).map(tab => (
              <button
                key={tab}
                className="tab-btn"
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? 'rgba(212,175,55,0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? `2px solid ${GOLD}` : '2px solid transparent',
                  padding: '10px 0',
                  fontSize: '0.42rem',
                  letterSpacing: '0.2em',
                  color: activeTab === tab ? GOLD : 'rgba(255,255,255,0.3)',
                  fontWeight: 600,
                  fontFamily: "'Montserrat', sans-serif",
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {tab === 'hot' ? '🔥 CALIENTES' : tab === 'cold' ? '❄️ FRÍOS' : '📋 HISTORIAL'}
              </button>
            ))}
          </div>

          {/* Contenido */}
          <div style={{ padding: '12px 14px' }}>
            {activeTab === 'hot' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {MOCK_HOT.map((n, i) => (
                  <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div className="number-badge" style={{ background: colorHex(getColor(n)), border: `1px solid rgba(255,255,255,0.15)` }}>
                      <span style={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>{n}</span>
                    </div>
                    <div style={{ height: '3px', width: 28, background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${100 - i * 18}%`, background: GOLD, borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
                <p style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', marginLeft: '4px' }}>últimas 50 rondas</p>
              </div>
            )}
            {activeTab === 'cold' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {MOCK_COLD.map((n, i) => (
                  <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div className="number-badge" style={{ background: colorHex(getColor(n)), border: `1px solid rgba(255,255,255,0.1)`, opacity: 0.7 }}>
                      <span style={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>{n}</span>
                    </div>
                    <div style={{ height: '3px', width: 28, background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${20 + i * 10}%`, background: '#4B9CD3', borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
                <p style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', marginLeft: '4px' }}>sin salir hace más tiempo</p>
              </div>
            )}
            {activeTab === 'history' && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {history.slice(0, 20).map((n, i) => (
                  <div key={i} className="number-badge" style={{ background: colorHex(getColor(n)), border: '1px solid rgba(255,255,255,0.1)', opacity: 1 - i * 0.03 }}>
                    <span style={{ color: '#fff', fontSize: '0.55rem', fontWeight: 700 }}>{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── MESA DE APUESTAS ── */}
        <div style={{ margin: '0 16px 16px', overflowX: 'auto' }}>
          <div style={{ background: `radial-gradient(ellipse at center, #0d4a2a 0%, ${GREEN_FELT} 60%, #051d11 100%)`, border: '1px solid rgba(212,175,55,0.2)', borderRadius: '6px', padding: '12px', minWidth: '320px' }}>

            <div style={{ display: 'flex', gap: '4px' }}>
              {/* Cero */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div
                  className="bet-cell"
                  onClick={() => addBet('number', '0')}
                  style={{
                    width: 32,
                    height: 90,
                    background: getBetOnSpot('number:0') > 0 ? 'rgba(15,92,30,0.8)' : 'rgba(15,92,30,0.4)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    borderRadius: '4px 0 0 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '1rem' }}>0</span>
                  {getBetOnSpot('number:0') > 0 && <ChipMarker amount={getBetOnSpot('number:0')} />}
                </div>
              </div>

              {/* Grid de números */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', flex: 1, gap: '2px' }}>
                {TABLE_COLS.flatMap(col => col).map(num => {
                  const c = getColor(num)
                  const betAmt = getBetOnSpot(`number:${num}`)
                  return (
                    <div
                      key={num}
                      className="bet-cell"
                      onClick={() => addBet('number', String(num))}
                      style={{
                        background: betAmt > 0
                          ? c === 'red' ? 'rgba(180,0,0,0.7)' : 'rgba(30,30,30,0.9)'
                          : c === 'red' ? 'rgba(120,0,0,0.5)' : 'rgba(15,15,15,0.5)',
                        border: `1px solid ${betAmt > 0 ? GOLD : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '2px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '28px',
                        padding: '2px',
                        position: 'relative',
                      }}
                    >
                      <span style={{ color: c === 'red' ? '#fca5a5' : 'rgba(255,255,255,0.8)', fontSize: '0.55rem', fontWeight: 600, lineHeight: 1 }}>{num}</span>
                      {betAmt > 0 && <ChipMarker amount={betAmt} small />}
                    </div>
                  )
                })}
              </div>

              {/* 2 to 1 columnas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {['3', '2', '1'].map(col => (
                  <div
                    key={col}
                    className="bet-cell"
                    onClick={() => addBet('column', col)}
                    style={{
                      width: 28,
                      flex: 1,
                      background: getBetOnSpot(`column:${col}`) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)',
                      border: `1px solid ${getBetOnSpot(`column:${col}`) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`,
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.35rem', letterSpacing: '0.05em', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>2:1</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Docenas */}
            <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 28px', gap: '2px', marginTop: '4px' }}>
              <div />
              {[{ v: '1', l: '1ª DOCENA' }, { v: '2', l: '2ª DOCENA' }, { v: '3', l: '3ª DOCENA' }].map(d => (
                <div
                  key={d.v}
                  className="bet-cell"
                  onClick={() => addBet('dozen', d.v)}
                  style={{
                    height: 24,
                    background: getBetOnSpot(`dozen:${d.v}`) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)',
                    border: `1px solid ${getBetOnSpot(`dozen:${d.v}`) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`,
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.38rem', letterSpacing: '0.1em', fontWeight: 600 }}>{d.l}</span>
                </div>
              ))}
              <div />
            </div>

            {/* Mitades / Pares / Colores */}
            <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 1fr 1fr 1fr 28px', gap: '2px', marginTop: '2px' }}>
              <div />
              {[
                { type: 'half' as const, val: 'low', label: '1-18' },
                { type: 'parity' as const, val: 'even', label: 'PAR' },
              ].map(b => (
                <div key={b.val} className="bet-cell" onClick={() => addBet(b.type, b.val)}
                  style={{ height: 24, background: getBetOnSpot(`${b.type}:${b.val}`) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)', border: `1px solid ${getBetOnSpot(`${b.type}:${b.val}`) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.38rem', letterSpacing: '0.1em', fontWeight: 600 }}>{b.label}</span>
                </div>
              ))}
              <div className="bet-cell" onClick={() => addBet('color', 'red')}
                style={{ height: 24, background: getBetOnSpot('color:red') > 0 ? 'rgba(180,0,0,0.6)' : 'rgba(120,0,0,0.4)', border: `1px solid ${getBetOnSpot('color:red') > 0 ? GOLD : 'rgba(255,255,255,0.1)'}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fca5a5', fontSize: '0.55rem' }}>●</span>
              </div>
              <div className="bet-cell" onClick={() => addBet('color', 'black')}
                style={{ height: 24, background: getBetOnSpot('color:black') > 0 ? 'rgba(50,50,50,0.8)' : 'rgba(20,20,20,0.6)', border: `1px solid ${getBetOnSpot('color:black') > 0 ? GOLD : 'rgba(255,255,255,0.1)'}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.55rem' }}>●</span>
              </div>
              {[
                { type: 'parity' as const, val: 'odd', label: 'IMPAR' },
                { type: 'half' as const, val: 'high', label: '19-36' },
              ].map(b => (
                <div key={b.val} className="bet-cell" onClick={() => addBet(b.type, b.val)}
                  style={{ height: 24, background: getBetOnSpot(`${b.type}:${b.val}`) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)', border: `1px solid ${getBetOnSpot(`${b.type}:${b.val}`) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.38rem', letterSpacing: '0.1em', fontWeight: 600 }}>{b.label}</span>
                </div>
              ))}
              <div />
            </div>

          </div>
        </div>

        {/* ── CHIPS ── */}
        <div style={{ padding: '0 16px 12px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', paddingBottom: '8px', paddingTop: '4px' }}>
            {CHIPS.map(chip => (
              <button
                key={chip.value}
                className={`chip-btn${selectedChip.value === chip.value ? ' active' : ''}`}
                onClick={() => setSelectedChip(chip)}
                style={{
                  width: 44, height: 44,
                  borderRadius: '50%',
                  background: chip.bg,
                  border: `3px dashed ${chip.border}`,
                  color: chip.color,
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  fontSize: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  outline: selectedChip.value === chip.value ? `2px solid ${GOLD}` : 'none',
                  outlineOffset: '2px',
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── ACCIONES + JUGAR ── */}
        <div style={{ padding: '0 16px 16px' }}>
          {error && <p style={{ textAlign: 'center', color: '#f87171', fontSize: '0.55rem', letterSpacing: '0.1em', marginBottom: '10px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', flex: 1 }}>
              {[
                { label: 'BORRAR', action: removeLast },
                { label: 'LIMPIAR', action: clearBets },
                { label: 'REPETIR', action: repeatBets },
                { label: 'DOBLAR', action: doubleBets },
              ].map(btn => (
                <button
                  key={btn.label}
                  className="action-btn"
                  onClick={btn.action}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '3px',
                    padding: '10px 4px',
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 700,
                    fontSize: '0.45rem',
                    letterSpacing: '0.2em',
                    cursor: 'pointer',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <button
              className="spin-btn"
              onClick={spin}
              disabled={spinning || bets.length === 0}
              style={{
                flex: '0 0 100px',
                border: 'none',
                borderRadius: '4px',
                color: '#1a0e00',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 900,
                fontSize: '0.75rem',
                letterSpacing: '0.2em',
                boxShadow: bets.length > 0 ? '0 0 30px rgba(212,175,55,0.35)' : 'none',
              }}
            >
              {spinning ? '...' : 'JUGAR'}
            </button>
          </div>
        </div>

        {/* ── OVERLAY RESULTADO ── */}
        {showResult && totalPayout !== null && (
          <div
            onClick={() => setShowResult(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 200, cursor: 'pointer' }}
          >
            <div className="result-overlay" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.45rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.35)', marginBottom: '16px', textTransform: 'uppercase' }}>Resultado</p>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: colorHex(resultColor!), border: `2px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.5rem', color: '#fff', fontWeight: 700 }}>{resultNumber}</span>
              </div>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.8rem', color: totalWon ? GOLD : '#f87171', fontWeight: 700, marginBottom: '6px' }}>
                {totalWon ? `+${totalPayout.toLocaleString('es-UY')}` : `-${bets.reduce((s,b)=>s+b.amount,0).toLocaleString('es-UY')}`}
              </p>
              <p style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', marginBottom: '32px' }}>NECTAR</p>
              <p style={{ fontSize: '0.45rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.15)' }}>Toca para continuar</p>
            </div>
          </div>
        )}

      </main>
    </>
  )
}

// Mini chip marker para mostrar sobre celdas apostadas
function ChipMarker({ amount, small = false }: { amount: number; small?: boolean }) {
  const size = small ? 14 : 18
  const chip = CHIPS.slice().reverse().find(c => amount >= c.value) ?? CHIPS[0]
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: chip.bg,
      border: `1.5px solid ${chip.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'absolute',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 5,
      boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
    }}>
      <span style={{ fontSize: small ? '0.3rem' : '0.35rem', fontWeight: 800, color: chip.color, lineHeight: 1 }}>
        {amount >= 1000 ? `${Math.floor(amount/1000)}K` : amount}
      </span>
    </div>
  )
}
