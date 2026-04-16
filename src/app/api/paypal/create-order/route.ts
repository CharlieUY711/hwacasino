import { NextResponse } from 'next/server'

const BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

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
    const { user_id, amount_usd, chips, return_url, cancel_url } = await req.json()

    if (!user_id || !amount_usd || amount_usd < 0.5) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const token = await getAccessToken()

    const res = await fetch(`${BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: amount_usd.toFixed(2),
          },
          description: `HWA Casino — Carga de saldo USD ${amount_usd}`,
          custom_id: user_id,
        }],
        application_context: {
          brand_name: 'HWA Casino',
          user_action: 'PAY_NOW',
        },
      }),
    })

    const order = await res.json()
    if (!res.ok) {
      console.error('[paypal/create-order]', JSON.stringify(order))
      return NextResponse.json({ error: 'Error creando orden PayPal', detail: order }, { status: 500 })
    }

    return NextResponse.json({ order_id: order.id })

  } catch (err) {
    console.error('[paypal/create-order] catch', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}



