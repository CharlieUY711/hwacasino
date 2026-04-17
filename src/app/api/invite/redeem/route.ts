import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { invite_id, user_id } = await req.json()
    if (!invite_id || !user_id) return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })

    const { data: invite } = await supabase.from('invites').select('bonus_chips, used_count').eq('id', invite_id).single()
    if (!invite) return NextResponse.json({ error: 'Invite no encontrado' }, { status: 404 })

    const { data: wallet } = await supabase.from('wallets').select('id, balances').eq('user_id', user_id).single()
    if (!wallet) return NextResponse.json({ error: 'Wallet no encontrada' }, { status: 404 })

    const chips = invite.bonus_chips ?? 0
    const currentChips = wallet.balances?.CHIPS ?? 0
    const newChips = currentChips + chips

    await supabase.from('wallets').update({
      balances: { ...wallet.balances, CHIPS: newChips }
    }).eq('user_id', user_id)

    await supabase.from('invites').update({
      used_count: (invite.used_count ?? 0) + 1
    }).eq('id', invite_id)

    if (chips > 0) {
      await supabase.from('wallet_transactions').insert({
        user_id,
        wallet_id: wallet.id,
        type: 'credit',
        currency: 'CHIPS',
        amount: chips,
        balance_before: currentChips,
        balance_after: newChips,
        metadata: { reason: 'invite_code', invite_id },
        status: 'completed',
      })
    }

    return NextResponse.json({ success: true, chips_credited: chips, new_balance: newChips })
  } catch (err) {
    console.error('[invite/redeem]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
