import { supabase } from '@/lib/supabase'

type Callback = (payload: any) => void

export function createRealtimeChannel(
  client = supabase,
  config: {
    table: string
    filter?: string
    onEvent: Callback
    onError?: (err: any) => void
  }
) {
  const channelName = `ch:${config.table}:${config.filter ?? 'all'}`

  const channel = client
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: config.table,
        filter: config.filter
      },
      (payload) => {
        try {
          config.onEvent(payload)
        } catch (err) {
          config.onError?.(err)
        }
      }
    )
    .subscribe()

  return {
    unsubscribe: async () => {
      await client.removeChannel(channel)
    }
  }
}
