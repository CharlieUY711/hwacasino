// src/app/api/paypal/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const MIN_USD = 10
const MAX_USD = 1000

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
    const { user_id, amount_usd } = await req.json()

    if (!user_id || !amount_usd) {
      return NextResponse.json({ error: 'Faltan parametros' }, { status: 400 })
    }

    const usd = Number(amount_usd)
    if (isNaN(usd) || usd < MIN_USD || usd > MAX_USD) {
      return NextResponse.json(
        { error: `El monto debe estar entre $${MIN_USD} y $${MAX_USD} USD` },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const supabase = getSupabase()
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Crear order en PayPal
    const token   = await getPayPalToken()
    const nectar  = usd * 1000

    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: usd.toFixed(2),
          },
          description: `HWA Casino — ${nectar.toLocaleString('es-UY')} Nectar`,
          custom_id: user_id,
        }],
        application_context: {
          brand_name:          'HWA Casino',
          landing_page:        'NO_PREFERENCE',
          user_action:         'PAY_NOW',
          return_url:          `${process.env.NEXT_PUBLIC_APP_URL}/deposit/success`,
          cancel_url:          `${process.env.NEXT_PUBLIC_APP_URL}/deposit`,
        },
      }),
    })

    if (!orderRes.ok) {
      const err = await orderRes.json()
      console.error('PayPal order error:', err)
      return NextResponse.json({ error: 'Error creando orden PayPal' }, { status: 500 })
    }

    const order = await orderRes.json()

    // Registrar depósito pendiente en Supabase
    const { error: insertError } = await supabase
      .from('deposits')
      .insert({
        user_id,
        platform:        'web',
        paypal_order_id: order.id,
        amount_usd:      usd,
        nectar_amount:   nectar,
        status:          'pending',
      })

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return NextResponse.json({ error: 'Error registrando deposito' }, { status: 500 })
    }

    return NextResponse.json({
      order_id:   order.id,
      nectar,
      amount_usd: usd,
    })

  } catch (err) {
    console.error('create-order error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
