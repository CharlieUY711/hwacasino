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

