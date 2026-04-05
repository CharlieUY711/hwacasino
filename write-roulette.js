const fs = require('fs');

const content = `'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useWallet } from '@/hooks/useWallet'

const GOLD = '#D4AF37'
const DARK = '#0A0A0A'
const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]

function getColor(n) {
  if (n === 0) return 'green'
  return RED_NUMBERS.includes(n) ? 'red' : 'black'
}

const CHIP_VALUES = [100, 500, 1000, 5000]

export default function RoulettePage() {
  const router = useRouter()
  const { balance, formatChips } = useWallet()
  const [userId, setUserId] = useState(null)
  const [selectedChip, setSelectedChip] = useState(100)
  const [betType, setBetType] = useState('color')
  const [betValue, setBetValue] = useState('red')
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [resultColor, setResultColor] = useState(null)
  const [payout, setPayout] = useState(null)
  const [won, setWon] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)
  const wheelRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/'); return }
      setUserId(user.id)
    })
  }, [router])

  async function spin() {
    if (!userId || spinning) return
    setSpinning(true)
    setError(null)
    setResult(null)
    setPayout(null)
    setWon(null)

    if (wheelRef.current) {
      wheelRef.current.style.transition = 'transform 3.5s cubic-bezier(0.17,0.67,0.12,0.99)'
      const spins = 1440 + Math.floor(Math.random() * 360)
      wheelRef.current.style.transform = \`rotate(\${spins}deg)\`
    }

    const res = await fetch('/api/play/roulette', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        bet_type: betType,
        bet_value: betValue,
        amount: selectedChip,
      }),
    })

    const data = await res.json()

    setTimeout(() => {
      setSpinning(false)
      if (data.error) {
        setError(data.error === 'insufficient_balance' ? 'Saldo insuficiente' : 'Error al procesar apuesta')
        if (wheelRef.current) wheelRef.current.style.transform = 'rotate(0deg)'
        return
      }
      setResult(data.result)
      setResultColor(data.color)
      setPayout(data.payout)
      setWon(data.won)
      setHistory(prev => [{ n: data.result, c: data.color }, ...prev].slice(0, 12))
    }, 3600)
  }

  function resetWheel() {
    if (wheelRef.current) {
      wheelRef.current.style.transition = 'none'
      wheelRef.current.style.transform = 'rotate(0deg)'
    }
    setResult(null)
    setPayout(null)
    setWon(null)
  }

  return (
    <>
      <style>{\`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Montserrat:wght@200;300;400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: \${DARK}; overflow-x: hidden; }
        .chip { transition: transform 0.15s ease, box-shadow 0.15s ease; cursor: pointer; }
        .chip:hover { transform: scale(1.08); }
        .bet-btn { transition: all 0.2s ease; cursor: pointer; }
        .bet-btn:hover { opacity: 0.85; transform: scale(1.03); }
        .spin-btn { transition: all 0.2s ease; cursor: pointer; }
        .spin-btn:hover:not(:disabled) { transform: scale(1.03); box-shadow: 0 8px 32px rgba(212,175,55,0.4); }
        .spin-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      \`}</style>

      <main style={{ minHeight: '100dvh', background: DARK, fontFamily: "'Montserrat', sans-serif", maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>

        {/* HEADER */}
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
          <button onClick={() => router.push('/lobby')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.6rem', letterSpacing: '0.25em', fontFamily: "'Montserrat', sans-serif" }}>← LOBBY</button>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', color: GOLD, fontStyle: 'italic', letterSpacing: '0.1em' }}>Roulette</p>
          <p style={{ fontSize: '0.65rem', color: GOLD, fontWeight: 700, letterSpacing: '0.05em' }}>{formatChips(balance)}</p>
        </div>

        {/* RUEDA */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px 24px' }}>
          <div style={{ position: 'relative', width: 200, height: 200, marginBottom: '24px' }}>
            <div ref={wheelRef} style={{ width: 200, height: 200, borderRadius: '50%', background: 'conic-gradient(#1a6b1a 0deg 9.73deg, #1a1a1a 9.73deg 19.46deg, #8B0000 19.46deg 29.19deg, #1a1a1a 29.19deg 38.92deg, #8B0000 38.92deg 48.65deg, #1a1a1a 48.65deg 58.38deg, #8B0000 58.38deg 68.11deg, #1a1a1a 68.11deg 77.84deg, #8B0000 77.84deg 87.57deg, #1a1a1a 87.57deg 97.3deg, #8B0000 97.3deg 107.03deg, #1a1a1a 107.03deg 116.76deg, #8B0000 116.76deg 126.49deg, #1a1a1a 126.49deg 136.22deg, #8B0000 136.22deg 145.95deg, #1a1a1a 145.95deg 155.68deg, #8B0000 155.68deg 165.41deg, #1a1a1a 165.41deg 175.14deg, #8B0000 175.14deg 184.87deg, #1a1a1a 184.87deg 194.6deg, #8B0000 194.6deg 204.33deg, #1a1a1a 204.33deg 214.06deg, #8B0000 214.06deg 223.79deg, #1a1a1a 223.79deg 233.52deg, #8B0000 233.52deg 243.25deg, #1a1a1a 243.25deg 252.98deg, #8B0000 252.98deg 262.71deg, #1a1a1a 262.71deg 272.44deg, #8B0000 272.44deg 282.17deg, #1a1a1a 282.17deg 291.9deg, #8B0000 291.9deg 301.63deg, #1a1a1a 301.63deg 311.36deg, #8B0000 311.36deg 321.09deg, #1a1a1a 321.09deg 330.82deg, #8B0000 330.82deg 340.55deg, #1a1a1a 340.55deg 350.27deg, #8B0000 350.27deg 360deg)', border: \`3px solid \${GOLD}\`, boxShadow: '0 0 30px rgba(212,175,55,0.2)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 60, height: 60, borderRadius: '50%', background: '#0a0a0a', border: \`2px solid \${GOLD}\`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {result !== null
                ? <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', color: resultColor === 'green' ? '#1a6b1a' : resultColor === 'red' ? '#cc0000' : '#fff', fontWeight: 700 }}>{result}</span>
                : <span style={{ fontSize: '1.2rem' }}>🎡</span>
              }
            </div>
            <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: \`16px solid \${GOLD}\` }} />
          </div>

          {/* Historial */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '8px', minHeight: '24px' }}>
            {history.map((h, i) => (
              <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: h.c === 'green' ? '#1a6b1a' : h.c === 'red' ? '#8B0000' : '#222', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', color: '#fff', fontWeight: 600 }}>{h.n}</div>
            ))}
          </div>
        </div>

        {/* CHIPS */}
        <div style={{ padding: '0 20px 20px' }}>
          <p style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', textTransform: 'uppercase' }}>Apuesta</p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {CHIP_VALUES.map(v => (
              <button key={v} className="chip" onClick={() => setSelectedChip(v)} style={{ flex: 1, padding: '10px 0', borderRadius: '4px', border: \`1.5px solid \${selectedChip === v ? GOLD : 'rgba(255,255,255,0.1)'}\`, background: selectedChip === v ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)', color: selectedChip === v ? GOLD : 'rgba(255,255,255,0.4)', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.6rem', letterSpacing: '0.1em', cursor: 'pointer' }}>
                {v >= 1000 ? \`\${v/1000}K\` : v}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', textTransform: 'uppercase' }}>Tipo de apuesta</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            {[{v:'red',label:'ROJO',bg:'#8B0000'},{v:'black',label:'NEGRO',bg:'#222'}].map(opt => (
              <button key={opt.v} className="bet-btn" onClick={() => { setBetType('color'); setBetValue(opt.v) }} style={{ padding: '12px', borderRadius: '4px', border: \`1.5px solid \${betType === 'color' && betValue === opt.v ? GOLD : 'rgba(255,255,255,0.1)'}\`, background: betType === 'color' && betValue === opt.v ? opt.bg : 'rgba(255,255,255,0.03)', color: betType === 'color' && betValue === opt.v ? '#fff' : 'rgba(255,255,255,0.35)', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.6rem', letterSpacing: '0.2em' }}>
                {opt.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            {[{t:'parity',v:'even',l:'PAR'},{t:'parity',v:'odd',l:'IMPAR'},{t:'half',v:'low',l:'1-18'},{t:'half',v:'high',l:'19-36'}].map(opt => (
              <button key={opt.v} className="bet-btn" onClick={() => { setBetType(opt.t); setBetValue(opt.v) }} style={{ padding: '10px 4px', borderRadius: '4px', border: \`1.5px solid \${betType === opt.t && betValue === opt.v ? GOLD : 'rgba(255,255,255,0.1)'}\`, background: betType === opt.t && betValue === opt.v ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)', color: betType === opt.t && betValue === opt.v ? GOLD : 'rgba(255,255,255,0.35)', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.5rem', letterSpacing: '0.1em' }}>
                {opt.l}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
            {[{v:'1',l:'1a DOC'},{v:'2',l:'2a DOC'},{v:'3',l:'3a DOC'}].map(opt => (
              <button key={opt.v} className="bet-btn" onClick={() => { setBetType('dozen'); setBetValue(opt.v) }} style={{ padding: '10px 4px', borderRadius: '4px', border: \`1.5px solid \${betType === 'dozen' && betValue === opt.v ? GOLD : 'rgba(255,255,255,0.1)'}\`, background: betType === 'dozen' && betValue === opt.v ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)', color: betType === 'dozen' && betValue === opt.v ? GOLD : 'rgba(255,255,255,0.35)', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.5rem', letterSpacing: '0.1em' }}>
                {opt.l}
              </button>
            ))}
          </div>

          <button className="spin-btn" onClick={spin} disabled={spinning} style={{ width: '100%', padding: '16px', background: spinning ? 'rgba(212,175,55,0.2)' : GOLD, border: 'none', borderRadius: '4px', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.3em', color: spinning ? GOLD : '#000', cursor: spinning ? 'not-allowed' : 'pointer' }}>
            {spinning ? 'GIRANDO...' : \`GIRAR — \${selectedChip.toLocaleString('es-UY')} CHIPS\`}
          </button>

          {error && <p style={{ textAlign: 'center', color: '#cc4444', fontSize: '0.6rem', letterSpacing: '0.1em', marginTop: '12px' }}>{error}</p>}
        </div>

        {won !== null && (
          <div onClick={resetWheel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 200, cursor: 'pointer' }}>
            <p style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', textTransform: 'uppercase' }}>Resultado</p>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: resultColor === 'green' ? '#1a6b1a' : resultColor === 'red' ? '#8B0000' : '#222', border: \`2px solid \${GOLD}\`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.5rem', color: '#fff', fontWeight: 700 }}>{result}</span>
            </div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.5rem', color: won ? GOLD : '#cc4444', fontWeight: 700, marginBottom: '8px' }}>
              {won ? \`+\${payout?.toLocaleString('es-UY')}\` : \`-\${selectedChip.toLocaleString('es-UY')}\`}
            </p>
            <p style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: '32px' }}>CHIPS</p>
            <p style={{ fontSize: '0.5rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)' }}>Toca para continuar</p>
          </div>
        )}

      </main>
    </>
  )
}
`;

fs.writeFileSync('src/app/roulette/page.tsx', content, 'utf8');
console.log('✅ roulette/page.tsx creado correctamente');
