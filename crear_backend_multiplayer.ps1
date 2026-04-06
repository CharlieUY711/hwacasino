# ============================================================
# HWA Casino — Crear backend multiplayer ruleta
# Ejecutar desde la raiz del proyecto (donde esta package.json)
# ============================================================

# Crear carpetas
New-Item -ItemType Directory -Force -Path "src\app\api\roulette\round\status" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\api\roulette\round\bet"    | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\api\roulette\round\close"  | Out-Null
New-Item -ItemType Directory -Force -Path "src\lib"                            | Out-Null

Write-Host "Carpetas creadas." -ForegroundColor Cyan

# ============================================================
# 1. src/lib/rouletteEngine.ts
# ============================================================
$rouletteEngine = @'
import { createClient } from '@supabase/supabase-js'

export const ROUND_DURATION_SECONDS = parseInt(
  process.env.ROUND_DURATION_SECONDS ?? '40'
)

export const ROOMS = ['vip-1', 'vip-2', 'vip-3']

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36,
])

export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26,
]

export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export function secureRandomIndex(): number {
  const max = Math.floor(0xffffffff / 37) * 37
  let value: number
  do {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    value = array[0]
  } while (value >= max)
  return value % 37
}

export function getColor(n: number): string {
  if (n === 0) return 'green'
  return RED_NUMBERS.has(n) ? 'red' : 'black'
}

export function calculatePayout(
  betType: string,
  betValue: string,
  amount: number,
  winningNumber: number
): number {
  switch (betType) {
    case 'number':
      return parseInt(betValue) === winningNumber ? amount * 35 : 0
    case 'split2': {
      const nums = betValue.split('-').map(Number)
      return nums.includes(winningNumber) ? amount * 17 : 0
    }
    case 'split4': {
      const nums = betValue.split('-').map(Number)
      return nums.includes(winningNumber) ? amount * 8 : 0
    }
    case 'color':
      if (winningNumber === 0) return 0
      return (betValue === 'red') === RED_NUMBERS.has(winningNumber) ? amount * 2 : 0
    case 'parity':
      if (winningNumber === 0) return 0
      return (betValue === 'even') === (winningNumber % 2 === 0) ? amount * 2 : 0
    case 'dozen':
      if (winningNumber === 0) return 0
      return Math.ceil(winningNumber / 12) === parseInt(betValue) ? amount * 3 : 0
    case 'column': {
      if (winningNumber === 0) return 0
      const col = winningNumber % 3 === 0 ? 3 : winningNumber % 3
      return col === parseInt(betValue) ? amount * 3 : 0
    }
    case 'half':
      if (winningNumber === 0) return 0
      return (betValue === 'low') === (winningNumber <= 18) ? amount * 2 : 0
    default:
      return 0
  }
}

export type RoundStatus = {
  round_id: string
  room_id: string
  status: 'betting' | 'spinning' | 'closed'
  closes_at: string
  seconds_remaining: number
  winning_number: number | null
  winning_index: number | null
}
'@

[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location) "src\lib\rouletteEngine.ts"),
  $rouletteEngine,
  [System.Text.Encoding]::UTF8
)
Write-Host "OK  src/lib/rouletteEngine.ts" -ForegroundColor Green

# ============================================================
# 2. src/app/api/roulette/round/status/route.ts
# ============================================================
$statusRoute = @'
import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabase,
  ROUND_DURATION_SECONDS,
  secureRandomIndex,
  WHEEL_ORDER,
  calculatePayout,
  type RoundStatus,
} from '@/lib/rouletteEngine'

async function closeRound(
  supabase: ReturnType<typeof getSupabase>,
  round: { id: string; room_id: string }
) {
  const winningIndex = secureRandomIndex()
  const winningNumber = WHEEL_ORDER[winningIndex]

  await supabase
    .from('roulette_rounds')
    .update({ status: 'spinning', winning_index: winningIndex, winning_number: winningNumber })
    .eq('id', round.id)

  const { data: roundBets } = await supabase
    .from('round_bets')
    .select('*')
    .eq('round_id', round.id)
    .eq('resolved', false)

  if (roundBets && roundBets.length > 0) {
    for (const rb of roundBets) {
      const bets = rb.bets as Array<{
        bet_type: string
        bet_value: string
        amount: number
        bet_id: string
      }>
      for (const bet of bets) {
        const payout = calculatePayout(bet.bet_type, bet.bet_value, bet.amount, winningNumber)
        await supabase.rpc('resolve_bet', { p_bet_id: bet.bet_id, p_payout: payout })
      }
      await supabase.from('round_bets').update({ resolved: true }).eq('id', rb.id)
    }
  }

  await supabase
    .from('roulette_rounds')
    .update({ status: 'closed' })
    .eq('id', round.id)

  return { winningIndex, winningNumber }
}

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room') ?? 'vip-1'
  const supabase = getSupabase()
  const now = new Date()

  let { data: round } = await supabase
    .from('roulette_rounds')
    .select('*')
    .eq('room_id', room)
    .in('status', ['betting', 'spinning'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Auto-sana: si closes_at paso y sigue en betting, cerrar inline
  if (round && round.status === 'betting' && new Date(round.closes_at) <= now) {
    await closeRound(supabase, round)
    const { data: updated } = await supabase
      .from('roulette_rounds')
      .select('*')
      .eq('id', round.id)
      .single()
    round = updated
  }

  // Si no hay ronda activa, crear una nueva
  if (!round || round.status === 'closed') {
    const closesAt = new Date(now.getTime() + ROUND_DURATION_SECONDS * 1000)
    const { data: newRound } = await supabase
      .from('roulette_rounds')
      .insert({ room_id: room, status: 'betting', closes_at: closesAt.toISOString() })
      .select()
      .single()
    round = newRound
  }

  const secondsRemaining = Math.max(
    0,
    Math.floor((new Date(round.closes_at).getTime() - now.getTime()) / 1000)
  )

  const response: RoundStatus = {
    round_id: round.id,
    room_id: round.room_id,
    status: round.status,
    closes_at: round.closes_at,
    seconds_remaining: secondsRemaining,
    winning_number: round.winning_number ?? null,
    winning_index: round.winning_index ?? null,
  }

  return NextResponse.json(response)
}
'@

[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location) "src\app\api\roulette\round\status\route.ts"),
  $statusRoute,
  [System.Text.Encoding]::UTF8
)
Write-Host "OK  src/app/api/roulette/round/status/route.ts" -ForegroundColor Green

