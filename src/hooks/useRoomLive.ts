import { useRouletteLive } from './useRouletteLive'

export function useRoomLive(roomId: string) {
  const roulette = useRouletteLive(roomId)

  return {
    roulette
  }
}