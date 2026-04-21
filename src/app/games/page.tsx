'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { GameHeader } from '@/components/GameHeader'
import { useWallet } from '@/hooks/useWallet'

const GOLD = '#D4AF37'

const GAMES = [
  {
    id: 'roulette',
    title: 'Ruleta',
    desc: 'Multijugador · VIP Room',
    icon: '🎰',
    href: '/roulette/play?room=vip-1',
    color: '#7f1d1d',
    border: 'rgba(239,68,68,0.3)',
    badge: 'LIVE',
    badgeColor: '#ef4444',
  },
  {
    id: 'slots',
    title: 'HWA Slots',
    desc: '5x5 · Cascading · Free Spins',
    icon: '⭐',
    href: '/slot',
    color: '#1e1b4b',
    border: 'rgba(212,175,55,0.3)',
    badge: 'NEW',
    badgeColor: '#D4AF37',
  },
]

export default function GamesPage() {
  const router = useRouter()
  const { balance, username, loading } = useWallet('CHIPS')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/')
      else setChecking(false)
    })
  }, [router])

  if (checking || loading) return (
    <div style={{ minHeight: '100dvh', background: '#070710', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(212,175,55,0.2)', borderTop: '2px solid #D4AF37', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#070710', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>

      <GameHeader title="CASINO" balance={balance} username={username} />

      <div style={{ flex: 1, padding: '24px 16px', maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3em', marginBottom: 4 }}>SELECCIONÁ UN JUEGO</div>
        {GAMES.map(g => (
          <button key={g.id} onPointerDown={() => router.push(g.href)}
            style={{ width: '100%', background: g.color + '33', border: '1px solid ' + g.border, borderRadius: 12, padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left', touchAction: 'manipulation' }}>
            <div style={{ width: 56, height: 56, borderRadius: 10, background: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>
              {g.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 700 }}>{g.title}</span>
                <span style={{ fontSize: '0.45rem', fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: g.badgeColor + '22', color: g.badgeColor, letterSpacing: '0.15em', border: '1px solid ' + g.badgeColor + '44' }}>{g.badge}</span>
              </div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>{g.desc}</div>
            </div>
            <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.2)' }}>›</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.5rem', color: 'rgba(255,255,255,0.1)', letterSpacing: '0.15em' }}>
        HWA CASINO · SOLO CHIPS VIRTUALES
      </div>
    </div>
  )
}
