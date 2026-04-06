import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BOT_SECRET = process.env.TELEGRAM_BOT_SECRET!

export async function POST(req: NextRequest) {
  // Auth check
  const auth = req.headers.get('x-bot-secret')
  if (auth !== BOT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { telegram_id, username, invite_code } = await req.json()

  if (!telegram_id || !invite_code) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // 1. Verificar si ya existe el usuario (idempotente)
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('telegram_id', telegram_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ status: 'already_registered', user_id: existing.id, username: existing.username })
  }

  // 2. Validar invite_code
  const { data: invite, error: inviteError } = await supabase
    .from('invites')
    .select('id, used')
    .eq('code', invite_code)
    .maybeSingle()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 })
  }

  if (invite.used) {
    return NextResponse.json({ error: 'Invite code already used' }, { status: 400 })
  }

  // 3. Crear usuario en Supabase Auth
  const email = `tg_${telegram_id}@hwacasino.internal`
  const password = `tg_${telegram_id}_${Date.now()}`

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Failed to create auth user', detail: authError?.message }, { status: 500 })
  }

  const user_id = authData.user.id
  const display_username = username || `tg_${telegram_id}`

  // 4. Crear profile con telegram_id
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: user_id, username: display_username, role: 'player', telegram_id })

  if (profileError) {
    return NextResponse.json({ error: 'Failed to create profile', detail: profileError.message }, { status: 500 })
  }

  // 5. Crear wallet (trigger handle_new_user deberia hacerlo, pero por si acaso)
  const { data: walletExists } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', user_id)
    .maybeSingle()

  if (!walletExists) {
    await supabase.from('wallets').insert({ user_id, balance: 1000 })
    // Registrar transaccion de bienvenida
    await supabase.from('transactions').insert({
      user_id,
      type: 'bonus',
      amount: 1000,
      direction: 'credit',
      reference_id: null,
      metadata: { note: 'Bono de bienvenida' },
    })
  }

  // 6. Marcar invite como usada
  await supabase
    .from('invites')
    .update({ used: true, used_by: display_username, used_at: new Date().toISOString(), invited_user_id: user_id })
    .eq('id', invite.id)

  return NextResponse.json({ status: 'registered', user_id, username: display_username })
}
