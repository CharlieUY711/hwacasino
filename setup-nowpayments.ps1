# setup-nowpayments.ps1
# Instala integración completa de NOWPayments en hwacasino

$ROOT = "C:\Carlos\HWA\hwacasino"
$SRC  = "$ROOT\src"

Write-Host "== NOWPayments Integration ==" -ForegroundColor Cyan

# ── 1. Agregar keys al .env.local ─────────────────────────────
$envFile = "$ROOT\.env.local"
$envContent = Get-Content $envFile -Raw -Encoding UTF8

if (-not $envContent.Contains("NOWPAYMENTS_API_KEY")) {
    $envContent += @"

# NOWPayments
NOWPAYMENTS_API_KEY=SC2SC3P-F09MVCX-N8GB9V6-002521Z
NOWPAYMENTS_PUBLIC_KEY=158b1023-85f1-4511-83e1-0dd4dd8659b1
NOWPAYMENTS_IPN_SECRET=CAMBIAR_POR_IPN_SECRET_DE_NOWPAYMENTS
NEXT_PUBLIC_NOWPAYMENTS_PUBLIC_KEY=158b1023-85f1-4511-83e1-0dd4dd8659b1
"@
    Set-Content $envFile -Value $envContent -Encoding UTF8 -NoNewline
    Write-Host "   OK: .env.local actualizado" -ForegroundColor Green
} else {
    Write-Host "   OK: .env.local ya tiene NOWPayments" -ForegroundColor Yellow
}

# ── 2. Route: crear invoice ────────────────────────────────────
$createDir = "$SRC\app\api\payments\nowpayments\create"
New-Item -ItemType Directory -Path $createDir -Force | Out-Null

Set-Content "$createDir\route.ts" -Encoding UTF8 -Value @'
import { NextResponse } from 'next/server'

const NP_API = 'https://api.nowpayments.io/v1'
const API_KEY = process.env.NOWPAYMENTS_API_KEY!

