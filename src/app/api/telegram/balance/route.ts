import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function handle(telegram_id: string | null) {
  if (!telegram_id) return NextResponse.json({ error: "Missing telegram_id" }, { status: 400 })
  const { data: p } = await db().from("profiles").select("id,username").eq("telegram_id", Number(telegram_id)).maybeSingle()
  if (!p) return NextResponse.json({ error: "User not found" }, { status: 404 })
  const { data: w } = await db().from("wallets").select("balance").eq("user_id", p.id).single()
  return NextResponse.json({ user_id: p.id, username: p.username, balance: w?.balance ?? 0 })
}

export async function GET(req: NextRequest) { return handle(req.nextUrl.searchParams.get("telegram_id")) }
export async function POST(req: NextRequest) { const b = await req.json(); return handle(String(b.telegram_id)) }
