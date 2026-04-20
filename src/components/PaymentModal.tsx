'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { usePromoCode } from '@/hooks/usePromoCode'
import { NowPaymentsWidget } from '@/components/NowPaymentsWidget'

const GOLD = '#D4AF37'
const USDT_WALLET = process.env.NEXT_PUBLIC_USDT_WALLET ?? '0x3dAD0FD24fECf8095EFC3e281dF0B169920E03c8'

const PACKAGES = [
  { usd: 0.99, label: '300 Chips',   chips: 300  },
  { usd: 1.99, label: '1.000 Chips', chips: 1000 },
  { usd: 4.99, label: '2.500 Chips', chips: 2500 },
]

type Tab = 'paypal' | 'crypto' | 'usdt' | 'withdraw'

interface Props {
  open: boolean
  onClose: () => void
  userId: string | null
  username?: string
  balances: Record<string, number>
}

export default function PaymentModal({ open, onClose, userId, username, balances }: Props) {
  const [tab, setTab]             = useState<Tab>('paypal')
  const [selectedPkg, setPkg]     = useState<{usd: number, label: string, chips: number}>(PACKAGES[1])
  const [sdkReady, setSdkReady]   = useState(false)
  const [status, setStatus]       = useState<'idle'|'loading'|'success'|'error'>('idle')
  const [message, setMessage]     = useState('')
  const [copied, setCopied]       = useState(false)
  const [usdtAmt, setUsdtAmt]     = useState('')
  const [txHash, setTxHash]       = useState('')
  const [withdrawAmt, setWithdrawAmt] = useState('')
  const [withdrawAddr, setWithdrawAddr] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [promoData, setPromoData] = useState<any>(null)
  const [promoStatus, setPromoStatus] = useState<'idle'|'valid'|'invalid'>('idle')
  const [promoLoading, setPromoLoading] = useState(false)
  const ppRef = useRef(false)

  useEffect(() => {
    if (!open) return
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    if (!clientId || document.getElementById('pp-sdk')) { setSdkReady(true); return }
    const s = document.createElement('script')
    s.id = 'pp-sdk'
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`
    s.onload = () => setSdkReady(true)
    document.body.appendChild(s)
  }, [open])

  useEffect(() => {
    if (!sdkReady || tab !== 'paypal' || !userId || ppRef.current) return
    const w = window as typeof window & { paypal?: any }
    if (!w.paypal) return
    const container = document.getElementById('pp-btn')
    if (!container) return
    container.innerHTML = ''
    ppRef.current = true

    w.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 44 },
      createOrder: async () => {
        setStatus('loading')
        const res = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, amount_usd: selectedPkg.usd }),
        })
        const d = await res.json()
        if (!res.ok) { setStatus('error'); setMessage(d.error); throw new Error(d.error) }
        setStatus('idle')
        return d.order_id
      },
      onApprove: async (data: { orderID: string }) => {
        setStatus('loading')
        setMessage('Procesando...')
        const chipsToCredit = promoHook.getChipsWithBonus(selectedPkg.chips)
        const res = await fetch('/api/paypal/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: data.orderID, chips: chipsToCredit, promo_code: promoHook.promo?.code }),
        })
        const d = await res.json()
        if (!res.ok) { setStatus('error'); setMessage(d.error); return }
        setStatus('success')
        setMessage(`¡Listo! Se acreditaron ${chipsToCredit.toLocaleString('es-UY')} Chips a tu wallet.`)
      },
      onError: () => { setStatus('error'); setMessage('Error en el pago. Intentá de nuevo.') },
      onCancel: () => { setStatus('idle'); setMessage('') },
    }).render('#pp-btn')
  }, [sdkReady, tab, userId, selectedPkg])

  useEffect(() => { ppRef.current = false }, [selectedPkg])
  useEffect(() => { if (!open) ppRef.current = false }, [open])

  async function validatePromo() {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoStatus('idle')
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoHook.code.trim().toUpperCase())
      .eq('is_active', true)
      .single()
    setPromoLoading(false)
    if (error || !data) { setPromoStatus('invalid'); setPromoData(null); return }
    if (data.max_uses && data.uses_count >= data.max_uses) { setPromoStatus('invalid'); setPromoData(null); return }
    setPromoStatus('valid')
    setPromoData(data)
  }

  function promoHook.getChipsWithBonus(baseChips: number): number {
    if (!promoData || promoStatus !== 'valid') return baseChips
    if (promoData.type === 'free_chips') return baseChips * promoData.value
    if (promoData.type === 'percent') return baseChips + Math.floor(baseChips * promoData.value / 100)
    return baseChips
  }

  function copyWallet() {
    navigator.clipboard.writeText(USDT_WALLET)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function submitUSDT() {
    if (!usdtAmt || parseFloat(usdtAmt) <= 0 || !userId) return
    setStatus('loading')
    const res = await fetch('/api/usdt/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, amount_usdt: parseFloat(usdtAmt), tx_hash: txHash }),
    })
    const d = await res.json()
    if (!res.ok) { setStatus('error'); setMessage(d.error) }
    else { setStatus('success'); setMessage('Solicitud registrada. Confirmamos en breve.') }
  }

  async function submitWithdraw() {
    if (!withdrawAmt || !withdrawAddr || !userId) return
    setStatus('loading')
    const res = await fetch('/api/usdt/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, amount: parseFloat(withdrawAmt), address: withdrawAddr }),
    })
    const d = await res.json()
    if (!res.ok) { setStatus('error'); setMessage(d.error) }
    else { setStatus('success'); setMessage('Solicitud de retiro registrada. Procesamos en 24hs.') }
  }

  if (!open) return null

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1, padding: '12px 4px', fontSize: '0.65rem',
    fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '0.1em',
    border: 'none',
    background: tab === t ? 'rgba(212,175,55,0.1)' : 'transparent',
    color: tab === t ? GOLD : 'rgba(255,255,255,0.35)',
    borderBottom: tab === t ? `2px solid ${GOLD}` : '2px solid transparent',
    cursor: 'pointer', transition: 'all 0.2s', touchAction: 'manipulation',
  })

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 6, color: '#fff', fontSize: '0.85rem',
    fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box',
  }

  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '14px',
    background: 'linear-gradient(180deg, #f5d060 0%, #d4af37 50%, #a07820 100%)',
    border: 'none', borderBottom: '3px solid #7a5a10', borderRadius: 6,
    color: '#1a0e00', fontSize: '0.7rem', fontFamily: "'Inter', sans-serif",
    fontWeight: 900, letterSpacing: '0.15em', cursor: 'pointer', touchAction: 'manipulation',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#0f0f0f',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 16,
        maxHeight: '90dvh', overflowY: 'auto',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
      }}>

        {/* Titulo */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
          <div>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.3rem', color: GOLD }}>Caja</span>
            {username && <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>{username}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.55rem' }}>
              {Object.entries(balances).filter(([,v]) => v > 0).map(([k,v]) => (
                <span key={k} style={{ color: GOLD }}>{v.toLocaleString('es-UY')} {k}</span>
              ))}
            </div>
            <button onPointerDown={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px', touchAction: 'manipulation' }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
          <button style={tabStyle('paypal')} onPointerDown={() => { setTab('paypal'); setStatus('idle'); setMessage('') }}>PAYPAL</button>
          <button style={tabStyle('crypto')} onPointerDown={() => { setTab('crypto'); setStatus('idle'); setMessage('') }}>CRYPTO</button>
          <button style={tabStyle('usdt')} onPointerDown={() => { setTab('usdt'); setStatus('idle'); setMessage('') }}>USDT</button>
          <button style={tabStyle('withdraw')} onPointerDown={() => { setTab('withdraw'); setStatus('idle'); setMessage('') }}>RETIRAR</button>
        </div>

        <div style={{ padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* PAYPAL */}
          {tab === 'paypal' && (
            <>
              <p style={{ margin: 0, fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>SELECCIONÁ EL PAQUETE</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PACKAGES.map(p => (
                  <button key={p.usd} onPointerDown={() => { setPkg(p); setStatus('idle'); setMessage('') }}
                    style={{
                      padding: '14px 16px', borderRadius: 8,
                      border: selectedPkg.usd === p.usd ? `1px solid ${GOLD}` : '1px solid rgba(255,255,255,0.08)',
                      background: selectedPkg.usd === p.usd ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', touchAction: 'manipulation',
                    }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>{p.label}</span>
                    <span style={{ color: selectedPkg.usd === p.usd ? GOLD : 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '1rem' }}>USD {p.usd.toFixed(2)}</span>
                  </button>
                ))}
              </div>

              {/* Promo code */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="¿Tenés un código promo?" value={promoHook.code}
                  onChange={e => { promoHook.setCode(e.target.value.toUpperCase()) }}
                  style={{ ...inputStyle, flex: 1, fontSize: '0.75rem', padding: '10px 12px' }} />
                <button onPointerDown={validatePromo} disabled={promoLoading}
                  style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 6, padding: '10px 14px', color: GOLD, fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', touchAction: 'manipulation' }}>
                  {promoLoading ? '...' : 'APLICAR'}
                </button>
              </div>
              {promoHook.status === 'valid' && promoHook.promo && (
                <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 6, padding: '10px 14px', fontSize: '0.65rem', color: '#4ade80' }}>
                  ✓ {promoHook.promo?.purchase_bonus_label ?? promoHook.promo?.description} — {promoHook.getChipsWithBonus(selectedPkg.chips).toLocaleString('es-UY')} Chips por USD {selectedPkg.usd.toFixed(2)}
                </div>
              )}
              {promoHook.status === 'invalid' && (
                <p style={{ color: '#f87171', fontSize: '0.65rem', margin: 0 }}>Código inválido o expirado.</p>
              )}

              {status === 'success' ? (
                <div style={{ padding: '14px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 6, color: '#4ade80', fontSize: '0.75rem', textAlign: 'center' }}>{message}</div>
              ) : (
                <div id="pp-btn" style={{ minHeight: 50 }} />
              )}
              {status === 'error' && <p style={{ color: '#f87171', fontSize: '0.7rem', margin: 0 }}>{message}</p>}
              <p style={{ margin: 0, fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', lineHeight: 1.7 }}>
                • Pago seguro vía PayPal<br />
                • Chips acreditados al instante<br />
                • Desactivá tu ad blocker para usar PayPal
              </p>
            </>
          )}

          {/* CRYPTO */}
          {tab === 'crypto' && (
            <NowPaymentsWidget userId={userId} />
          )}

          {/* USDT */}
          {tab === 'usdt' && (
            <>
              <p style={{ margin: 0, fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>DEPOSITAR USDT (ERC-20)</p>
              <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '14px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>Enviá USDT (red ERC-20) a:</p>
                <p style={{ margin: '0 0 10px', fontSize: '0.65rem', color: GOLD, wordBreak: 'break-all', fontFamily: 'monospace' }}>{USDT_WALLET}</p>
                <button onPointerDown={copyWallet} style={{ ...btnStyle, padding: '10px' }}>
                  {copied ? '✓ COPIADO' : 'COPIAR DIRECCIÓN'}
                </button>
              </div>
              <input type="number" placeholder="Monto enviado (USDT)" value={usdtAmt}
                onChange={e => setUsdtAmt(e.target.value)} style={inputStyle} />
              <input type="text" placeholder="Hash de transacción (opcional)" value={txHash}
                onChange={e => setTxHash(e.target.value)} style={inputStyle} />
              {status === 'success'
                ? <div style={{ padding: '14px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 6, color: '#4ade80', fontSize: '0.75rem', textAlign: 'center' }}>{message}</div>
                : <button onPointerDown={submitUSDT} disabled={status === 'loading'} style={btnStyle}>
                    {status === 'loading' ? 'ENVIANDO...' : 'NOTIFICAR DEPÓSITO'}
                  </button>
              }
              {status === 'error' && <p style={{ color: '#f87171', fontSize: '0.7rem', margin: 0 }}>{message}</p>}
              <p style={{ margin: 0, fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', lineHeight: 1.7 }}>
                • Red: ERC-20 (Ethereum) únicamente<br />
                • Confirmamos manualmente en breve<br />
                • Mínimo: 5 USDT
              </p>
            </>
          )}

          {/* RETIRAR */}
          {tab === 'withdraw' && (
            <>
              <p style={{ margin: 0, fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>SOLICITAR RETIRO</p>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px', fontSize: '0.65rem' }}>
                {Object.entries(balances).map(([k,v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{k}</span>
                    <span style={{ color: GOLD, fontWeight: 700 }}>{v.toLocaleString('es-UY')}</span>
                  </div>
                ))}
              </div>
              <input type="text" placeholder="Tu dirección USDT ERC-20 (0x...)" value={withdrawAddr}
                onChange={e => setWithdrawAddr(e.target.value)} style={inputStyle} />
              <input type="number" placeholder="Monto a retirar (USDT)" value={withdrawAmt}
                onChange={e => setWithdrawAmt(e.target.value)} style={inputStyle} />
              {status === 'success'
                ? <div style={{ padding: '14px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 6, color: '#4ade80', fontSize: '0.75rem', textAlign: 'center' }}>{message}</div>
                : <button onPointerDown={submitWithdraw} disabled={status === 'loading'} style={btnStyle}>
                    {status === 'loading' ? 'ENVIANDO...' : 'SOLICITAR RETIRO'}
                  </button>
              }
              {status === 'error' && <p style={{ color: '#f87171', fontSize: '0.7rem', margin: 0 }}>{message}</p>}
              <p style={{ margin: 0, fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', lineHeight: 1.7 }}>
                • Procesamos retiros en 24hs hábiles<br />
                • Mínimo: 10 USDT<br />
                • Comisión: 2%
              </p>
            </>
          )}

        </div>
        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