export async function POST(req: Request) {
  try {
    const { user_id, amount_usd, currency = 'usdttrc20' } = await req.json()

    if (!user_id || !amount_usd || amount_usd < 1) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Estimar monto en la crypto elegida
    const estRes = await fetch(
      `${NP_API}/estimate?amount=${amount_usd}&currency_from=usd&currency_to=${currency}`,
      { headers: { 'x-api-key': API_KEY } }
    )
    const est = await estRes.json()

    if (!estRes.ok || !est.estimated_amount) {
      console.error('[nowpayments/create] estimate error:', est)
      return NextResponse.json({ error: 'Error estimando monto' }, { status: 500 })
    }

    // Crear el invoice de pago
    const payRes = await fetch(`${NP_API}/payment`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount:    amount_usd,
        price_currency:  'usd',
        pay_currency:    currency,
        order_id:        `hwa-${user_id}-${Date.now()}`,
        order_description: `HWA Casino — Depósito USD ${amount_usd}`,
        ipn_callback_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hwacasino.vercel.app'}/api/payments/nowpayments/webhook`,
        // Datos extra que vienen en el webhook
        case_sensitive_data: JSON.stringify({ user_id, amount_usd }),
      }),
    })

    const payment = await payRes.json()

    if (!payRes.ok) {
      console.error('[nowpayments/create] payment error:', payment)
      return NextResponse.json({ error: 'Error creando pago' }, { status: 500 })
    }

    return NextResponse.json({
      payment_id:      payment.payment_id,
      pay_address:     payment.pay_address,
      pay_amount:      payment.pay_amount,
      pay_currency:    payment.pay_currency,
      estimated_usd:   amount_usd,
      expires_at:      payment.expiration_estimate_date,
      status:          payment.payment_status,
    })

  } catch (err) {
    console.error('[nowpayments/create] catch:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
'@
Write-Host "   OK: /api/payments/nowpayments/create" -ForegroundColor Green

# ── 3. Route: status (polling desde el frontend) ───────────────
$statusDir = "$SRC\app\api\payments\nowpayments\status"
New-Item -ItemType Directory -Path $statusDir -Force | Out-Null

Set-Content "$statusDir\route.ts" -Encoding UTF8 -Value @'
import { NextResponse } from 'next/server'

const NP_API = 'https://api.nowpayments.io/v1'
const API_KEY = process.env.NOWPAYMENTS_API_KEY!

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const payment_id = searchParams.get('payment_id')

    if (!payment_id) {
      return NextResponse.json({ error: 'payment_id requerido' }, { status: 400 })
    }

    const res = await fetch(`${NP_API}/payment/${payment_id}`, {
      headers: { 'x-api-key': API_KEY },
    })
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: 'Error consultando pago' }, { status: 500 })
    }

    return NextResponse.json({
      payment_id:   data.payment_id,
      status:       data.payment_status,  // waiting / confirming / confirmed / finished / failed / expired
      pay_amount:   data.pay_amount,
      pay_currency: data.pay_currency,
      actually_paid: data.actually_paid ?? 0,
    })

  } catch (err) {
    console.error('[nowpayments/status] catch:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
'@
Write-Host "   OK: /api/payments/nowpayments/status" -ForegroundColor Green

# ── 4. Route: webhook IPN (NOWPayments notifica cuando se confirma) ──
$webhookDir = "$SRC\app\api\payments\nowpayments\webhook"
New-Item -ItemType Directory -Path $webhookDir -Force | Out-Null

Set-Content "$webhookDir\route.ts" -Encoding UTF8 -Value @'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET!

// NOWPayments firma el payload con HMAC-SHA512
function verifySignature(payload: string, signature: string): boolean {
  if (!IPN_SECRET) return true // En dev sin secret, aceptar siempre
  const expected = crypto
    .createHmac('sha512', IPN_SECRET)
    .update(payload)
    .digest('hex')
  return expected === signature
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-nowpayments-sig') ?? ''

    if (!verifySignature(rawBody, signature)) {
      console.error('[nowpayments/webhook] firma inválida')
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }

    const data = JSON.parse(rawBody)
    const { payment_id, payment_status, price_amount, pay_currency, order_id } = data

    console.log(`[nowpayments/webhook] payment_id=${payment_id} status=${payment_status}`)

    // Solo procesar cuando el pago está confirmado
    if (payment_status !== 'finished' && payment_status !== 'confirmed') {
      return NextResponse.json({ received: true, status: payment_status })
    }

    // Extraer user_id del order_id: "hwa-{user_id}-{timestamp}"
    const parts = order_id?.split('-') ?? []
    // order_id format: hwa-{uuid-con-guiones}-{timestamp}
    // uuid tiene 5 partes separadas por -, así que:
    // parts[0] = "hwa"
    // parts[1..5] = uuid
    // parts[6] = timestamp
    const user_id = parts.slice(1, 6).join('-')

    if (!user_id) {
      console.error('[nowpayments/webhook] user_id no encontrado en order_id:', order_id)
      return NextResponse.json({ error: 'user_id inválido' }, { status: 400 })
    }

    // Idempotencia: verificar que no se procesó antes
    const { data: existing } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('reason', `nowpayments:${payment_id}`)
      .single()

    if (existing) {
      console.log('[nowpayments/webhook] pago ya procesado:', payment_id)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Obtener wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user_id)
      .single()

    if (!wallet) {
      console.error('[nowpayments/webhook] wallet no encontrada para user_id:', user_id)
      return NextResponse.json({ error: 'Wallet no encontrada' }, { status: 404 })
    }

    const amount = parseFloat(price_amount as string)
    const newBalance = (wallet.balance ?? 0) + amount

    // Actualizar balance
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', user_id)

    if (updateError) {
      console.error('[nowpayments/webhook] error actualizando wallet:', updateError)
      return NextResponse.json({ error: 'Error actualizando wallet' }, { status: 500 })
    }

    // Registrar transacción
    await supabase.from('wallet_transactions').insert({
      user_id,
      type:          'credit',
      amount:        Math.round(amount),
      balance_after: newBalance,
      reason:        `nowpayments:${payment_id}`,
    })

    console.log(`[nowpayments/webhook] ✓ Acreditado USD ${amount} a user ${user_id}. Nuevo balance: ${newBalance}`)

    return NextResponse.json({ received: true, credited: amount })

  } catch (err) {
    console.error('[nowpayments/webhook] catch:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
'@
Write-Host "   OK: /api/payments/nowpayments/webhook" -ForegroundColor Green

# ── 5. Hook useNowPayments ─────────────────────────────────────
$hooksDir = "$SRC\hooks"
New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null

Set-Content "$hooksDir\useNowPayments.ts" -Encoding UTF8 -Value @'
import { useState, useRef, useCallback } from 'react'

export type NowPaymentStatus =
  | 'idle'
  | 'creating'
  | 'waiting'       // Esperando que el usuario envíe
  | 'confirming'    // Red confirmando
  | 'finished'      // Acreditado
  | 'failed'
  | 'expired'
  | 'error'

export interface NowPaymentInvoice {
  payment_id:    string
  pay_address:   string
  pay_amount:    number
  pay_currency:  string
  estimated_usd: number
  expires_at:    string
}

export function useNowPayments(userId: string | null) {
  const [status, setStatus]   = useState<NowPaymentStatus>('idle')
  const [invoice, setInvoice] = useState<NowPaymentInvoice | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const pollRef               = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const createPayment = useCallback(async (amountUsd: number, currency = 'usdttrc20') => {
    if (!userId) return
    setStatus('creating')
    setError(null)
    setInvoice(null)
    stopPolling()

    try {
      const res = await fetch('/api/payments/nowpayments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, amount_usd: amountUsd, currency }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setError(data.error ?? 'Error creando pago')
        return
      }

      setInvoice(data)
      setStatus('waiting')

      // Polling cada 10 segundos
      pollRef.current = setInterval(async () => {
        try {
          const sRes = await fetch(`/api/payments/nowpayments/status?payment_id=${data.payment_id}`)
          const sData = await sRes.json()
          const s: NowPaymentStatus = sData.status as NowPaymentStatus

          if (s === 'finished' || s === 'confirmed') {
            setStatus('finished')
            stopPolling()
          } else if (s === 'failed' || s === 'expired') {
            setStatus(s)
            stopPolling()
          } else if (s === 'confirming') {
            setStatus('confirming')
          }
        } catch { /* ignorar errores de red en polling */ }
      }, 10_000)

    } catch (err) {
      console.error('[useNowPayments]', err)
      setStatus('error')
      setError('Error de conexión')
    }
  }, [userId, stopPolling])

  const reset = useCallback(() => {
    stopPolling()
    setStatus('idle')
    setInvoice(null)
    setError(null)
  }, [stopPolling])

  return { status, invoice, error, createPayment, reset }
}
'@
Write-Host "   OK: hooks/useNowPayments.ts" -ForegroundColor Green

# ── 6. Componente NowPaymentsWidget ───────────────────────────
$compDir = "$SRC\components"
New-Item -ItemType Directory -Path $compDir -Force | Out-Null

Set-Content "$compDir\NowPaymentsWidget.tsx" -Encoding UTF8 -Value @'
'use client'
import { useState } from 'react'
import { useNowPayments } from '@/hooks/useNowPayments'

const GOLD = '#D4AF37'

const AMOUNTS = [1, 5, 10, 25, 50, 100, 250, 500, 1000]

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
            <div style={{ color: '#4ade80', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.2rem' }}>
              ✓ Depósito acreditado — Chip-$ {invoice.estimated_usd.toLocaleString('es-UY')}
            </div>
          ) : status === 'confirming' ? (
            <div style={{ color: GOLD, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1rem' }}>
              ⏳ Confirmando en la red...
            </div>
          ) : status === 'expired' || status === 'failed' ? (
            <div style={{ color: '#f87171', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1rem' }}>
              ✕ {status === 'expired' ? 'Expirado' : 'Fallido'} — intentá de nuevo
            </div>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '0.9rem' }}>
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
              <div style={{ color: GOLD, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.4rem' }}>
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
                onClick={copyAddress}
                style={{
                  marginTop: 8, width: '100%', padding: '8px',
                  background: copied ? 'rgba(74,222,128,0.1)' : 'rgba(212,175,55,0.1)',
                  border: `1px solid ${copied ? '#4ade80' : 'rgba(212,175,55,0.3)'}`,
                  borderRadius: 4, color: copied ? '#4ade80' : GOLD,
                  fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '0.9rem',
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
            onClick={reset}
            style={{
              padding: '10px', background: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.3)', borderRadius: 4,
              color: GOLD, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
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
              onClick={() => setCurrency(c.id)}
              style={{
                padding: '5px 12px', borderRadius: 4, cursor: 'pointer',
                background: currency === c.id ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${currency === c.id ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: currency === c.id ? GOLD : 'rgba(255,255,255,0.5)',
                fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '0.85rem',
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
              onClick={() => { setAmount(a); setCustom('') }}
              style={{
                padding: '8px 4px', borderRadius: 4, cursor: 'pointer',
                background: amount === a && !custom ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${amount === a && !custom ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: amount === a && !custom ? GOLD : 'rgba(255,255,255,0.5)',
                fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '0.9rem',
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
            fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1rem',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: '#f87171', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Botón generar */}
      <button
        onClick={handleCreate}
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
          fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
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
'@
Write-Host "   OK: components/NowPaymentsWidget.tsx" -ForegroundColor Green

# ── 7. Agregar NEXT_PUBLIC_SITE_URL al .env.local si no existe ─
$envContent2 = Get-Content $envFile -Raw -Encoding UTF8
if (-not $envContent2.Contains("NEXT_PUBLIC_SITE_URL")) {
    $envContent2 += "`nNEXT_PUBLIC_SITE_URL=http://localhost:3000"
    Set-Content $envFile -Value $envContent2 -Encoding UTF8 -NoNewline
    Write-Host "   OK: NEXT_PUBLIC_SITE_URL agregado (cambiar en Vercel a la URL real)" -ForegroundColor Yellow
}

# ── 8. Commit ──────────────────────────────────────────────────
Set-Location $ROOT
git add .
git commit -m "feat: NOWPayments integration — create/status/webhook + NowPaymentsWidget"
Write-Host "   OK: commit creado" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " LISTO. Pasos manuales restantes:" -ForegroundColor Cyan
Write-Host "============================================"
Write-Host " 1. NOWPayments Dashboard → Settings → IPN Secret"
Write-Host "    Copiar y reemplazar CAMBIAR_POR_IPN_SECRET_DE_NOWPAYMENTS en .env.local"
Write-Host ""
Write-Host " 2. NOWPayments Dashboard → Store Settings"
Write-Host "    Webhook URL: https://TU-DOMINIO.vercel.app/api/payments/nowpayments/webhook"
Write-Host ""
Write-Host " 3. En Vercel → Environment Variables:"
Write-Host "    NOWPAYMENTS_API_KEY    = SC2SC3P-F09MVCX-N8GB9V6-002521Z"
Write-Host "    NOWPAYMENTS_IPN_SECRET = (el que copiaste del paso 1)"
Write-Host "    NEXT_PUBLIC_SITE_URL   = https://TU-DOMINIO.vercel.app"
Write-Host ""
Write-Host " 4. Integrar NowPaymentsWidget en PaymentModal:"
Write-Host "    import { NowPaymentsWidget } from '@/components/NowPaymentsWidget'"
Write-Host "    Agregar tab Crypto en el modal existente"
Write-Host "============================================"
