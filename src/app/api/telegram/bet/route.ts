import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function verifySecret(req: NextRequest): boolean {
  return req.headers.get('x-telegram-secret') === process.env.TELEGRAM_BOT_SECRET
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { telegram_id, bet_amount, bet_type, bet_value, result_number, won, payout } =
    await req.json()

  if (!telegram_id || !bet_amount || !bet_type || result_number === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = getSupabase()

  // 1. Resolver user_id desde telegram_id
  const profile = await db
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegram_id)
    .maybeSingle()

  if (!profile.data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const user_id = profile.data.id

  // 2. Verificar balance antes de debitar
  const wallet = await db
    .from('wallets')
    .select('balance')
    .eq('user_id', user_id)
    .single()

  if (!wallet.data || wallet.data.balance < bet_amount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  // 3. Debitar apuesta (atomico via RPC)
  const debitRes = await db.rpc('increment_wallet_balance', {
    p_user_id: user_id,
    p_amount:  -bet_amount,
  })

  if (debitRes.error) {
    return NextResponse.json({ error: 'Debit failed', detail: debitRes.error.message }, { status: 500 })
  }

  // 4. Acreditar payout si gano
  if (won && payout > 0) {
    await db.rpc('increment_wallet_balance', {
      p_user_id: user_id,
      p_amount:  payout,
    })
  }

  // 5. Registrar apuesta en bets
  await db.from('bets').insert({
    user_id,
    game:          'roulette',
    amount:        bet_amount,
    payout:        payout ?? 0,
    status:        won ? 'won' : 'lost',
    choice:        bet_value ? `${bet_type}:${bet_value}` : bet_type,
    result_number,
  })

  // 6. Registrar transacciones
  await db.from('transactions').insert({
    user_id,
    type:      'bet',
    amount:    bet_amount,
    direction: 'debit',
    metadata:  { game: 'roulette', result: result_number, platform: 'telegram' },
  })

  if (won && payout > 0) {
    await db.from('transactions').insert({
      user_id,
      type:      'payout',
      amount:    payout,
      direction: 'credit',
      metadata:  { game: 'roulette', result: result_number, platform: 'telegram' },
    })
  }

  // 7. Balance actualizado
  const updated = await db
    .from('wallets')
    .select('balance')
    .eq('user_id', user_id)
    .single()

  return NextResponse.json({
    ok:          true,
    new_balance: updated.data?.balance ?? 0,
  })
}

