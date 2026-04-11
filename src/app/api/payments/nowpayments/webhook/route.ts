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
