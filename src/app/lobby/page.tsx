'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const GOLD = '#D4AF37'
const GOLD_LIGHT = '#F0D060'
const DARK = '#0A0A0A'

const LIVE_WINNERS = [
  'User_8291 ganó 12.400 CHIPS en Slots',
  'VIP_Marco ganó 45.000 CHIPS en Ruleta',
  'Player_X ganó 8.750 CHIPS en Blackjack',
  'Elite_77 ganó 31.200 CHIPS en Dice',
  'VIP_Rosa ganó 19.500 CHIPS en Slots',
]

const GAMES = [
  {
    id: 'roulette',
    label: 'ROULETTE',
    sub: 'THE CLASSICS',
    tag: null,
    size: 'large',
    gradient: 'linear-gradient(160deg, #1a0a00 0%, #2d1200 40%, #0a0a0a 100%)',
    accent: '#8B2000',
    emoji: '🎡',
  },
  {
    id: 'blackjack',
    label: 'BLACKJACK',
    sub: null,
    tag: 'PRIVATE TABLE',
    size: 'small',
    gradient: 'linear-gradient(160deg, #001a0a 0%, #002d14 40%, #0a0a0a 100%)',
    accent: '#006B2B',
    emoji: '🃏',
  },
  {
    id: 'slots',
    label: 'SLOTS',
    sub: null,
    tag: 'HIGH VOLATILITY',
    size: 'small',
    gradient: 'linear-gradient(160deg, #0a001a 0%, #14002d 40%, #0a0a0a 100%)',
    accent: '#4B0082',
    emoji: '🎰',
  },
  {
    id: 'dice',
    label: 'DICE',
    sub: 'Provably fair high-limit rolling.',
    tag: null,
    size: 'large',
    gradient: 'linear-gradient(160deg, #0a0800 0%, #1a1400 40%, #0a0a0a 100%)',
    accent: '#6B5500',
    emoji: '🎲',
  },
]

const NAV_ITEMS = [
  { id: 'lobby', label: 'LOBBY', icon: '⬡' },
  { id: 'tables', label: 'TABLES', icon: '♠' },
  { id: 'slots', label: 'SLOTS', icon: '⊞' },
  { id: 'rewards', label: 'REWARDS', icon: '♛' },
  { id: 'concierge', label: 'CONCIERGE', icon: '◎' },
]

