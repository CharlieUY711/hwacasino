import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabase,
  ROUND_DURATION_SECONDS,
  secureRandomIndex,
  WHEEL_ORDER,
  calculatePayout,
} from '@/lib/rouletteEngine'

async function closeRound(
  supabase: ReturnType<typeof getSupabase>,
  round: { id: string; room_id: string }
) {
  const winningIndex = secureRandomIndex()
  const winningNumber = WHEEL_ORDER[winningIndex]

  await supabase
    .from('roulette_rounds')
    .update({ status: 'spinning', winning_index: winningIndex, winning_number: winningNumber })
    .eq('id', round.id)

  const { data: roundBets } = await supabase
    .from('round_bets')
    .select('*')
    .eq('round_id', round.id)
    .eq('resolved', false)

  if (roundBets && roundBets.length > 0) {
    for (const rb of roundBets) {
      const bets = rb.bets as Array<{ bet_type: string; bet_value: string; amount: number; bet_id: string }>
      for (const bet of bets) {
        const payout = calculatePayout(bet.bet_type, bet.bet_value, bet.amount, winningNumber)
        await supabase.rpc('resolve_bet', { p_bet_id: bet.bet_id, p_payout: payout })
      }
      await supabase.from('round_bets').update({ resolved: true }).eq('id', rb.id)
    }
  }

  await supabase.from('roulette_rounds').update({ status: 'closed' }).eq('id', round.id)
  return { winningIndex, winningNumber }
}

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room') ?? 'vip-1'
  const supabase = getSupabase()
  const now = new Date()

  let { data: round } = await supabase
    .from('roulette_rounds')
    .select('*')
    .eq('room_id', room)
    .in('status', ['betting', 'spinning'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (round && round.status === 'betting' && new Date(round.closes_at) <= now) {
    await closeRound(supabase, round)
    const { data: updated } = await supabase.from('roulette_rounds').select('*').eq('id', round.id).single()
    round = updated
  }

  if (!round || round.status === 'closed') {
    const closesAt = new Date(now.getTime() + ROUND_DURATION_SECONDS * 1000)
    const { data: newRound } = await supabase
      .from('roulette_rounds')
      .insert({ room_id: room, status: 'betting', closes_at: closesAt.toISOString() })
      .select()
      .single()
    round = newRound
  }

  const secondsRemaining = Math.max(0, Math.floor((new Date(round.closes_at).getTime() - now.getTime()) / 1000))

  return NextResponse.json({
    round_id: round.id,
    room_id: round.room_id,
    status: round.status,
    closes_at: round.closes_at,
    seconds_remaining: secondsRemaining,
    winning_number: round.winning_number ?? null,
    winning_index: round.winning_index ?? null,
  })
}
