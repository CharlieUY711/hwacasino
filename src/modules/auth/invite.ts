import { supabase } from '@/lib/supabaseClient'

export async function validateInviteCode(code: string): Promise<{ valid: boolean; id: string | null; initial_chips: number }> {
  const { data, error } = await supabase
    .from('invites')
    .select('id, used, used_count, max_uses, initial_chips, expires_at')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data) return { valid: false, id: null, initial_chips: 0 }

  if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false, id: null, initial_chips: 0 }

  const maxUses = data.max_uses ?? 1
  const usedCount = data.used_count ?? 0
  if (usedCount >= maxUses) return { valid: false, id: null, initial_chips: 0 }

  return { valid: true, id: data.id, initial_chips: data.initial_chips ?? 0 }
}

export async function markInviteUsed(id: string, userId: string, rewardValue: number = 0): Promise<void> {
  await supabase
    .from('invites')
    .update({
      used: true,
      used_by: userId,
      used_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (rewardValue > 0) {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balances')
      .eq('user_id', userId)
      .single()

    const balances = wallet?.balances ?? { CHIPS: 0, USD: 0, USDT: 0 }
    const newChips = (balances.CHIPS ?? 0) + rewardValue

    await supabase
      .from('wallets')
      .upsert({
        user_id: userId,
        balances: { ...balances, CHIPS: newChips },
        updated_at: new Date().toISOString(),
      })

    await supabase.from('wallet_transactions').insert({
      user_id: userId,
      type: 'credit',
      amount: rewardValue,
      balance_after: newChips,
      reason: `invite_code:${id}`,
    })
  }
}

