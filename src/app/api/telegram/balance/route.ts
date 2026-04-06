import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getBalance(telegram_id: string | null) {
  if (!telegram_id) return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 })
  const db = getSupabase()
  const profile = await db.from('profiles').select('id, username').eq('telegram_id', Number(telegram_id)).maybeSingle()
  if (!profile.data) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const wallet = await db.from('wallets').select('balance').eq('user_id', profile.data.id).single()
  return NextResponse.json({ user_id: profile.data.id, username: profile.data.username, balance: wallet.data?.balance ?? 0 })
}

export async function GET(req: NextRequest) {
  return getBalance(req.nextUrl.searchParams.get('telegram_id'))
}

export async function POST(req: NextRequest) {
  const { telegram_id } = await req.json()
  return getBalance(String(telegram_id))
}
