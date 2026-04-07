// src/app/api/paypal/capture/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getPayPalToken(): Promise<string> {
  const clientId     = process.env.PAYPAL_CLIENT_ID!
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error('No se pudo obtener token PayPal')
  const data = await res.json()
  return data.access_token
}

export async function POST(req: NextRequest) {
  try {
    const { order_id } = await req.json()

    if (!order_id) {
      return NextResponse.json({ error: 'Falta order_id' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Buscar el depósito pendiente
    const { data: deposit, error: fetchError } = await supabase
      .from('deposits')
      .select('*')
      .eq('paypal_order_id', order_id)
      .eq('status', 'pending')
      .single()

    if (fetchError || !deposit) {
      return NextResponse.json({ error: 'Deposito no encontrado o ya procesado' }, { status: 404 })
    }

    // Capturar el pago en PayPal
    const token      = await getPayPalToken()
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
    })

    if (!captureRes.ok) {
      const err = await captureRes.json()
      console.error('PayPal capture error:', err)
      return NextResponse.json({ error: 'Error capturando pago PayPal' }, { status: 500 })
    }

    const capture     = await captureRes.json()
    const captureStatus = capture.status

    if (captureStatus !== 'COMPLETED') {
      return NextResponse.json(
        { error: `Pago no completado: ${captureStatus}` },
        { status: 400 }
      )
    }

    // Acreditar Nectar en el wallet — operacion atomica
    const { error: walletError } = await supabase.rpc('increment_wallet_balance', {
      p_user_id: deposit.user_id,
      p_amount:  deposit.nectar_amount,
    })

    if (walletError) {
      console.error('Wallet credit error:', walletError)
      // Marcar como error para revision manual
      await supabase
        .from('deposits')
        .update({ status: 'error' })
        .eq('paypal_order_id', order_id)
      return NextResponse.json({ error: 'Error acreditando Nectar' }, { status: 500 })
    }

    // Registrar transaccion
    await supabase.from('transactions').insert({
      user_id:      deposit.user_id,
      type:         'deposit',
      amount:       deposit.nectar_amount,
      direction:    'credit',
      reference_id: order_id,
      metadata:     { platform: 'web', amount_usd: deposit.amount_usd, paypal_order_id: order_id },
    })

    // Marcar depósito como completado
    await supabase
      .from('deposits')
      .update({
        status:       'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('paypal_order_id', order_id)

    return NextResponse.json({
      success:      true,
      nectar_added: deposit.nectar_amount,
      amount_usd:   deposit.amount_usd,
    })

  } catch (err) {
    console.error('capture error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

