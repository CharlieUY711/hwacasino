import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const user_id  = searchParams.get('user_id')
    const from     = searchParams.get('from')
    const to       = searchParams.get('to')

    if (!user_id) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 })

    // Wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance, balances, updated_at')
      .eq('user_id', user_id)
      .single()

    // Transacciones con filtro de fecha
    let query = supabase
      .from('wallet_transactions')
      .select('id, type, amount, currency, game, created_at, metadata')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (from) query = query.gte('created_at', from)
    if (to)   query = query.lte('created_at', to + 'T23:59:59Z')

    const { data: txs } = await query

    // Calcular estadisticas
    const wins     = txs?.filter(t => t.type === 'win'  || t.type === 'credit') ?? []
    const losses   = txs?.filter(t => t.type === 'loss' || t.type === 'debit')  ?? []
    const deposits = txs?.filter(t => t.type === 'deposit') ?? []

    const totalWon      = wins.reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    const totalLost     = losses.reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    const totalDeposits = deposits.reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    const netResult     = totalWon - totalLost

    return NextResponse.json({
      balance:       wallet?.balance ?? 0,
      balances:      wallet?.balances ?? {},
      totalWon,
      totalLost,
      totalDeposits,
      netResult,
      txCount:       txs?.length ?? 0,
      transactions:  txs ?? [],
    })

  } catch (err) {
    console.error('[user/stats]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
