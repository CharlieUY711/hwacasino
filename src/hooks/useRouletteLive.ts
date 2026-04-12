import { useEffect, useReducer, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { createRealtimeChannel } from '@/lib/realtime/subscriptions'
import { normalizeCasinoEvent } from '@/lib/realtime/events'

type State = {
  round: any | null
  connected: boolean
}

function reducer(state: State, action: any): State {
  switch (action.type) {
    case 'SET_ROUND':
      return { ...state, round: action.payload }

    case 'UPDATE_ROUND':
      return {
        ...state,
        round: { ...state.round, ...action.payload }
      }

    case 'CONNECTED':
      return { ...state, connected: true }

    default:
      return state
  }
}

export function useRouletteLive(roomId: string) {
  const [state, dispatch] = useReducer(reducer, {
    round: null,
    connected: false
  })

  const client = useMemo(() => supabase, [])

  useEffect(() => {
    let active = true

    // hydrate
    const init = async () => {
      const { data } = await client
        .from('roulette_rounds')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!active) return

      if (data) {
        dispatch({ type: 'SET_ROUND', payload: data })
      }

      dispatch({ type: 'CONNECTED' })
    }

    init()

    // realtime
    const channel = createRealtimeChannel(client, {
      table: 'roulette_rounds',
      filter: `room_id=eq.${roomId}`,

      onEvent: (payload) => {
        const event = normalizeCasinoEvent({
          eventType: 'roulette_rounds.update',
          new: payload.new,
          old: payload.old
        })

        if (!event || event.type !== 'ROUND_UPDATED') return

        dispatch({
          type: 'UPDATE_ROUND',
          payload: event
        })
      }
    })

    return () => {
      active = false
      channel.unsubscribe()
    }
  }, [roomId, client])

  return state
}