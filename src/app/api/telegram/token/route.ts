import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomBytes } from "crypto"

const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const { telegram_id } = await req.json()
  if (!telegram_id) return NextResponse.json({ error: "Missing telegram_id" }, { status: 400 })

  const supabase = db()

  // Buscar el user_id por telegram_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_id", telegram_id)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Generar token único
  const token = randomBytes(32).toString("hex")

  // Guardar token (expira en 5 minutos)
  await supabase.from("telegram_tokens").insert({
    token,
    user_id: profile.id,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    used: false,
  })

  return NextResponse.json({ token })
}
