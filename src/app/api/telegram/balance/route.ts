import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BOT_SECRET = process.env.TELEGRAM_BOT_SECRET!

export async function GET(req: NextRequest) {
  // Auth check
  const auth = req.headers.get('x-bot-secret')
  if (auth !== BOT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const telegram_id = searchParams.get('telegram_id')

  if (!telegram_id) {
    return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 })
  }

  // 1. Buscar profile por telegram_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('telegram_id', parseInt(telegram_id, 10))
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 2. Obtener balance de wallet
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (walletError || !wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  }

  return NextResponse.json({
    user_id: profile.id,
    username: profile.username,
    balance: wallet.balance,
  })
}
