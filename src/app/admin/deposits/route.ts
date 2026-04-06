import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/admin/deposits
// body: { depositId: string, action: 'complete' | 'cancel' }
// Permite al admin completar manualmente un deposito pendiente
// (util para cuando el webhook de PayPal falla o en modo sandbox)
export async function POST(req: NextRequest) {
  const { depositId, action } = await req.json()
  if (!depositId || !action) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Obtener el deposito
  const { data: deposit, error: fetchError } = await supabase
    .from('deposits')
    .select('*')
    .eq('id', depositId)
    .single()

  if (fetchError || !deposit) {
    return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
  }

  if (deposit.status !== 'pending') {
    return NextResponse.json({ error: 'Deposit is not pending' }, { status: 400 })
  }

  if (action === 'complete') {
    // Acreditar Nectar via RPC atomica
    const { error: rpcError } = await supabase.rpc('increment_wallet_balance', {
      p_user_id: deposit.user_id,
      p_amount: deposit.nectar_amount,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    // Registrar transaccion
    await supabase.from('transactions').insert({
      user_id: deposit.user_id,
      type: 'deposit',
      amount: deposit.nectar_amount,
      direction: 'credit',
      reference_id: deposit.paypal_order_id,
      metadata: { source: 'admin_manual', deposit_id: depositId },
    })

    // Marcar deposito como completado
    await supabase
      .from('deposits')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', depositId)

    return NextResponse.json({ ok: true, action: 'completed', nectar: deposit.nectar_amount })
  }

  if (action === 'cancel') {
    await supabase
      .from('deposits')
      .update({ status: 'cancelled' })
      .eq('id', depositId)

    return NextResponse.json({ ok: true, action: 'cancelled' })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
