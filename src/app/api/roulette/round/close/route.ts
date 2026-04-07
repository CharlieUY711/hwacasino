import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabase,
  secureRandomIndex,
  WHEEL_ORDER,
  calculatePayout,
} from '@/lib/rouletteEngine'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { round_id } = await req.json()
  if (!round_id) {
    return NextResponse.json({ error: 'round_id requerido' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { data: round } = await supabase
    .from('roulette_rounds')
    .select('*')
    .eq('id', round_id)
    .single()

  // Idempotente: si ya esta cerrada, no hacer nada
  if (!round || round.status === 'closed') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const winningIndex = secureRandomIndex()
  const winningNumber = WHEEL_ORDER[winningIndex]

  await supabase
    .from('roulette_rounds')
    .update({ status: 'spinning', winning_index: winningIndex, winning_number: winningNumber })
    .eq('id', round_id)

  const { data: roundBets } = await supabase
    .from('round_bets')
    .select('*')
    .eq('round_id', round_id)
    .eq('resolved', false)

  if (roundBets && roundBets.length > 0) {
    for (const rb of roundBets) {
      const bets = rb.bets as Array<{
        bet_type: string
        bet_value: string
        amount: number
        bet_id: string
      }>
      for (const bet of bets) {
        const payout = calculatePayout(bet.bet_type, bet.bet_value, bet.amount, winningNumber)
        await supabase.rpc('resolve_bet', { p_bet_id: bet.bet_id, p_payout: payout })
      }
      await supabase.from('round_bets').update({ resolved: true }).eq('id', rb.id)
    }
  }

  await supabase
    .from('roulette_rounds')
    .update({ status: 'closed' })
    .eq('id', round_id)

  return NextResponse.json({
    ok: true,
    winning_number: winningNumber,
    winning_index: winningIndex,
  })
}
