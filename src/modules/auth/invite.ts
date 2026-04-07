import { supabase } from '@/lib/supabaseClient'

export async function validateInviteCode(code: string): Promise<{ valid: boolean; id: string | null }> {
  const { data, error } = await supabase
    .from('invites')
    .select('id, used')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data) return { valid: false, id: null }
  if (data.used) return { valid: false, id: null }
  return { valid: true, id: data.id }
}

export async function markInviteUsed(id: string, userId: string): Promise<void> {
  await supabase
    .from('invites')
    .update({
      used: true,
      used_by: userId,
      used_at: new Date().toISOString(),
    })
    .eq('id', id)
}
