'use client'
import { useState } from 'react'

const GOLD = '#D4AF37'
const DARK = '#0a0a0a'

const PACKAGES = [
  { chips: 300,  usd: 0.99, label: '300 Chips', tag: 'STARTER' },
  { chips: 1000, usd: 1.99, label: '1.000 Chips', tag: 'POPULAR' },
  { chips: 2500, usd: 4.99, label: '2.500 Chips', tag: 'BEST VALUE' },
]

interface Props {
  open: boolean
  onClose: () => void
  userId: string | null
}

export default function ChipShopModal({ open, onClose, userId }: Props) {
  const [selected, setSelected] = useState(PACKAGES[1])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function handleBuy() {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, amount_usd: selected.usd, chips: selected.chips, return_url: window.location.origin + '/roulette/play?room=vip-1&payment=success', cancel_url: window.location.origin + '/roulette/play?room=vip-1' }),
      })
      const data = await res.json()
      if (data.error) { setError('Error al crear la orden. Intentá de nuevo.'); setLoading(false); return }
      // Redirigir al checkout de PayPal
      console.log('paypal response:', JSON.stringify(data))
      const approveUrl = data.approve_url ?? data.links?.find((l: any) => l.rel === 'approve')?.href
      if (approveUrl) window.location.href = approveUrl
    } catch {
      setError('Error de conexión.')
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
      <div style={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', width: '100%', maxWidth: '380px', padding: '28px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <p style={{ fontSize: '0.45rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '6px' }}>HWA CASINO</p>
          <h2 style={{ fontSize: '1.4rem', color: GOLD, fontWeight: 700, letterSpacing: '0.1em' }}>CHIP SHOP</h2>
          <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>Recargá tu balance y seguí jugando</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.chips}
              onPointerDown={() => setSelected(pkg)}
              style={{
                background: selected.chips === pkg.chips ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selected.chips === pkg.chips ? GOLD : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '8px',
                padding: '14px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                touchAction: 'manipulation',
              }}>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>{pkg.label}</p>
                <p style={{ fontSize: '0.48rem', color: GOLD, letterSpacing: '0.15em', marginTop: '2px' }}>{pkg.tag}</p>
              </div>
              <p style={{ fontSize: '1.1rem', color: selected.chips === pkg.chips ? GOLD : 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                USD {pkg.usd.toFixed(2)}
              </p>
            </button>
          ))}
        </div>

        {error && <p style={{ color: '#f87171', fontSize: '0.65rem', textAlign: 'center', marginBottom: '12px' }}>{error}</p>}

        <button
          onPointerDown={handleBuy}
          disabled={loading}
          style={{ width: '100%', background: GOLD, border: 'none', borderRadius: '6px', padding: '14px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', color: '#000', cursor: 'pointer', touchAction: 'manipulation', opacity: loading ? 0.6 : 1, marginBottom: '10px' }}>
          {loading ? 'PROCESANDO...' : `PAGAR USD ${selected.usd.toFixed(2)}`}
        </button>

        <button
          onPointerDown={onClose}
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: '0.55rem', letterSpacing: '0.2em', cursor: 'pointer', touchAction: 'manipulation', padding: '8px' }}>
          CANCELAR
        </button>

      </div>
    </div>
  )
}


