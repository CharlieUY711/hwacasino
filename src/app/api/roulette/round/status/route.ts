import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]

function getColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green'
  return RED_NUMBERS.includes(n) ? 'red' : 'black'
}

function calcPayout(bet: string, value: string, result: number, amount: number): number {
  const color = getColor(result)
  switch (bet) {
    case 'number':
      return parseInt(value) === result ? amount * 35 : 0
    case 'color':
      return value === color ? amount : 0
    case 'parity':
      if (result === 0) return 0
      return (value === 'even' ? result % 2 === 0 : result % 2 !== 0) ? amount : 0
    case 'dozen': {
      const dozens: Record<string, [number, number]> = { '1': [1, 12], '2': [13, 24], '3': [25, 36] }
      const [lo, hi] = dozens[value]
      return result >= lo && result <= hi ? amount * 2 : 0
    }
    case 'column': {
      const cols: Record<string, number[]> = {
        '1': [1,4,7,10,13,16,19,22,25,28,31,34],
        '2': [2,5,8,11,14,17,20,23,26,29,32,35],
        '3': [3,6,9,12,15,18,21,24,27,30,33,36],
      }
      return cols[value]?.includes(result) ? amount * 2 : 0
    }
    case 'half':
      if (result === 0) return 0
      return (value === 'low' ? result <= 18 : result > 18) ? amount : 0
    default:
      return 0
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, bet_type, bet_value, amount } = await req.json()

    if (!user_id || !bet_type || !bet_value || !amount || amount <= 0) {
      return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
    }

    // 1. Debitar balance + crear registro en bets (atómico via RPC)
    const { data: betId, error: betError } = await supabase
      .rpc('place_bet', { p_user_id: user_id, p_game: 'roulette', p_amount: amount })

    if (betError) {
      const msg = betError.message.includes('insufficient') ? 'insufficient_balance' : betError.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // 2. RNG seguro server-side
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    const result = array[0] % 37

    // 3. Calcular payout
    const payout = calcPayout(bet_type, bet_value, result, amount)

    // 4. Resolver apuesta (credit atómico)
    await supabase.rpc('resolve_bet', { p_bet_id: betId, p_payout: payout })

    // 5. Actualizar bet con resultado
    await supabase
      .from('bets')
      .update({
        game: 'roulette',
        choice: `${bet_type}:${bet_value}`,
        result_number: result,
      })
      .eq('id', betId)

    return NextResponse.json({
      result,
      color: getColor(result),
      payout,
      won: payout > 0,
    })

  } catch (err) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
