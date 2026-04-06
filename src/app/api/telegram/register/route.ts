import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const { telegram_id, username, invite_code } = await req.json()
  if (!telegram_id || !invite_code) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  const supabase = db()
  const { data: existing } = await supabase.from("profiles").select("id,username").eq("telegram_id", telegram_id).maybeSingle()
  if (existing) {
    const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", existing.id).single()
    return NextResponse.json({ user_id: existing.id, username: existing.username, balance: w?.balance ?? 0, created: false })
  }
  const { data: invite } = await supabase.from("invites").select("*").eq("code", String(invite_code).trim().toUpperCase()).eq("used", false).maybeSingle()
  if (!invite) return NextResponse.json({ error: "Invalid or used invite code" }, { status: 400 })
  const { data: auth, error: authErr } = await supabase.auth.admin.createUser({ email: `${telegram_id}@tg.hwacasino.com`, password: crypto.randomUUID(), email_confirm: true })
  if (authErr || !auth.user) return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  const userId = auth.user.id
  await supabase.from("profiles").update({ telegram_id, username, role: "player" }).eq("id", userId)
  await supabase.from("invites").update({ used: true, used_by: String(telegram_id), used_at: new Date().toISOString(), invited_user_id: userId }).eq("code", String(invite_code).trim().toUpperCase())
  await supabase.from("transactions").insert({ user_id: userId, type: "welcome_bonus", amount: 1000, direction: "credit", metadata: { platform: "telegram" } })
  const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", userId).single()
  return NextResponse.json({ user_id: userId, username, balance: w?.balance ?? 1000, created: true })
}
