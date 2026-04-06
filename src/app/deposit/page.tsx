'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const GOLD      = '#D4AF37'
const AMOUNTS   = [10, 25, 50, 100, 250, 500]
const MIN_USD   = 10
const MAX_USD   = 1000

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => { render: (id: string) => void }
    }
  }
}

function formatNectar(n: number) {
  return n.toLocaleString('es-UY') + ' Nectar'
}

export default function DepositPage() {
  const router = useRouter()

  const [userId, setUserId]         = useState<string | null>(null)
  const [username, setUsername]     = useState('')
  const [balance, setBalance]       = useState<number | null>(null)
  const [selectedUsd, setSelected]  = useState<number>(50)
  const [customUsd, setCustomUsd]   = useState('')
  const [useCustom, setUseCustom]   = useState(false)
  const [status, setStatus]         = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage]       = useState('')
  const [sdkReady, setSdkReady]     = useState(false)

  const finalUsd = useCustom ? Number(customUsd) : selectedUsd
  const nectar   = finalUsd * 1000
  const valid    = !isNaN(finalUsd) && finalUsd >= MIN_USD && finalUsd <= MAX_USD

  // Cargar usuario
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data?.user
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()
      if (profile) setUsername(profile.username)

      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      if (wallet) setBalance(wallet.balance)
    })
  }, [router])

  // Cargar PayPal SDK
  useEffect(() => {
    if (document.getElementById('paypal-sdk')) { setSdkReady(true); return }
    const script    = document.createElement('script')
    script.id       = 'paypal-sdk'
    script.src      = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD`
    script.onload   = () => setSdkReady(true)
    script.onerror  = () => setMessage('Error cargando PayPal SDK')
    document.body.appendChild(script)
  }, [])

  // Renderizar boton PayPal cuando SDK listo y monto valido
  useEffect(() => {
    if (!sdkReady || !valid || !userId || !window.paypal) return

    const container = document.getElementById('paypal-button-container')
    if (container) container.innerHTML = ''

    window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color:  'gold',
        shape:  'rect',
        label:  'pay',
      },
      createOrder: async () => {
        setStatus('loading')
        setMessage('')
        const res = await fetch('/api/paypal/create-order', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ user_id: userId, amount_usd: finalUsd }),
        })
        const data = await res.json()
        if (!res.ok) {
          setStatus('error')
          setMessage(data.error || 'Error creando orden')
          throw new Error(data.error)
        }
        setStatus('idle')
        return data.order_id
      },
      onApprove: async (data: { orderID: string }) => {
        setStatus('loading')
        setMessage('Procesando pago...')
        const res = await fetch('/api/paypal/capture', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ order_id: data.orderID }),
        })
        const result = await res.json()
        if (!res.ok) {
          setStatus('error')
          setMessage(result.error || 'Error procesando pago')
          return
        }
        setStatus('success')
        setMessage(`\u00a1Dep\u00f3sito exitoso! Se acreditaron ${formatNectar(result.nectar_added)}.`)
        setBalance(prev => (prev ?? 0) + result.nectar_added)
      },
      onError: (err: unknown) => {
        console.error('PayPal error:', err)
        setStatus('error')
        setMessage('Error en el pago. Intenta nuevamente.')
      },
      onCancel: () => {
        setStatus('idle')
        setMessage('Pago cancelado.')
      },
    }).render('#paypal-button-container')
  }, [sdkReady, valid, userId, finalUsd])

  const cardStyle: React.CSSProperties = {
    background:   'rgba(255,255,255,0.04)',
    border:       '1px solid rgba(212,175,55,0.2)',
    borderRadius: 12,
    padding:      '24px',
    marginBottom: 20,
  }

  const amountBtn = (usd: number): React.CSSProperties => ({
    padding:      '14px 0',
    borderRadius: 8,
    border:       selectedUsd === usd && !useCustom
      ? `2px solid ${GOLD}`
      : '1px solid rgba(255,255,255,0.12)',
    background:   selectedUsd === usd && !useCustom
      ? 'rgba(212,175,55,0.12)'
      : 'rgba(255,255,255,0.04)',
    color:        selectedUsd === usd && !useCustom ? GOLD : 'rgba(255,255,255,0.7)',
    fontSize:     15,
    fontFamily:   'Montserrat, sans-serif',
    fontWeight:   selectedUsd === usd && !useCustom ? 700 : 400,
    cursor:       'pointer',
    transition:   'all 0.2s',
    textAlign:    'center',
  })

  return (
    <div style={{
      minHeight:   '100vh',
      background:  '#0d0d0d',
      color:       'rgba(255,255,255,0.85)',
      fontFamily:  'Montserrat, sans-serif',
      padding:     '0 0 60px',
    }}>

      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(212,175,55,0.15)',
        padding:      '20px 24px',
        display:      'flex',
        alignItems:   'center',
        gap:          16,
      }}>
        <button
          onClick={() => router.push('/lobby')}
          style={{
            background: 'none',
            border:     'none',
            color:      GOLD,
            fontSize:   20,
            cursor:     'pointer',
            padding:    0,
          }}
        >
          \u2190
        </button>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>
            HWA CASINO
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: GOLD }}>
            Comprar Nectar
          </div>
        </div>
        {balance !== null && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Balance</div>
            <div style={{ fontSize: 14, color: GOLD, fontWeight: 600 }}>
              {formatNectar(balance)}
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 20px 0' }}>

        {/* Titulo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize:   32,
            fontWeight: 700,
            color:      GOLD,
            marginBottom: 8,
          }}>
            Nectar
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', letterSpacing: 1 }}>
            1 USD = 1,000 Nectar &bull; M\u00ednimo $10 USD
          </div>
        </div>

        {/* Selector de monto */}
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: 1.5, marginBottom: 16 }}>
            SELECCION\u00c1 EL MONTO
          </div>
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:                 10,
            marginBottom:        16,
          }}>
            {AMOUNTS.map(usd => (
              <button
                key={usd}
                style={amountBtn(usd)}
                onClick={() => { setSelected(usd); setUseCustom(false) }}
              >
                <div style={{ fontSize: 16, fontWeight: 700 }}>${usd}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{(usd * 1000).toLocaleString('es-UY')} N</div>
              </button>
            ))}
          </div>

          {/* Monto custom */}
          <div style={{ position: 'relative' }}>
            <span style={{
              position:   'absolute',
              left:       14,
              top:        '50%',
              transform:  'translateY(-50%)',
              color:      'rgba(255,255,255,0.4)',
              fontSize:   16,
            }}>$</span>
            <input
              type="number"
              min={MIN_USD}
              max={MAX_USD}
              placeholder="Otro monto (10 - 1000)"
              value={customUsd}
              onChange={e => { setCustomUsd(e.target.value); setUseCustom(true) }}
              onFocus={() => setUseCustom(true)}
              style={{
                width:        '100%',
                padding:      '13px 14px 13px 28px',
                background:   'rgba(255,255,255,0.06)',
                border:       useCustom ? `1px solid ${GOLD}` : '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                color:        'rgba(255,255,255,0.85)',
                fontSize:     15,
                fontFamily:   'Montserrat, sans-serif',
                boxSizing:    'border-box',
                outline:      'none',
              }}
            />
          </div>
        </div>

        {/* Resumen */}
        {valid && (
          <div style={{
            ...cardStyle,
            borderColor: 'rgba(212,175,55,0.35)',
            background:  'rgba(212,175,55,0.06)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Pag\u00e1s</span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>${finalUsd.toFixed(2)} USD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Recib\u00eds</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: GOLD }}>
                {formatNectar(nectar)}
              </span>
            </div>
          </div>
        )}

        {/* Status message */}
        {message && (
          <div style={{
            padding:      '14px 18px',
            borderRadius: 8,
            marginBottom: 16,
            background:   status === 'success'
              ? 'rgba(40,167,69,0.15)'
              : status === 'error'
              ? 'rgba(220,53,69,0.15)'
              : 'rgba(255,255,255,0.06)',
            border:       status === 'success'
              ? '1px solid rgba(40,167,69,0.4)'
              : status === 'error'
              ? '1px solid rgba(220,53,69,0.4)'
              : '1px solid rgba(255,255,255,0.1)',
            color:        status === 'success'
              ? '#5cb85c'
              : status === 'error'
              ? '#e57373'
              : 'rgba(255,255,255,0.7)',
            fontSize:     13,
            lineHeight:   1.5,
          }}>
            {message}
          </div>
        )}

        {/* Boton PayPal */}
        {status === 'success' ? (
          <button
            onClick={() => router.push('/lobby')}
            style={{
              width:        '100%',
              padding:      '16px',
              background:   GOLD,
              border:       'none',
              borderRadius: 8,
              color:        '#000',
              fontSize:     15,
              fontWeight:   700,
              fontFamily:   'Montserrat, sans-serif',
              cursor:       'pointer',
              letterSpacing: 1,
            }}
          >
            IR AL LOBBY
          </button>
        ) : (
          <>
            {status === 'loading' && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '20px 0', fontSize: 13 }}>
                Procesando...
              </div>
            )}
            {valid && status !== 'loading' && (
              <div id="paypal-button-container" style={{ marginTop: 8 }} />
            )}
            {!valid && (
              <div style={{
                textAlign:    'center',
                padding:      '16px',
                color:        'rgba(255,255,255,0.25)',
                fontSize:     13,
                border:       '1px dashed rgba(255,255,255,0.1)',
                borderRadius: 8,
              }}>
                Seleccion\u00e1 un monto para continuar
              </div>
            )}
          </>
        )}

        {/* Info */}
        <div style={{
          marginTop:  28,
          padding:    '16px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 8,
          fontSize:   12,
          color:      'rgba(255,255,255,0.3)',
          lineHeight: 1.8,
        }}>
          \u2022 Pago procesado de forma segura por PayPal<br />
          \u2022 Nectar acreditado al instante<br />
          \u2022 No se realizan retiros — solo compra de cr\u00e9ditos de juego
        </div>

      </div>
    </div>
  )
}
