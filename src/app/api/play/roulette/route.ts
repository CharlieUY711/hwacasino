// app/api/play/roulette/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Bet = {
  bet_type: string
  bet_value: string
  amount: number
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { user_id, bets, currency = 'CHIPS' } = body as { user_id: string; bets: Bet[]; currency?: string }

    if (!user_id || !Array.isArray(bets) || bets.length === 0) {
      return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
    }

    for (const bet of bets) {
      if (!bet.bet_type || !bet.bet_value || typeof bet.amount !== 'number' || bet.amount <= 0) {
        return NextResponse.json({ error: 'Apuesta malformada' }, { status: 400 })
      }
    }

    const { data, error } = await supabase.rpc('play_roulette', {
      p_user_id:  user_id,
      p_bets:     bets,
      p_currency: currency,
    })

    if (error) {
      const msg = error.message ?? ''
      if (msg.includes('insufficient_balance')) {
        return NextResponse.json({ error: 'insufficient_balance' }, { status: 400 })
      }
      if (msg.includes('wallet_not_found')) {
        return NextResponse.json({ error: 'wallet_not_found' }, { status: 404 })
      }
      console.error('[play/roulette]', error)
      return NextResponse.json({ error: 'Error al procesar la apuesta' }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (err) {
    console.error('[play/roulette] catch', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

