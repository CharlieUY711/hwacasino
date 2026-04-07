import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Auth helper: verifica que el token pertenece a un admin ──────────
async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const supabase = getSupabase()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) return null
  return user
}

// ── GET /api/admin/stats ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // En produccion: descomentar verificacion de admin
  // const user = await verifyAdmin(req)
  // if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    // ── Usuarios + wallets ─────────────────────────────────────────
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, role, telegram_id, created_at')
      .order('created_at', { ascending: false })

    const { data: wallets } = await supabase
      .from('wallets')
      .select('user_id, balance')

    // ── Apuestas por usuario ───────────────────────────────────────
    const { data: betCounts } = await supabase
      .from('bets')
      .select('user_id')

    const betCountMap: Record<string, number> = {}
    betCounts?.forEach(b => {
      betCountMap[b.user_id] = (betCountMap[b.user_id] ?? 0) + 1
    })

    // ── Combinar users con wallets ─────────────────────────────────
    const walletMap: Record<string, number> = {}
    wallets?.forEach(w => { walletMap[w.user_id] = w.balance })

    const users = (profiles ?? []).map(p => ({
      ...p,
      balance: walletMap[p.id] ?? 0,
      bet_count: betCountMap[p.id] ?? 0,
    }))

    // ── Depositos ─────────────────────────────────────────────────
    const { data: rawDeposits } = await supabase
      .from('deposits')
      .select('*, profiles!deposits_user_id_fkey(username)')
      .order('created_at', { ascending: false })
      .limit(50)

    const deposits = (rawDeposits ?? []).map((d: any) => ({
      ...d,
      username: d.profiles?.username ?? 'desconocido',
    }))

    const depositsToday = deposits.filter(d => new Date(d.created_at) >= today && d.status === 'completed')
    const pendingDeposits = deposits.filter(d => d.status === 'pending').length

    // ── Invitaciones ──────────────────────────────────────────────
    const { data: inviteRaw } = await supabase
      .from('invites')
      .select('*, profiles!invites_invited_user_id_fkey(username)')
      .order('created_at', { ascending: false })

    const invites = (inviteRaw ?? []).map((i: any) => ({
      ...i,
      invited_username: i.profiles?.username ?? null,
    }))

    // ── Rondas hoy ────────────────────────────────────────────────
    const { count: roundsToday } = await supabase
      .from('roulette_rounds')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    // ── Bets hoy: apostado vs pagado ──────────────────────────────
    const { data: betsToday } = await supabase
      .from('bets')
      .select('amount, payout, status')
      .gte('created_at', today.toISOString())

    const totalBetToday = betsToday?.reduce((sum, b) => sum + (b.amount ?? 0), 0) ?? 0
    const totalPayoutToday = betsToday?.reduce((sum, b) => sum + (b.payout ?? 0), 0) ?? 0
    const houseProfitToday = totalBetToday - totalPayoutToday

    // ── Stats agregadas ───────────────────────────────────────────
    const totalNectarInPlay = wallets?.reduce((sum, w) => sum + (w.balance ?? 0), 0) ?? 0
    const telegramUsers = users.filter(u => u.telegram_id).length
    const webUsers = users.length - telegramUsers

    const stats = {
      totalUsers: users.length,
      activeNow: 0, // conectar a Supabase Presence si se necesita
      totalNectarInPlay,
      depositsToday: depositsToday.reduce((sum, d) => sum + (d.amount_usd ?? 0), 0),
      depositsTodayUsd: depositsToday.length,
      pendingDeposits,
      houseProfitToday,
      roundsToday: roundsToday ?? 0,
      webUsers,
      telegramUsers,
    }

    return NextResponse.json({ stats, users, deposits, invites })

  } catch (err) {
    console.error('[admin/stats]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

