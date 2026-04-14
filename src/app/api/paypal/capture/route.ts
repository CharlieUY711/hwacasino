import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAccessToken() {
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(
        `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
      ).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  return data.access_token as string
}

export async function POST(req: Request) {
  try {
    const { order_id } = await req.json()
    if (!order_id) return NextResponse.json({ error: 'order_id requerido' }, { status: 400 })

    const token = await getAccessToken()

    // Capturar el pago en PayPal
    const res = await fetch(`${BASE}/v2/checkout/orders/${order_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await res.json()
    if (!res.ok || data.status !== 'COMPLETED') {
      console.error('[paypal/capture]', data)
      return NextResponse.json({ error: 'Pago no completado' }, { status: 400 })
    }

    // Extraer datos del pago
    const unit      = data.purchase_units[0]
    const capture   = unit.payments.captures[0]
    const amount    = parseFloat(capture.amount.value)
    const user_id   = unit.custom_id
    const paypal_id = capture.id

    // Verificar que no se procesó antes (idempotencia)
    const { data: existing } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('reference_id', paypal_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Pago ya procesado' }, { status: 409 })
    }

    // Obtener wallet actual
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balances')
      .eq('user_id', user_id)
      .single()

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet no encontrada' }, { status: 404 })
    }

    const currentUSD   = parseFloat(wallet.balances?.USD ?? 0)
    const newUSD       = currentUSD + amount
    const newBalances  = { ...wallet.balances, USD: newUSD }

    // Actualizar wallet
    await supabase
      .from('wallets')
      .update({ balances: newBalances, updated_at: new Date().toISOString() })
      .eq('user_id', user_id)

    // Registrar transacción
    await supabase
      .from('wallet_transactions')
      .insert({
        user_id,
        wallet_id:      wallet.id,
        currency:       'USD',
        amount,
        balance_before: currentUSD,
        balance_after:  newUSD,
        type:           'deposit',
        reference_id:   paypal_id,
        metadata: {
          method:   'paypal',
          order_id,
          paypal_capture_id: paypal_id,
        },
      })

    return NextResponse.json({
      success:      true,
      amount_usd:   amount,
      new_balance:  newUSD,
      currency:     'USD',
    })

  } catch (err) {
    console.error('[paypal/capture] catch', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

