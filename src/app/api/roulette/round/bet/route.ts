import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/rouletteEngine'

export async function POST(req: NextRequest) {
  const { user_id, round_id, bets } = await req.json()

  if (!user_id || !round_id || !bets?.length) {
    return NextResponse.json({ error: 'Faltan parametros' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Verificar que la ronda existe y esta en betting
  const { data: round } = await supabase
    .from('roulette_rounds')
    .select('id, status, closes_at')
    .eq('id', round_id)
    .single()

  if (!round || round.status !== 'betting') {
    return NextResponse.json({ error: 'La ventana de apuestas cerro' }, { status: 409 })
  }

  if (new Date(round.closes_at) <= new Date()) {
    return NextResponse.json({ error: 'La ventana de apuestas cerro' }, { status: 409 })
  }

  // Verificar que el usuario no aposto ya en esta ronda
  const { data: existing } = await supabase
    .from('round_bets')
    .select('id')
    .eq('round_id', round_id)
    .eq('user_id', user_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Ya apostaste en esta ronda' }, { status: 409 })
  }

  // Debitar y registrar cada apuesta via place_bet RPC
  const placedBets: Array<{
    bet_type: string
    bet_value: string
    amount: number
    bet_id: string
  }> = []

  for (const bet of bets) {
    const { data: bet_id, error } = await supabase.rpc('place_bet', {
      p_user_id: user_id,
      p_game: 'roulette',
      p_amount: bet.amount,
    })

    if (error || !bet_id) {
      return NextResponse.json(
        { error: 'Saldo insuficiente o error al registrar apuesta' },
        { status: 400 }
      )
    }

    placedBets.push({ ...bet, bet_id })
  }

  // Guardar todas las apuestas en round_bets
  const { error: insertError } = await supabase.from('round_bets').insert({
    round_id,
    user_id,
    bets: placedBets,
    resolved: false,
  })

  if (insertError) {
    return NextResponse.json({ error: 'Error al guardar apuestas' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, bets_placed: placedBets.length })
}