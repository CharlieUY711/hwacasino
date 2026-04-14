'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import PaymentModal from '@/components/PaymentModal'

const GOLD = '#D4AF37'
const DARK = '#0a0a0a'

function fmt(n: number) {
  return Math.abs(n).toLocaleString('es-UY')
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function firstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
}

export default function Dashboard() {
  const router = useRouter()
  const [userId,   setUserId]   = useState<string|null>(null)
  const [username, setUsername] = useState('')
  const [from,     setFrom]     = useState(firstOfMonth())
  const [to,       setTo]       = useState(today())
  const [data,     setData]     = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [showPayment, setShowPayment] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      setUserId(user.id)
      supabase.from('profiles').select('username').eq('id', user.id).single()
        .then(({ data: p }) => setUsername(p?.username ?? ''))
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    fetch(`/api/user/stats?user_id=${userId}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [userId, from, to])

  const cardStyle = (color: string): React.CSSProperties => ({
    background: '#111',
    border: `1px solid ${color}33`,
    borderRadius: 12,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  })

  if (!data && loading) return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif', overflowY: 'auto',WebkitOverflowScrolling: 'touch',overflowY: 'auto' }}>
      Cargando...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: DARK, fontFamily: 'Inter, sans-serif', overflowY: 'auto',WebkitOverflowScrolling: 'touch',overflowY: 'auto',maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(212,175,55,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo-dorado.jpg" alt="HWA" style={{ height: 28, borderRadius: 6 }} />
          <span style={{ fontSize: '0.8rem', color: GOLD, fontWeight: 600 }}>Mi cuenta</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{username}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowPayment(true)} style={{ background: 'linear-gradient(180deg,#2d7a4f 0%,#1e5c38 100%)', border: 'none', borderRadius: 6, padding: '6px 14px', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Caja</button>
            <button onClick={() => router.push('/roulette')} style={{ background: 'linear-gradient(180deg,#f5d060 0%,#d4af37 100%)', border: 'none', borderRadius: 6, padding: '6px 14px', color: '#1a0e00', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Jugar</button>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Balance */}
        <div style={{ ...cardStyle(GOLD), alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>SALDO DISPONIBLE</span>
          <span style={{ fontSize: '2rem', color: GOLD, fontWeight: 700 }}>Chip-$ {fmt(data?.balance ?? 0)}</span>
        </div>

        {/* Filtro de fechas */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ flex: 1, padding: '8px 10px', background: '#111', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, color: '#fff', fontSize: '0.75rem', fontFamily: 'Inter, sans-serif', overflowY: 'auto',WebkitOverflowScrolling: 'touch',overflowY: 'auto' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>a</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ flex: 1, padding: '8px 10px', background: '#111', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, color: '#fff', fontSize: '0.75rem', fontFamily: 'Inter, sans-serif', overflowY: 'auto',WebkitOverflowScrolling: 'touch',overflowY: 'auto' }} />
        </div>

        {/* Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={cardStyle('#4ade80')}>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>GANADO</span>
            <span style={{ fontSize: '1.2rem', color: '#4ade80', fontWeight: 700 }}>Chip-$ {fmt(data?.totalWon ?? 0)}</span>
          </div>
          <div style={cardStyle('#f87171')}>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>PERDIDO</span>
            <span style={{ fontSize: '1.2rem', color: '#f87171', fontWeight: 700 }}>Chip-$ {fmt(data?.totalLost ?? 0)}</span>
          </div>
          <div style={cardStyle(data?.netResult >= 0 ? '#4ade80' : '#f87171')}>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>RESULTADO NETO</span>
            <span style={{ fontSize: '1.1rem', color: data?.netResult >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
              {data?.netResult >= 0 ? '+' : '-'} Chip-$ {fmt(data?.netResult ?? 0)}
            </span>
          </div>
          <div style={cardStyle('#60a5fa')}>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>DEPÓSITOS</span>
            <span style={{ fontSize: '1.1rem', color: '#60a5fa', fontWeight: 700 }}>USD {fmt(data?.totalDeposits ?? 0)}</span>
          </div>
        </div>

        {/* Historial */}
        <div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 10 }}>
            ÚLTIMAS TRANSACCIONES ({data?.txCount ?? 0})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(data?.transactions ?? []).slice(0, 30).map((tx: any) => (
              <div key={tx.id} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                    {tx.type === 'win' || tx.type === 'credit' ? '↑ Ganancia' :
                     tx.type === 'loss' || tx.type === 'debit' ? '↓ Pérdida' :
                     tx.type === 'deposit' ? '⬇ Depósito' : tx.type}
                    {tx.game ? ` · ${tx.game}` : ''}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>
                    {new Date(tx.created_at).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: tx.type === 'win' || tx.type === 'credit' || tx.type === 'deposit' ? '#4ade80' : '#f87171' }}>
                  {tx.type === 'win' || tx.type === 'credit' || tx.type === 'deposit' ? '+' : '-'}{fmt(tx.amount)}
                </span>
              </div>
            ))}
            {(!data?.transactions || data.transactions.length === 0) && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', padding: '24px 0' }}>
                Sin transacciones en el período seleccionado
              </div>
            )}
          </div>
        </div>

      </div>
      <PaymentModal open={showPayment} onClose={() => setShowPayment(false)} userId={userId} username={username} balances={{}} />
      <PaymentModal open={showPayment} onClose={() => setShowPayment(false)} userId={userId} username={username} balances={{}} />
    </div>
  )
}





