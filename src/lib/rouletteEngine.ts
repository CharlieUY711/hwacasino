import { createClient } from '@supabase/supabase-js'

export const ROUND_DURATION_SECONDS = parseInt(
  process.env.ROUND_DURATION_SECONDS ?? '40'
)

export const ROOMS = ['vip-1', 'vip-2', 'vip-3']

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36,
])

export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26,
]

export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export function secureRandomIndex(): number {
  const max = Math.floor(0xffffffff / 37) * 37
  let value: number
  do {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    value = array[0]
  } while (value >= max)
  return value % 37
}

export function getColor(n: number): string {
  if (n === 0) return 'green'
  return RED_NUMBERS.has(n) ? 'red' : 'black'
}

export function calculatePayout(
  betType: string,
  betValue: string,
  amount: number,
  winningNumber: number
): number {
  switch (betType) {
    case 'number':
      return parseInt(betValue) === winningNumber ? amount * 35 : 0
    case 'split2': {
      const nums = betValue.split('-').map(Number)
      return nums.includes(winningNumber) ? amount * 17 : 0
    }
    case 'split4': {
      const nums = betValue.split('-').map(Number)
      return nums.includes(winningNumber) ? amount * 8 : 0
    }
    case 'color':
      if (winningNumber === 0) return 0
      return (betValue === 'red') === RED_NUMBERS.has(winningNumber) ? amount * 2 : 0
    case 'parity':
      if (winningNumber === 0) return 0
      return (betValue === 'even') === (winningNumber % 2 === 0) ? amount * 2 : 0
    case 'dozen':
      if (winningNumber === 0) return 0
      return Math.ceil(winningNumber / 12) === parseInt(betValue) ? amount * 3 : 0
    case 'column': {
      if (winningNumber === 0) return 0
      const col = winningNumber % 3 === 0 ? 3 : winningNumber % 3
      return col === parseInt(betValue) ? amount * 3 : 0
    }
    case 'half':
      if (winningNumber === 0) return 0
      return (betValue === 'low') === (winningNumber <= 18) ? amount * 2 : 0
    default:
      return 0
  }
}

export type RoundStatus = {
  round_id: string
  room_id: string
  status: 'betting' | 'spinning' | 'closed'
  closes_at: string
  seconds_remaining: number
  winning_number: number | null
  winning_index: number | null
}
