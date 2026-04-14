export type CasinoEvent =
  | {
      type: 'ROUND_UPDATED'
      roundId: string
      roomId: string
      status: 'betting' | 'closed' | 'spinning' | 'settled'
      winningNumber: number | null
      winningIndex: number | null
      closesAt: string | null
      createdAt: string
    }
  | {
      type: 'BET_PLACED'
      roundId: string
      userId: string
      amount: number
      payload: any
    }
  | {
      type: 'WALLET_UPDATED'
      userId: string
      balanceAfter: number
      currency: string
    }

export function normalizeCasinoEvent(payload: any): CasinoEvent | null {
  if (!payload?.eventType && !payload?.type) return null

  const type = payload.eventType ?? payload.type

  switch (type) {
    case 'roulette_rounds.update':
      return {
        type: 'ROUND_UPDATED',
        roundId: payload.new.id,
        roomId: payload.new.room_id,
        status: payload.new.status,
        winningNumber: payload.new.winning_number ?? null,
        winningIndex: payload.new.winning_index ?? null,
        closesAt: payload.new.closes_at ?? null,
        createdAt: payload.new.created_at
      }

    case 'round_bets.insert':
      return {
        type: 'BET_PLACED',
        roundId: payload.new.round_id,
        userId: payload.new.user_id,
        amount: payload.new.amount,
        payload: payload.new
      }

    case 'wallet_transactions.insert':
      return {
        type: 'WALLET_UPDATED',
        userId: payload.new.user_id,
        balanceAfter: payload.new.balance_after,
        currency: payload.new.currency
      }

    default:
      return null
  }
}
