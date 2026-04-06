import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
export function useWallet() {
  const [balance, setBalance] = useState<number>(0)
  const [username, setUsername] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) { setLoading(false); return }
      const { data } = await supabase
        .from('wallets')
        .select('balance, user_id')
        .eq('user_id', user.id)
        .single()
      if (!cancelled) {
        setBalance(data?.balance ?? 0)
        setUsername(user.user_metadata?.display_name ?? '')
        setLoading(false)
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      const channel = supabase
        .channel(`wallet-${user.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
          (payload) => { setBalance((payload.new as { balance: number }).balance) }
        )
        .subscribe()
      channelRef.current = channel
    }
    init()
    return () => {
      cancelled = true
      channelRef.current?.unsubscribe()
      channelRef.current = null
    }
  }, [])
  const formatChips = (n: number) => n.toLocaleString('es-UY') + ' CHIPS'
  return { balance, loading, formatChips, username }
}
