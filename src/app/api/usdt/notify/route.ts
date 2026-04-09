// Endpoint para que el usuario notifique un depósito USDT
// Crea un registro pendiente — el admin lo confirma en el panel
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { user_id, amount_usdt, tx_hash } = await req.json()

    if (!user_id || !amount_usdt || amount_usdt <= 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Verificar que el hash no se usó antes
    if (tx_hash) {
      const { data: existing } = await supabase
        .from('deposit_requests')
        .select('id')
        .eq('tx_hash', tx_hash)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Hash ya registrado' }, { status: 409 })
      }
    }

    // Crear solicitud pendiente
    const { error } = await supabase
      .from('deposit_requests')
      .insert({
        user_id,
        currency:    'USDT',
        amount:      amount_usdt,
        tx_hash:     tx_hash ?? null,
        status:      'pending',
        wallet_to:   process.env.USDT_WALLET,
      })

    if (error) {
      console.error('[usdt/notify]', error)
      return NextResponse.json({ error: 'Error registrando solicitud' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Solicitud registrada — procesamos en breve' })

  } catch (err) {
    console.error('[usdt/notify] catch', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