# ============================================================
# 3. src/app/api/roulette/round/bet/route.ts
# ============================================================
$betRoute = @'
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
'@

[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location) "src\app\api\roulette\round\bet\route.ts"),
  $betRoute,
  [System.Text.Encoding]::UTF8
)
Write-Host "OK  src/app/api/roulette/round/bet/route.ts" -ForegroundColor Green

# ============================================================
# 4. src/app/api/roulette/round/close/route.ts
# ============================================================
$closeRoute = @'
import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabase,
  secureRandomIndex,
  WHEEL_ORDER,
  calculatePayout,
} from '@/lib/rouletteEngine'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { round_id } = await req.json()
  if (!round_id) {
    return NextResponse.json({ error: 'round_id requerido' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { data: round } = await supabase
    .from('roulette_rounds')
    .select('*')
    .eq('id', round_id)
    .single()

  // Idempotente: si ya esta cerrada, no hacer nada
  if (!round || round.status === 'closed') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const winningIndex = secureRandomIndex()
  const winningNumber = WHEEL_ORDER[winningIndex]

  await supabase
    .from('roulette_rounds')
    .update({ status: 'spinning', winning_index: winningIndex, winning_number: winningNumber })
    .eq('id', round_id)

  const { data: roundBets } = await supabase
    .from('round_bets')
    .select('*')
    .eq('round_id', round_id)
    .eq('resolved', false)

  if (roundBets && roundBets.length > 0) {
    for (const rb of roundBets) {
      const bets = rb.bets as Array<{
        bet_type: string
        bet_value: string
        amount: number
        bet_id: string
      }>
      for (const bet of bets) {
        const payout = calculatePayout(bet.bet_type, bet.bet_value, bet.amount, winningNumber)
        await supabase.rpc('resolve_bet', { p_bet_id: bet.bet_id, p_payout: payout })
      }
      await supabase.from('round_bets').update({ resolved: true }).eq('id', rb.id)
    }
  }

  await supabase
    .from('roulette_rounds')
    .update({ status: 'closed' })
    .eq('id', round_id)

  return NextResponse.json({
    ok: true,
    winning_number: winningNumber,
    winning_index: winningIndex,
  })
}
'@

[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location) "src\app\api\roulette\round\close\route.ts"),
  $closeRoute,
  [System.Text.Encoding]::UTF8
)
Write-Host "OK  src/app/api/roulette/round/close/route.ts" -ForegroundColor Green

# ============================================================
# 5. Variables de entorno (.env.local)
# ============================================================
$envPath = Join-Path (Get-Location) ".env.local"
$envContent = [System.IO.File]::ReadAllText($envPath, [System.Text.Encoding]::UTF8)

if ($envContent -notmatch "ROUND_DURATION_SECONDS") {
  [System.IO.File]::AppendAllText($envPath, "`nROUND_DURATION_SECONDS=40`n", [System.Text.Encoding]::UTF8)
  Write-Host "OK  ROUND_DURATION_SECONDS=40 agregado a .env.local" -ForegroundColor Green
} else {
  Write-Host "-- ROUND_DURATION_SECONDS ya existe en .env.local" -ForegroundColor Yellow
}

if ($envContent -notmatch "CRON_SECRET") {
  $cronSecret = "hwa_cron_2026_" + (Get-Random -Maximum 99999)
  [System.IO.File]::AppendAllText($envPath, "CRON_SECRET=$cronSecret`n", [System.Text.Encoding]::UTF8)
  Write-Host "OK  CRON_SECRET=$cronSecret agregado a .env.local" -ForegroundColor Green
  Write-Host "    >> Agregar CRON_SECRET y ROUND_DURATION_SECONDS en Vercel dashboard tambien" -ForegroundColor Yellow
} else {
  Write-Host "-- CRON_SECRET ya existe en .env.local" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Listo. Archivos creados:" -ForegroundColor Cyan
Write-Host "  src/lib/rouletteEngine.ts" -ForegroundColor White
Write-Host "  src/app/api/roulette/round/status/route.ts" -ForegroundColor White
Write-Host "  src/app/api/roulette/round/bet/route.ts" -ForegroundColor White
Write-Host "  src/app/api/roulette/round/close/route.ts" -ForegroundColor White
Write-Host ""
Write-Host " Siguiente paso:" -ForegroundColor Cyan
Write-Host "  1. Ejecutar el SQL de las 2 tablas en Supabase" -ForegroundColor White
Write-Host "  2. Agregar CRON_SECRET y ROUND_DURATION_SECONDS en Vercel" -ForegroundColor White
Write-Host "  3. Mandar el page.tsx de ruleta para el diff del frontend" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