export default function LobbyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const { balance, formatChips } = useWallet()
  const [username, setUsername] = useState<string>('MEMBER')
  const [activeNav, setActiveNav] = useState('lobby')
  const tickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/'); return }
      setUsername(session.user.user_metadata?.display_name?.toUpperCase() ?? 'MEMBER')
      setLoading(false)
    }
    checkSession()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading) return (
    <main style={{ minHeight: '100dvh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(212,175,55,0.3)', fontFamily: 'serif', letterSpacing: '0.5em', fontSize: '0.65rem' }}>LOADING...</p>
    </main>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Montserrat:wght@200;300;400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DARK}; overflow-x: hidden; }

        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGold {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .fade-up { animation: fadeUp 0.6s ease both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.2s; }
        .fade-up-3 { animation-delay: 0.3s; }
        .fade-up-4 { animation-delay: 0.4s; }
        .fade-up-5 { animation-delay: 0.5s; }

        .game-card { transition: transform 0.3s ease, box-shadow 0.3s ease; cursor: pointer; }
        .game-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(212,175,55,0.15); }
        .game-card:active { transform: scale(0.98); }

        .nav-item { transition: color 0.2s ease; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 0; }
        .nav-item:hover { color: ${GOLD} !important; }

        .play-btn { transition: background 0.25s ease, transform 0.2s ease; }
        .play-btn:hover { background: rgba(212,175,55,0.25) !important; transform: scale(1.05); }

        .tier-bar-fill {
          background: linear-gradient(90deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%);
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }

        .live-dot {
          animation: pulseGold 1.5s ease infinite;
        }

        .deposit-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .deposit-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 8px 24px rgba(212,175,55,0.4);
        }
      `}</style>

      <main style={{ minHeight: '100dvh', background: DARK, fontFamily: "'Montserrat', sans-serif", paddingBottom: '80px', maxWidth: '480px', margin: '0 auto', position: 'relative' }}>

        {/* ── HEADER ── */}
        <div className="fade-up fade-up-1" style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/logo-dorado.jpg"
              alt="HWA Casino"
              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${GOLD}` }}
            />
            <div>
              <p style={{ fontSize: '0.5rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', fontWeight: 300, textTransform: 'uppercase' }}>VIP MEMBER PROFILE</p>
              <p style={{ fontSize: '1rem', letterSpacing: '0.15em', color: '#fff', fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{username}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.45rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontWeight: 300, textTransform: 'uppercase', marginBottom: '2px' }}>TOTAL BALANCE</p>
            {/* FIX: usar formatChips en lugar de $balance.toLocaleString() */}
            <p style={{ fontSize: '1.1rem', letterSpacing: '0.05em', color: GOLD, fontWeight: 700 }}>
              {formatChips(balance)}
            </p>
          </div>
        </div>

        {/* ── HERO ── */}
        <div className="fade-up fade-up-2" style={{ padding: '32px 20px 24px' }}>
          <p style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: GOLD, fontWeight: 400, textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '16px', height: '1px', background: GOLD }} />
            EXCLUSIVE ACCESS
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '3.2rem', lineHeight: 0.95, color: '#fff', fontWeight: 300, marginBottom: '24px' }}>
            HWA <span style={{ color: GOLD, fontStyle: 'italic', fontWeight: 700 }}>CASINO</span><br />EXPERIENCE
          </h1>
          <button
            onClick={() => setActiveNav('tables')}
            className="play-btn"
            style={{ background: GOLD, border: 'none', borderRadius: '2px', padding: '14px 28px', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.3em', color: '#000', textTransform: 'uppercase', cursor: 'pointer' }}>
            ENTER PRIVATE SUITE
          </button>
        </div>

        {/* ── LIVE WINNERS TICKER ── */}
        <div className="fade-up fade-up-3" style={{ background: '#0d0d0d', borderTop: '1px solid rgba(212,175,55,0.1)', borderBottom: '1px solid rgba(212,175,55,0.1)', padding: '10px 0', overflow: 'hidden', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ flexShrink: 0, padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px', borderRight: '1px solid rgba(212,175,55,0.2)' }}>
              <span className="live-dot" style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: GOLD }} />
              <span style={{ fontSize: '0.45rem', letterSpacing: '0.25em', color: GOLD, fontWeight: 600 }}>LIVE WINNERS</span>
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div ref={tickerRef} style={{ display: 'flex', animation: 'ticker 18s linear infinite', whiteSpace: 'nowrap' }}>
                {[...LIVE_WINNERS, ...LIVE_WINNERS].map((w, i) => (
                  <span key={i} style={{ fontSize: '0.55rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', padding: '0 28px', flexShrink: 0 }}>
                    {w} <span style={{ color: GOLD, margin: '0 8px' }}>·</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── GAMES GRID ── */}
        <div className="fade-up fade-up-3" style={{ padding: '0 20px', marginBottom: '32px' }}>

          {/* Roulette — large */}
          <div className="game-card" onClick={() => router.push('/roulette')} style={{ background: GAMES[0].gradient, border: '1px solid rgba(212,175,55,0.1)', borderRadius: '4px', padding: '28px 20px 20px', marginBottom: '12px', position: 'relative', overflow: 'hidden', minHeight: '160px' }}>
            <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '7rem', opacity: 0.06, transform: 'rotate(-15deg)' }}>🎡</div>
            <p style={{ fontSize: '0.45rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '6px' }}>{GAMES[0].sub}</p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', color: '#fff', fontWeight: 300, letterSpacing: '0.1em', marginBottom: '20px' }}>{GAMES[0].label}</h2>
            <button className="play-btn" onClick={(e) => { e.stopPropagation(); router.push('/roulette') }} style={{ background: 'rgba(212,175,55,0.12)', border: `1px solid rgba(212,175,55,0.3)`, borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'absolute', bottom: '20px', right: '20px' }}>
              <span style={{ color: GOLD, fontSize: '0.9rem', marginLeft: '2px' }}>▶</span>
            </button>
          </div>

          {/* Blackjack + Slots — small grid */}
          {/* FIX: onClick en cada card */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {GAMES.slice(1, 3).map(game => (
              <div
                key={game.id}
                className="game-card"
                onClick={() => router.push(`/${game.id}`)}
                style={{ background: game.gradient, border: '1px solid rgba(212,175,55,0.1)', borderRadius: '4px', padding: '20px 14px 14px', position: 'relative', overflow: 'hidden', minHeight: '130px' }}
              >
                <div style={{ position: 'absolute', right: '-10px', top: '-10px', fontSize: '4.5rem', opacity: 0.07, transform: 'rotate(-10deg)' }}>{game.emoji}</div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', color: '#fff', fontWeight: 400, letterSpacing: '0.05em', marginBottom: '4px' }}>{game.label}</h2>
                {game.tag && <p style={{ fontSize: '0.42rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>{game.tag}</p>}
              </div>
            ))}
          </div>

          {/* Dice — large */}
          <div className="game-card" style={{ background: GAMES[3].gradient, border: '1px solid rgba(212,175,55,0.1)', borderRadius: '4px', padding: '24px 20px', position: 'relative', overflow: 'hidden', minHeight: '130px' }}>
            <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '6rem', opacity: 0.08, transform: 'rotate(15deg)' }}>🎲</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.8rem', color: '#fff', fontWeight: 300, letterSpacing: '0.1em', marginBottom: '6px' }}>{GAMES[3].label}</h2>
            <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', maxWidth: '55%', lineHeight: 1.6 }}>{GAMES[3].sub}</p>
            <button className="play-btn" style={{ background: 'rgba(212,175,55,0.12)', border: `1px solid rgba(212,175,55,0.25)`, borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'absolute', bottom: '20px', right: '20px' }}>
              <span style={{ color: GOLD, fontSize: '1rem' }}>⊞</span>
            </button>
          </div>
        </div>

        {/* ── CONCIERGE SERVICES ── */}
        <div className="fade-up fade-up-4" style={{ padding: '0 20px', marginBottom: '32px' }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', color: '#fff', fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>Concierge Services</h3>

          {[
            { icon: '◎', title: 'Personal Host', desc: 'Available for instant withdrawal assistance.', action: 'CHAT', color: GOLD },
            { icon: '♛', title: 'Loyalty Rewards', desc: 'Claim your weekly cashback bonus.', action: 'CLAIM', color: '#fff' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.9rem', color: GOLD }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#fff', letterSpacing: '0.05em', marginBottom: '3px' }}>{item.title}</p>
                <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
              <button style={{ background: 'transparent', border: 'none', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.6rem', letterSpacing: '0.25em', color: item.color, cursor: 'pointer' }}>{item.action}</button>
            </div>
          ))}
        </div>

        {/* ── LOGOUT ── */}
        <div style={{ textAlign: 'center', padding: '0 20px 16px' }}>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', fontFamily: "'Montserrat', sans-serif", fontWeight: 300, fontSize: '0.5rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.15)', cursor: 'pointer', textTransform: 'uppercase' }}>
            CERRAR SESIÓN
          </button>
        </div>

        {/* ── DEPOSIT FAB ── */}
        <button className="deposit-btn" style={{ position: 'fixed', bottom: '72px', right: '20px', width: '48px', height: '48px', borderRadius: '50%', background: GOLD, border: 'none', fontSize: '1.4rem', color: '#000', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 20px rgba(212,175,55,0.4)', zIndex: 50 }}>
          +
        </button>

        {/* ── BOTTOM NAV ── */}
        <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#0d0d0d', borderTop: '1px solid rgba(212,175,55,0.12)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', zIndex: 100 }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className="nav-item"
              onClick={() => setActiveNav(item.id)}
              style={{ background: 'transparent', border: 'none', color: activeNav === item.id ? GOLD : 'rgba(255,255,255,0.25)', fontFamily: "'Montserrat', sans-serif" }}>
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              <span style={{ fontSize: '0.38rem', letterSpacing: '0.15em', fontWeight: activeNav === item.id ? 600 : 300 }}>{item.label}</span>
            </button>
          ))}
        </nav>

      </main>
    </>
  )
}
