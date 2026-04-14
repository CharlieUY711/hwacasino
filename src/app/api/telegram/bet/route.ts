import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const { telegram_id, bet_amount, bet_type, bet_value, result_number, won, payout } = await req.json()
  if (!telegram_id || !bet_amount || !bet_type || result_number === undefined) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  const supabase = db()
  const { data: p } = await supabase.from("profiles").select("id").eq("telegram_id", telegram_id).maybeSingle()
  if (!p) return NextResponse.json({ error: "User not found" }, { status: 404 })
  const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", p.id).single()
  if (!w || w.balance < bet_amount) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
  await supabase.rpc("increment_wallet_balance", { p_user_id: p.id, p_amount: -bet_amount })
  if (won && payout > 0) await supabase.rpc("increment_wallet_balance", { p_user_id: p.id, p_amount: payout })
  await supabase.from("bets").insert({ user_id: p.id, game: "roulette", amount: bet_amount, payout: payout ?? 0, status: won ? "won" : "lost", choice: bet_value ? `${bet_type}:${bet_value}` : bet_type, result_number })
  await supabase.from("transactions").insert({ user_id: p.id, type: "bet", amount: bet_amount, direction: "debit", metadata: { game: "roulette", result: result_number, platform: "telegram" } })
  if (won && payout > 0) await supabase.from("transactions").insert({ user_id: p.id, type: "payout", amount: payout, direction: "credit", metadata: { game: "roulette", result: result_number, platform: "telegram" } })
  const { data: updated } = await supabase.from("wallets").select("balance").eq("user_id", p.id).single()
  return NextResponse.json({ ok: true, new_balance: updated?.balance ?? 0 })
}


