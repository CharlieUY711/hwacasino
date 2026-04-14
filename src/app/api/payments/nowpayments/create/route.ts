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
        order_description: `HWA Casino — Depósito USD ${amount_usd} — uid:${user_id}`,
        ipn_callback_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hwacasino.vercel.app'}/api/payments/nowpayments/webhook`,
        // Datos extra que vienen en el webhook
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

