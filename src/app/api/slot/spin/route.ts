
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runSpin, defaultWeights } from '@/lib/slot/engine'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { user_id, bet, is_free_spin = false } = await req.json()
    if (!user_id || !bet || bet < 1)
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })

    const { data: wallet } = await supabase
      .from('wallets').select('id, balances').eq('user_id', user_id).single()
    if (!wallet)
      return NextResponse.json({ error: 'Wallet no encontrada' }, { status: 404 })

    const balance = Number(wallet.balances?.CHIPS ?? 0)
    const effectiveBet = is_free_spin ? 0 : bet

    if (!is_free_spin && balance < bet)
      return NextResponse.json({ error: 'Saldo insuficiente', code: 'INSUFFICIENT_FUNDS' }, { status: 402 })

    const { data: cfg } = await supabase
      .from('slot_configs').select('symbol_weights').eq('game_id', 'hwa-5x5').single()

    const weights = cfg?.symbol_weights && Object.keys(cfg.symbol_weights).length > 0
      ? cfg.symbol_weights : defaultWeights()

    const result = runSpin(weights, bet)
    const netChips  = result.totalWin - effectiveBet
    const newBalance = balance + netChips

    await supabase.from('wallets')
      .update({ balances: { ...wallet.balances, CHIPS: newBalance } })
      .eq('id', wallet.id)

    if (netChips !== 0) {
      await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id, user_id,
        type: result.totalWin > 0 ? 'win' : 'bet',
        currency: 'CHIPS', amount: netChips,
        description: is_free_spin ? 'Slot free spin' : 'Slot spin bet: '+bet,
        metadata: { game_id:'hwa-5x5', bet, win:result.totalWin, cascades:result.cascades.length, is_free_spin }
      })
    }

    await supabase.from('slot_spins').insert({
      user_id, game_id:'hwa-5x5',
      bet_chips: effectiveBet, win_chips: result.totalWin,
      grid: result.grid, wins: result.wins, cascade_steps: result.cascades,
      cascade_count: result.cascades.length,
      max_multiplier: result.cascades.length > 0 ? result.cascades[result.cascades.length-1].multiplier : 1,
      scatter_count: result.scatterCount, is_free_spin,
      free_spins_triggered: result.freeSpinsTriggered,
      balance_before: balance, balance_after: newBalance
    })

    return NextResponse.json({ ...result, balanceBefore:balance, balanceAfter:newBalance, netChips })
  } catch (e: any) {
    console.error('[slot/spin]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
