'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { LocaleSelector } from '@/components/LocaleSelector'

const GOLD = '#D4AF37'

interface Props {
  title: string
  balance: number
  username: string
  centerContent?: React.ReactNode
}

export function GameHeader({ title, balance, username, centerContent }: Props) {
  const router = useRouter()

  return (
    <div style={{
      background: 'rgba(10,10,10,0.95)',
      position: 'sticky', top: 0, zIndex: 90,
      borderBottom: '1px solid rgba(212,175,55,0.2)',
      padding: '7px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* IZQUIERDA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onPointerDown={() => router.push('/games')}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.9rem', padding: 0, flexShrink: 0 }}>
          ←
        </button>
        <img src="/logo-hwa.png" alt="HWA" style={{ height: '18px', width: 'auto', flexShrink: 0 }} />
        <span style={{ fontSize: '0.68rem', color: GOLD, fontWeight: 500 }}>{title}</span>
      </div>

      {/* CENTRO */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '0.68rem', fontWeight: 500,
      }}>
        {centerContent ?? (
          <>
            <span style={{ color: GOLD }}>Chip-$:</span>
            <span style={{ color: GOLD }}>{balance.toLocaleString('es-UY')}</span>
          </>
        )}
      </div>

      {/* DERECHA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <LocaleSelector />
        <button
          onPointerDown={() => {}}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
          <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 3.6-7 8-7s8 3 8 7'/>
          </svg>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>{username}</span>
        </button>
        <button
          onPointerDown={() => supabase.auth.signOut().then(() => router.push('/'))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' style={{ marginTop: 0.5 }}>
            <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/>
            <polyline points='16 17 21 12 16 7'/>
            <line x1='21' y1='12' x2='9' y2='12'/>
          </svg>
        </button>
      </div>
    </div>
  )
}
