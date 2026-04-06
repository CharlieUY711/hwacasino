import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Genera un codigo VIP con formato VIP-XXXX-XXXX-XXXX
function generateVIPCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `VIP-${segment(4)}-${segment(4)}-${segment(4)}`
}

// POST /api/admin/invites — genera un nuevo codigo
export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const code = generateVIPCode()

  const { data, error } = await supabase
    .from('invites')
    .insert({ code, used: false })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ code: data.code, id: data.id })
}

// DELETE /api/admin/invites?id=xxx — revoca (elimina) un codigo sin usar
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = getSupabase()

  // Solo permite borrar codigos no usados
  const { error } = await supabase
    .from('invites')
    .delete()
    .eq('id', id)
    .eq('used', false)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
