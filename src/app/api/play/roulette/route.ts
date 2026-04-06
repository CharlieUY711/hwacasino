import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26]
const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])

function getColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green'
  return RED_NUMBERS.has(n) ? 'red' : 'black'
}

// Un solo RNG por ronda - distribucion uniforme perfecta
function secureRandomIndex(): number {
  const max = Math.floor(0xFFFFFFFF / 37) * 37
  let value: number
  do {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    value = array[0]
  } while (value >= max)
  return value % 37
}

function calcPayout(betType: string, betValue: string, result: number, amount: number): number {
  const color = getColor(result)
  switch (betType) {
    case 'number':
      return parseInt(betValue) === result ? amount * 35 : 0
    case 'color':
      return betValue === color ? amount : 0
    case 'parity':
      if (result === 0) return 0
      return (betValue === 'even' ? result % 2 === 0 : result % 2 !== 0) ? amount : 0
    case 'dozen': {
      const dozens: Record<string, [number, number]> = { '1': [1,12], '2': [13,24], '3': [25,36] }
      const [lo, hi] = dozens[betValue]
      return result >= lo && result <= hi ? amount * 2 : 0
    }
    case 'column': {
      const cols: Record<string, number[]> = {
        '1': [1,4,7,10,13,16,19,22,25,28,31,34],
        '2': [2,5,8,11,14,17,20,23,26,29,32,35],
        '3': [3,6,9,12,15,18,21,24,27,30,33,36],
      }
      return cols[betValue]?.includes(result) ? amount * 2 : 0
    }
    case 'half':
      if (result === 0) return 0
      return (betValue === 'low' ? result <= 18 : result > 18) ? amount : 0
    case 'split2': {
      const nums = betValue.split('-').map(Number)
      return nums.includes(result) ? amount * 17 : 0
    }
    case 'split4': {
      const nums = betValue.split('-').map(Number)
      return nums.includes(result) ? amount * 8 : 0
    }
    default:
      return 0
  }
}

type BetInput = { bet_type: string; bet_value: string; amount: number }

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    const { user_id, bets } = body as { user_id: string; bets: BetInput[] }

    if (!user_id || !Array.isArray(bets) || bets.length === 0) {
      return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
    }

    // Validar cada apuesta
    for (const bet of bets) {
      if (!bet.bet_type || !bet.bet_value || !bet.amount || bet.amount <= 0) {
        return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
      }
    }

    const supabase = getSupabase()

    // 1. UN SOLO RNG para toda la ronda
    const winningIndex  = secureRandomIndex()
    const winningNumber = WHEEL_ORDER[winningIndex]
    const winningColor  = getColor(winningNumber)

    // 2. Procesar cada apuesta: debitar, calcular payout, acreditar
    let totalPayout = 0
    let anyWon = false

    for (const bet of bets) {
      // Debitar balance atomicamente
      const { data: betId, error: betError } = await supabase
        .rpc('place_bet', { p_user_id: user_id, p_game: 'roulette', p_amount: bet.amount })

      if (betError) {
        const msg = betError.message.includes('insufficient') ? 'insufficient_balance' : betError.message
        return NextResponse.json({ error: msg }, { status: 400 })
      }

      // Calcular payout con el numero ganador de esta ronda
      const payout = calcPayout(bet.bet_type, bet.bet_value, winningNumber, bet.amount)

      // Acreditar payout
      await supabase.rpc('resolve_bet', { p_bet_id: betId, p_payout: payout })

      // Registrar detalle
      await supabase.from('bets').update({
        choice: `${bet.bet_type}:${bet.bet_value}`,
        result_number: winningNumber,
      }).eq('id', betId)

      totalPayout += payout
      if (payout > 0) anyWon = true
    }

    return NextResponse.json({
      index:  winningIndex,
      number: winningNumber,
      color:  winningColor,
      payout: totalPayout,
      won:    anyWon,
    })

  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
