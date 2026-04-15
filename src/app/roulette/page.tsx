'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useWallet } from '@/hooks/useWallet'

const GOLD = '#D4AF37'
const DARK = '#0A0A0A'

const TABLES = [
  {
    id: 'vip-1',
    name: 'Sal\u00f3n Dorado',
    sub: 'Mesa Principal \u2014 Ruleta Europea',
    tag: 'LIVE',
    tagColor: GOLD,
    minBet: 100,
    maxBet: 15000,
    players: 142,
    gradient: 'linear-gradient(160deg, #1a0800 0%, #0a0a0a 100%)',
    vip: false,
  },
  {
    id: 'vip-2',
    name: 'Sal\u00f3n Esmeralda',
    sub: 'Mesa VIP \u2014 Ruleta Europea',
    tag: 'VIP',
    tagColor: '#50C878',
    minBet: 500,
    maxBet: 50000,
    players: 38,
    gradient: 'linear-gradient(160deg, #001a0a 0%, #0a0a0a 100%)',
    vip: true,
  },
  {
    id: 'vip-3',
    name: 'Sal\u00f3n Negro',
    sub: 'Mesa Exclusiva \u2014 Ruleta Europea',
    tag: 'PRIVADO',
    tagColor: 'rgba(255,255,255,0.4)',
    minBet: 1000,
    maxBet: 100000,
    players: 12,
    gradient: 'linear-gradient(160deg, #0d0d0d 0%, #050505 100%)',
    vip: true,
  },
]

const HOT_NUMBERS = [32, 17, 2, 21, 0]
const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]

function getColor(n: number) {
  if (n === 0) return '#1a6b1a'
  return RED_NUMBERS.includes(n) ? '#8B0000' : '#222'
}

export default function RouletteLobbyPage() {
  const router = useRouter()
  const { balance, formatChips } = useWallet()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/'); return }
      setLoading(false)
    })
  }, [router])

  if (loading) return (
    <main style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
      <p style={{ color: 'rgba(212,175,55,0.3)', fontFamily: 'serif', letterSpacing: '0.5em', fontSize: '0.65rem' }}>LOADING...</p>
    </main>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Montserrat:wght@200;300;400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DARK}; overflow-x: hidden; }
        .table-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .table-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(212,175,55,0.12); }
        .join-btn { transition: all 0.2s ease; cursor: pointer; }
        .join-btn:hover { opacity: 0.88; transform: scale(1.02); }
      `}</style>

      <main style={{ minHeight: '100vh', background: DARK, fontFamily: "'Inter', sans-serif", maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>

        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
          <button onPointerDown={() => router.push('/lobby')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.6rem', letterSpacing: '0.25em', fontFamily: "'Inter', sans-serif" }}>{'\u2190'} LOBBY</button>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.2rem', color: GOLD, fontStyle: 'normal', letterSpacing: '0.1em' }}>Roulette</p>
          <p style={{ fontSize: '0.65rem', color: GOLD, fontWeight: 700 }}>{formatChips(balance)}</p>
        </div>

        <div style={{ position: 'relative', margin: '20px', borderRadius: '8px', padding: '32px 24px', background: 'linear-gradient(160deg, #1a0800 0%, #0a0a0a 100%)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '8rem', opacity: 0.05 }}>{'\uD83C\uDF9A'}</div>
          <div style={{ display: 'inline-block', padding: '4px 12px', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '2px', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.45rem', letterSpacing: '0.3em', color: GOLD, textTransform: 'uppercase' }}>Private Lounge Access</span>
          </div>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '3rem', color: GOLD, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>ROULETTE</h1>
          <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', lineHeight: 1.7 }}>
            Tres salas exclusivas. Una sola rueda por ronda. Todos los jugadores comparten el mismo resultado.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '0 20px', marginBottom: '24px' }}>
          <div style={{ background: '#111', border: '1px solid rgba(212,175,55,0.1)', borderRadius: '6px', padding: '16px' }}>
            <p style={{ fontSize: '0.45rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '10px' }}>Hot Numbers</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {HOT_NUMBERS.map(n => (
                <div key={n} style={{ width: 26, height: 26, borderRadius: '4px', background: getColor(n), border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', fontSize: '0.6rem', color: '#fff', fontWeight: 700 }}>{n}</div>
              ))}
            </div>
          </div>
          <div style={{ background: '#111', border: '1px solid rgba(212,175,55,0.1)', borderRadius: '6px', padding: '16px' }}>
            <p style={{ fontSize: '0.45rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '6px' }}>Salas Activas</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '2rem', color: '#fff', fontWeight: 300 }}>3 <span style={{ fontSize: '0.5rem', color: GOLD, letterSpacing: '0.2em' }}>LIVE</span></p>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          <p style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '16px' }}>Seleccion\u00e1 tu sala</p>
          {TABLES.map(table => (
            <div key={table.id} className="table-card" style={{ background: table.gradient, border: `1px solid ${table.vip ? 'rgba(212,175,55,0.25)' : 'rgba(212,175,55,0.08)'}`, borderRadius: '6px', marginBottom: '14px' }}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'inline-block', padding: '3px 10px', border: `1px solid ${table.tagColor}40`, borderRadius: '2px', marginBottom: '12px', background: `${table.tagColor}15` }}>
                  <span style={{ fontSize: '0.42rem', letterSpacing: '0.25em', color: table.tagColor, fontWeight: 700 }}>{table.tag}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.5rem', color: table.vip ? GOLD : '#fff', fontWeight: table.vip ? 600 : 300, marginBottom: '4px' }}>{table.name}</h2>
                    <p style={{ fontSize: '0.45rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{table.sub}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.45rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)', marginBottom: '4px' }}>JUGADORES</p>
                    <p style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{table.players}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                  <div>
                    <p style={{ fontSize: '0.42rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)', marginBottom: '4px' }}>MIN / MAX</p>
                    <p style={{ fontSize: '0.7rem', color: GOLD, fontWeight: 700 }}>{table.minBet.toLocaleString('es-UY')} \u2014 {table.maxBet.toLocaleString('es-UY')} NECTAR</p>
                  </div>
                  <button className="join-btn"
                    onPointerDown={() => router.push(`/roulette/play?room=${table.id}`)}
                    style={{ background: table.vip ? GOLD : 'rgba(212,175,55,0.12)', border: `1px solid ${table.vip ? GOLD : 'rgba(212,175,55,0.3)'}`, borderRadius: '3px', padding: '10px 20px', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.55rem', letterSpacing: '0.25em', color: table.vip ? '#000' : GOLD, textTransform: 'uppercase', cursor: 'pointer' }}>
                    JUGAR
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </>
  )
}






