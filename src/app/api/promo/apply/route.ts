import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { code, user_id, stage = 'registration' } = await req.json()
    if (!code || !user_id) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }
    const { data, error } = await supabase.rpc('apply_promo_code', {
      p_code:    code.trim().toUpperCase(),
      p_user_id: user_id,
      p_stage:   stage,
    })
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
