'use client'
import { useState } from 'react'
import { useNowPayments } from '@/hooks/useNowPayments'

const GOLD = '#D4AF37'

const AMOUNTS = [25, 50, 100, 250, 500, 1000]

const CURRENCIES = [
  { id: 'usdttrc20', label: 'USDT TRC20', icon: '₮' },
  { id: 'usdterc20', label: 'USDT ERC20', icon: '₮' },
  { id: 'btc',       label: 'Bitcoin',    icon: '₿' },
  { id: 'eth',       label: 'Ethereum',   icon: 'Ξ' },
  { id: 'ltc',       label: 'Litecoin',   icon: 'Ł' },
]

export function NowPaymentsWidget({ userId }: { userId: string | null }) {
  const [amount, setAmount]       = useState<number>(10)
  const [custom, setCustom]       = useState('')
  const [currency, setCurrency]   = useState('usdttrc20')
  const [copied, setCopied]       = useState(false)

  const { status, invoice, error, createPayment, reset } = useNowPayments(userId)

  const finalAmount = custom ? parseFloat(custom) : amount

  async function handleCreate() {
    if (!finalAmount || finalAmount < 1) return
    await createPayment(finalAmount, currency)
  }

  function copyAddress() {
    if (!invoice) return
    navigator.clipboard.writeText(invoice.pay_address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Pantalla de factura generada ──────────────────────────
  if (invoice && status !== 'idle' && status !== 'creating' && status !== 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Status badge */}
        <div style={{ textAlign: 'center' }}>
          {status === 'finished' ? (
            <div style={{ color: '#4ade80', fontFamily: "'Inter', sans-serif", fontStyle: 'normal', fontSize: '1.2rem' }}>
              ✓ Depósito acreditado — Chip-$ {invoice.estimated_usd.toLocaleString('es-UY')}
            </div>
          ) : status === 'confirming' ? (
            <div style={{ color: GOLD, fontFamily: "'Inter', sans-serif", fontStyle: 'normal', fontSize: '1rem' }}>
              ⏳ Confirmando en la red...
            </div>
          ) : status === 'expired' || status === 'failed' ? (
            <div style={{ color: '#f87171', fontFamily: "'Inter', sans-serif", fontStyle: 'normal', fontSize: '1rem' }}>
              ✕ {status === 'expired' ? 'Expirado' : 'Fallido'} — intentá de nuevo
            </div>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif", fontStyle: 'normal', fontSize: '0.9rem' }}>
              Esperando depósito...
            </div>
          )}
        </div>

        {/* Datos del depósito */}
        {(status === 'waiting' || status === 'confirming') && (
          <>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '12px 16px', border: '1px solid rgba(212,175,55,0.15)' }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem', letterSpacing: '0.15em', marginBottom: 6 }}>
                ENVIÁ EXACTAMENTE
              </div>
              <div style={{ color: GOLD, fontFamily: "'Inter', sans-serif", fontStyle: 'normal', fontSize: '1.4rem' }}>
                {invoice.pay_amount} {invoice.pay_currency.toUpperCase()}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem', marginTop: 4 }}>
                ≈ USD {invoice.estimated_usd}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '12px 16px', border: '1px solid rgba(212,175,55,0.15)' }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem', letterSpacing: '0.15em', marginBottom: 6 }}>
                DIRECCIÓN DE DESTINO
              </div>
              <div style={{ color: '#fff', fontSize: '0.65rem', wordBreak: 'break-all', letterSpacing: '0.03em', lineHeight: 1.5 }}>
                {invoice.pay_address}
              </div>
              <button
                onPointerDown={copyAddress}
                style={{
                  marginTop: 8, width: '100%', padding: '8px',
                  background: copied ? 'rgba(74,222,128,0.1)' : 'rgba(212,175,55,0.1)',
                  border: `1px solid ${copied ? '#4ade80' : 'rgba(212,175,55,0.3)'}`,
                  borderRadius: 4, color: copied ? '#4ade80' : GOLD,
                  fontFamily: "'Inter', sans-serif", fontStyle: 'normal', fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                {copied ? '✓ Copiado' : 'Copiar dirección'}
              </button>
            </div>

            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem', textAlign: 'center', letterSpacing: '0.05em' }}>
              Verificando automáticamente cada 10 segundos
            </div>
          </>
        )}

        {/* Botón nuevo depósito */}
        {(status === 'finished' || status === 'expired' || status === 'failed') && (
          <button
            onPointerDown={reset}
            style={{
              padding: '10px', background: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.3)', borderRadius: 4,
              color: GOLD, fontFamily: "'Inter', sans-serif", fontStyle: 'normal',
              fontSize: '1rem', cursor: 'pointer',
            }}
          >
            Nuevo depósito
          </button>
        )}
      </div>
    )
  }

  // ── Pantalla de selección ─────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Selector de crypto */}
      <div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem', letterSpacing: '0.15em', marginBottom: 8 }}>
          MONEDA
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CURRENCIES.map(c => (
            <button
              key={c.id}
              onPointerDown={() => setCurrency(c.id)}
              style={{
                padding: '5px 12px', borderRadius: 4, cursor: 'pointer',
                background: currency === c.id ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${currency === c.id ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: currency === c.id ? GOLD : 'rgba(255,255,255,0.5)',
                fontFamily: "'Inter', sans-serif", fontStyle: 'normal', fontSize: '0.85rem',
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de monto */}
      <div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem', letterSpacing: '0.15em', marginBottom: 8 }}>
          MONTO USD
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {AMOUNTS.map(a => (
            <button
              key={a}
              onPointerDown={() => { setAmount(a); setCustom('') }}
              style={{
                padding: '8px 4px', borderRadius: 4, cursor: 'pointer',
                background: amount === a && !custom ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${amount === a && !custom ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: amount === a && !custom ? GOLD : 'rgba(255,255,255,0.5)',
                fontFamily: "'Inter', sans-serif", fontStyle: 'normal', fontSize: '0.9rem',
              }}
            >
              ${a}
            </button>
          ))}
        </div>

        {/* Monto personalizado */}
        <input
          type="number"
          placeholder="Otro monto..."
          value={custom}
          onChange={e => { setCustom(e.target.value); setAmount(0) }}
          style={{
            marginTop: 8, width: '100%', padding: '8px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${custom ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 4, color: '#fff',
            fontFamily: "'Inter', sans-serif", fontStyle: 'normal', fontSize: '1rem',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: '#f87171', fontFamily: "'Inter', sans-serif", fontStyle: 'normal', fontSize: '0.9rem', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Botón generar */}
      <button
        onPointerDown={handleCreate}
        disabled={status === 'creating' || !finalAmount || finalAmount < 1}
        style={{
          padding: '12px',
          background: status === 'creating' || !finalAmount || finalAmount < 1
            ? 'rgba(80,60,0,0.3)'
            : 'linear-gradient(180deg,#f5d060 0%,#d4af37 50%,#a07820 100%)',
          border: 'none',
          borderBottom: status === 'creating' ? '1px solid rgba(212,175,55,0.2)' : '3px solid #7a5a10',
          borderRadius: 4,
          color: status === 'creating' || !finalAmount || finalAmount < 1 ? 'rgba(212,175,55,0.4)' : '#1a0e00',
          fontFamily: "'Inter', sans-serif", fontStyle: 'normal',
          fontSize: '1.1rem', fontWeight: 700,
          cursor: status === 'creating' || !finalAmount || finalAmount < 1 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {status === 'creating' ? 'Generando dirección...' : `Depositar $${finalAmount} USD`}
      </button>

      <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.5rem', textAlign: 'center', letterSpacing: '0.05em' }}>
        Powered by NOWPayments · Confirmación automática en blockchain
      </div>
    </div>
  )
}


