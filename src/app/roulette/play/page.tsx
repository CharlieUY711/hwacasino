'use client'
import PaymentModal from '@/components/PaymentModal'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useWallet } from '@/hooks/useWallet'

const GOLD = '#D4AF37'
const DARK = '#0A0A0A'
const GREEN_FELT = '#0a3d24'

const WHEEL_ORDER = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
]

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])

function getColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green'
  return RED_NUMBERS.has(n) ? 'red' : 'black'
}

const CHIP_DEFS = [
  { value: 10,    label: '10',  color: '#1a0e00' },
  { value: 50,    label: '50',  color: '#7c1d1d' },
  { value: 100,   label: '100', color: '#1a3a6e' },
  { value: 250,   label: '250', color: '#2d4a1e' },
  { value: 500,   label: '500', color: '#4a1a6e' },
  { value: 1000,  label: '1K',  color: '#6e3a00' },
  { value: 10000, label: '10K', color: '#0d0d0d' },
]
const CHIP_BG     = GOLD
const CHIP_BORDER = '#b8941f'

const MOCK_HOT  = [17, 32, 5, 21, 0]
const MOCK_COLD = [3, 36, 14, 25, 8]
const MOCK_HISTORY = [17,0,32,5,21,14,7,32,19,3,25,11,17,0,6,32,21,8,14,17]

const TABLE_COLS: [number, number, number][] = Array.from({ length: 12 }, (_, col) => [
  col * 3 + 3,
  col * 3 + 2,
  col * 3 + 1,
])

type BetType = 'number' | 'color' | 'parity' | 'dozen' | 'column' | 'half' | 'split2' | 'split4'

type Bet = {
  id: string
  type: BetType
  value: string
  amount: number
  chipX: number
  chipY: number
}

function isWinningBet(bet: Bet, result: number): boolean {
  const c = getColor(result)
  switch (bet.type) {
    case 'number':  return parseInt(bet.value) === result
    case 'color':   return bet.value === c
    case 'parity':  return result !== 0 && (bet.value === 'even' ? result % 2 === 0 : result % 2 !== 0)
    case 'half':    return result !== 0 && (bet.value === 'low' ? result <= 18 : result >= 19)
    case 'dozen': {
      const d = parseInt(bet.value)
      return result !== 0 && result >= (d-1)*12+1 && result <= d*12
    }
    case 'column': {
      const col = parseInt(bet.value)
      return result !== 0 && result % 3 === (col === 3 ? 0 : col === 2 ? 2 : 1)
    }
    case 'split2': {
      const nums = bet.value.split('-').map(Number)
      return nums.includes(result)
    }
    case 'split4': {
      const nums = bet.value.split('-').map(Number)
      return nums.includes(result)
    }
    default: return false
  }
}

// Calcula payout client-side para mostrar el resultado sin esperar al backend
function calcLocalPayout(betList: Bet[], winNum: number): { total: number; won: boolean } {
  let total = 0
  for (const bet of betList) {
    if (!isWinningBet(bet, winNum)) continue
    switch (bet.type) {
      case 'number': total += bet.amount * 35; break
      case 'split2': total += bet.amount * 17; break
      case 'split4': total += bet.amount * 8; break
      case 'dozen':
      case 'column': total += bet.amount * 3; break
      default:       total += bet.amount * 2; break
    }
  }
  return { total, won: total > 0 }
}

function fmtChipVal(amount: number): string {
  if (amount >= 10000) return `${Math.floor(amount/10000)}0K`
  if (amount >= 1000)  return `${Math.floor(amount/1000)}K`
  return String(amount)
}

function ChipMarker({ amount, size = 18, winning = false }: { amount: number; size?: number; winning?: boolean }) {
  const chip = CHIP_DEFS.slice().reverse().find(c => amount >= c.value) ?? CHIP_DEFS[0]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: winning ? '#fff' : CHIP_BG, border: `1.5px solid ${winning ? GOLD : CHIP_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: winning ? `0 0 8px ${GOLD}` : '0 2px 6px rgba(0,0,0,0.6)', transition: 'all 0.3s ease' }}>
      <span style={{ fontSize: size * 0.28, fontWeight: 900, color: winning ? GOLD : chip.color, lineHeight: 1 }}>{fmtChipVal(amount)}</span>
    </div>
  )
}

function FloatingChip({ bet, winning }: { bet: Bet; winning: boolean }) {
  const chip = CHIP_DEFS.slice().reverse().find(c => bet.amount >= c.value) ?? CHIP_DEFS[0]
  const size = 16
  return (
    <div style={{ position: 'absolute', left: bet.chipX - size/2, top: bet.chipY - size/2, width: size, height: size, borderRadius: '50%', background: winning ? '#fff' : CHIP_BG, border: `1.5px solid ${winning ? GOLD : CHIP_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: winning ? `0 0 10px ${GOLD}, 0 0 20px rgba(212,175,55,0.5)` : '0 2px 6px rgba(0,0,0,0.7)', zIndex: 20, pointerEvents: 'none', transition: 'background 0.3s, box-shadow 0.3s' }}>
      <span style={{ fontSize: 5, fontWeight: 900, color: winning ? GOLD : chip.color, lineHeight: 1 }}>{fmtChipVal(bet.amount)}</span>
    </div>
  )
}

export default function RoulettePlayPage() {
  const router = useRouter()
  const { balance, formatChips, username } = useWallet()
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedChip, setSelectedChip] = useState(CHIP_DEFS[0])
  const [bets, setBets] = useState<Bet[]>([])
  const [lastBets, setLastBets] = useState<Bet[]>([])
  const [spinning, setSpinning] = useState(false)
  const [resultNumber, setResultNumber] = useState<number | null>(null)
  const [resultColor, setResultColor]   = useState<string | null>(null)
  const [totalPayout, setTotalPayout]   = useState<number | null>(null)
  const [totalWon, setTotalWon]         = useState<boolean | null>(null)
  const [history, setHistory]           = useState<number[]>(MOCK_HISTORY)
  const [activeTab, setActiveTab]       = useState<'hot' | 'cold' | 'history'>('hot')
  const [error, setError]               = useState<string | null>(null)
  const [showResult, setShowResult]     = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showPayout, setShowPayout]     = useState(false)
  const [phase, setPhase]               = useState<'idle'|'spinning'|'result'|'payout'>('idle')

  const [displayBalance, setDisplayBalance] = useState<number | null>(null) // balance ajustado post-resultado

  // --- ESTADO MULTIPLAYER ---
  const [room, setRoom]                       = useState('vip-1')
  const [roundId, setRoundId]                 = useState<string | null>(null)
  const [roundStatus, setRoundStatus]         = useState<'betting' | 'spinning' | 'closed'>('betting')
  const [secondsRemaining, setSecondsRemaining] = useState(40)
  const [hasBetThisRound, setHasBetThisRound] = useState(false)
  const [onlineCount, setOnlineCount] = useState(1)
  const [waitingForResult, setWaitingForResult] = useState(false)

  const wheelRef       = useRef<SVGGElement>(null)
  const tableRef       = useRef<HTMLDivElement>(null)
  const currentRotation = useRef(0)

  // Refs para polling (evitar closures stale)
  const prevRoundIdRef  = useRef<string | null>(null)
  const animatedRoundRef = useRef<string | null>(null)
  const lastBetsRef     = useRef<Bet[]>([])

  // Sincronizar lastBets a ref para acceso desde timeout
  useEffect(() => { lastBetsRef.current = lastBets }, [lastBets])

  // Auth — soporta login via tg_token (Telegram WebApp) o sesion Supabase normal
  useEffect(() => {
    async function initAuth() {
      const params = new URLSearchParams(window.location.search)
      const tgToken = params.get('tg_token')

      if (tgToken) {
        // Limpiar token de la URL sin recargar
        const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]tg_token=[^&]*/g, '').replace(/^&/, '?')
        window.history.replaceState({}, '', cleanUrl)

        try {
          const res = await fetch(`/api/telegram/auth?token=${tgToken}`)
          if (!res.ok) { router.replace('/'); return }
          const { access_token, refresh_token } = await res.json()
          const { data: { user }, error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error || !user) { router.replace('/'); return }
          setUserId(user.id)
          return
        } catch {
          router.replace('/')
          return
        }
      }

      // Auth normal
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/'); return }
      setUserId(user.id)
    }
    initAuth()
  }, [router])

  // --- PRESENCIA REALTIME ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('room') ?? 'vip-1'

    let presenceChannel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      const channelName = `presence:${r}:${Date.now()}`
    presenceChannel = supabase.channel(channelName, {
        config: { presence: { key: user.id } },
      })

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          if (!presenceChannel) return
          const count = Object.keys(presenceChannel.presenceState()).length
          setOnlineCount(count)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && presenceChannel) {
            await presenceChannel.track({
              user_id:   user.id,
              room:      r,
              online_at: new Date().toISOString(),
            })
          }
        })
    })

    return () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel)
        presenceChannel = null
      }
    }
  }, [])

  // --- POLLING DE RONDA ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('room') ?? 'vip-1'

  
    setRoom(r)

    const poll = async () => {
      try {
        const res = await fetch(`/api/roulette/round/status?room=${r}`)
        const data = await res.json()

        setSecondsRemaining(data.seconds_remaining ?? 0)
        setRoundStatus(data.status)

        // Nueva ronda detectada
        if (data.round_id !== prevRoundIdRef.current) {
          prevRoundIdRef.current = data.round_id
          setRoundId(data.round_id)
          setHasBetThisRound(false)
          setShowResult(false)
          setResultNumber(null)
          setWaitingForResult(false)
          setBets([])
        }

        // Ronda entrando en spinning — animar rueda (una sola vez por ronda)
        if (data.status === 'spinning' && animatedRoundRef.current !== data.round_id) {
          animatedRoundRef.current = data.round_id
          setSpinning(true)
          animateWheelTo(data.winning_index)

          setTimeout(() => {
            const wNum = data.winning_number
            setResultNumber(wNum)
            setResultColor(getColor(wNum))
            setHistory(prev => [wNum, ...prev].slice(0, 30))
            const { total, won } = calcLocalPayout(lastBetsRef.current, wNum)
            setTotalPayout(total)
            setTotalWon(won)
            if (lastBetsRef.current.length > 0) setShowResult(true)
            setSpinning(false)
            setWaitingForResult(false)
          }, 6200)
        }
      } catch { /* silencioso */ }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [])

  // --- ANIMACION DE RUEDA ---
  function animateWheelTo(winningIndex: number) {
    if (!wheelRef.current) return
    const DEG = 360 / 37
    const slotAngle = -(winningIndex * DEG)
    const normalizedCurrent = ((currentRotation.current % 360) + 360) % 360
    const normalizedTarget  = ((slotAngle % 360) + 360) % 360
    let delta = normalizedTarget - normalizedCurrent
    if (delta <= 0) delta += 360
    const totalRotation = 6 * 360 + delta
    const newRotation = currentRotation.current + totalRotation
    currentRotation.current = newRotation
    const finalDeg = newRotation - 90
    wheelRef.current.style.transition = 'none'
    void wheelRef.current.getBoundingClientRect()
    wheelRef.current.style.transition = 'transform 6s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
    wheelRef.current.style.transform = `rotate(${finalDeg}deg)`
  }

  // --- POSICION DE CLICK RELATIVA AL PANO ---
  function getRelativePos(e: React.MouseEvent): { x: number; y: number } {
    if (!tableRef.current) return { x: 0, y: 0 }
    const rect = tableRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  // --- AGREGAR APUESTA ---
  function addBet(type: BetType, value: string, e: React.MouseEvent) {
    if (roundStatus !== 'betting' || hasBetThisRound) return
    const { x, y } = getRelativePos(e)
    const id = `${type}:${value}`
    setBets(prev => {
      const existing = prev.find(b => b.id === id)
      if (existing) {
        return prev.map(b => b.id === id
          ? { ...b, amount: b.amount + selectedChip.value, chipX: x, chipY: y }
          : b)
      }
      return [...prev, { id, type, value, amount: selectedChip.value, chipX: x, chipY: y }]
    })
  }

  function removeLast() {
    if (hasBetThisRound) return
    setBets(prev => {
      if (prev.length === 0) return prev
      const copy = [...prev]
      const last = copy[copy.length - 1]
      if (last.amount > selectedChip.value) {
        copy[copy.length - 1] = { ...last, amount: last.amount - selectedChip.value }
      } else {
        copy.pop()
      }
      return copy
    })
  }

  function clearBets()  { if (!hasBetThisRound) setBets([]) }
  function repeatBets() { if (!hasBetThisRound && lastBets.length > 0) setBets(lastBets) }
  function doubleBets() { if (!hasBetThisRound) setBets(prev => prev.map(b => ({ ...b, amount: b.amount * 2 }))) }

  const totalBet = bets.reduce((sum, b) => sum + b.amount, 0)

  function getBetOn(id: string): number { return bets.find(b => b.id === id)?.amount ?? 0 }

  function isWinning(id: string): boolean {
    if (resultNumber === null) return false
    const bet = bets.find(b => b.id === id) ?? lastBets.find(b => b.id === id)
    if (!bet) return false
    return isWinningBet(bet, resultNumber)
  }

  // --- REGISTRAR APUESTAS EN LA RONDA ---
  async function placeBets() {
    if (!userId || bets.length === 0 || spinning) return
    setError(null)

    if (isSolo) {
      // Modo solo: llamar al API real para descontar y acreditar
      setSpinning(true)
      const betsSnap = [...bets]
      let netPayout = 0
      let anyWin = false
      let winNum: number | null = null
      let winColor: string | null = null

      try {
        const res = await fetch('/api/play/roulette', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            bets: betsSnap.map(b => ({ bet_type: b.type, bet_value: b.value, amount: b.amount })),
          }),
        })
        const data = await res.json()
        if (data.error) {
          setError(data.error === 'insufficient_balance' ? 'Saldo insuficiente' : 'Error al procesar')
          setSpinning(false)
          return
        }
        winNum = data.result ?? data.number
        winColor = data.color
        netPayout = data.payout
        anyWin = data.won
      } catch {
        setError('Error de conexión')
        setSpinning(false)
        return
      }

      // Girar la rueda
      setPhase('spinning')
      const winIdx = WHEEL_ORDER.indexOf(winNum!)
      setResultNumber(null)
      animateWheelTo(winIdx)

      setTimeout(() => {
        // Rueda para
        setPhase('result')
        setResultNumber(winNum)
        setResultColor(winColor)
        setHistory(prev => [winNum!, ...prev].slice(0, 30))
        setTotalPayout(netPayout)
        setTotalWon(anyWin)
        setLastBets(betsSnap)
        setSpinning(false)

        // +1s: mostrar Ganado y ajustar balance
        setTimeout(() => {
          setPhase('payout')
          setShowPayout(true)
          setShowResult(true)
          const betTotal = betsSnap.reduce((s, b) => s + b.amount, 0)
          setDisplayBalance(prev => (prev !== null ? prev : 0) - betTotal + (netPayout ?? 0))

          // +3s: limpiar — volver a idle
          setTimeout(() => {
            setBets([])
            setLastBets([])
            setShowResult(false)
            setShowPayout(false)
            setPhase('idle')
            setTimeout(() => { setResultNumber(null); setResultColor(null) }, 300)
          }, 3000)
        }, 1000)
      }, 6200)
      return
    }
    // Modo multijugador
    if (!roundId || hasBetThisRound || roundStatus !== 'betting') return
    try {
      const res = await fetch('/api/roulette/round/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          round_id: roundId,
          bets: bets.map(b => ({ bet_type: b.type, bet_value: b.value, amount: b.amount })),
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error === 'La ventana de apuestas cerro' ? 'La ventana cerr\u00f3' : data.error)
        return
      }
      setLastBets(bets)
      setHasBetThisRound(true)
      setWaitingForResult(true)
    } catch {
      setError('Error de conexi\u00f3n')
    }
  }

  const colorHex = (c: string) => c === 'red' ? '#cc2200' : c === 'green' ? '#15803d' : '#111'

  // Modo solo vs multijugador
  const isSolo = onlineCount <= 1

  // Estado del boton APOSTAR
  const canBet = isSolo
    ? bets.length > 0 && phase === 'idle'
    : roundStatus === 'betting' && !hasBetThisRound && bets.length > 0 && phase === 'idle'
  const btnLabel = spinning ? '...'
    : waitingForResult ? 'ESPERANDO'
    : hasBetThisRound  ? 'APOSTASTE'
    : isSolo ? 'GIRAR'
    : roundStatus === 'betting' ? `APOSTAR ${secondsRemaining}s`
    : roundStatus === 'spinning' ? 'GIRANDO'
    : 'CERRADO'

  // Color del countdown
  const countdownColor = secondsRemaining <= 10 ? '#f87171' : GOLD

  // Sincronizar displayBalance con balance del servidor (Realtime)
  useEffect(() => {
    if (!showPayout) setDisplayBalance(balance)
  }, [balance, showPayout])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Montserrat:wght@200;300;400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${DARK}; overflow-x: hidden; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulseGold { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.4) } 50% { box-shadow:0 0 0 8px rgba(212,175,55,0) } }
        @keyframes resultIn { from { opacity:0; transform:scale(0.7) } to { opacity:1; transform:scale(1) } }
        @keyframes shimmer { 0% { background-position:-200% center } 100% { background-position:200% center } }
        @keyframes winPulse { 0%,100% { box-shadow:0 0 6px rgba(212,175,55,0.5) } 50% { box-shadow:0 0 18px rgba(212,175,55,0.9) } }
        @keyframes countdownPulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }

        .chip-btn { transition:transform 0.15s ease,box-shadow 0.15s ease; cursor:pointer; }
        .chip-btn:hover { opacity:0.85; }
        .chip-btn.active { box-shadow:0 0 0 2.5px #D4AF37; outline:none; }

        .bet-cell { position:relative; transition:background 0.15s ease; cursor:pointer; user-select:none; }
        .bet-cell:hover { background:rgba(212,175,55,0.15) !important; }
        .bet-cell:active { background:rgba(212,175,55,0.25) !important; }
        .bet-cell.locked { pointer-events:none; opacity:0.85; }

        .split-h { position:absolute; z-index:10; cursor:pointer; }
        .split-v { position:absolute; z-index:10; cursor:pointer; }
        .split-corner { position:absolute; z-index:11; cursor:pointer; }

        .apostar-btn {
          background: linear-gradient(135deg, #f2ca50 0%, #b89124 50%, #f2ca50 100%);
          background-size: 200% 100%;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .apostar-btn:hover:not(:disabled) { animation:shimmer 1s linear infinite; transform:scale(1.02); box-shadow:0 0 40px rgba(212,175,55,0.5); }
        .apostar-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .apostar-btn.waiting { background: rgba(212,175,55,0.15); color: rgba(212,175,55,0.6); }

        .action-btn { transition:all 0.15s ease; cursor:pointer; }
        .action-btn:hover { background:rgba(255,255,255,0.1) !important; }
        .tab-btn { transition:all 0.2s ease; cursor:pointer; }
        .result-overlay { animation:resultIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
        .number-badge { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.6rem; font-weight:700; flex-shrink:0; }
        .win-cell { animation:winPulse 1.2s ease-in-out infinite; }
        .countdown-urgent { animation:countdownPulse 0.8s ease-in-out infinite; }
      `}</style>

      <main style={{ minHeight: '100dvh', background: DARK, fontFamily: "'Montserrat', sans-serif", maxWidth: '480px', margin: '0 auto', paddingBottom: '80px' }}>


        {/* --- HEADER --- */}
        <div style={{ background: 'rgba(10,10,10,0.95)', position: 'sticky', top: 0, zIndex: 90 }}>
          {/* Fila superior: logo + nombre | usuario */}
          <div style={{ padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(212,175,55,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img src='/logo-dorado.jpg' alt='HWA' style={{ height: '18px', width: 'auto' }} />
              <span style={{ fontSize: '0.7rem', color: GOLD, fontWeight: 600, letterSpacing: '0.08em' }}>SOPHIE</span>
            </div>
            <button onClick={() => setShowPayment(true)} style={{ width: '180px', height: '25px', background: 'linear-gradient(180deg,#2d7a4f 0%,#1e5c38 50%,#154d2e 100%)', border: 'none', borderBottom: '2px solid #0d3320', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', cursor: 'pointer', flexShrink: 0 }}><span style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 700 }}>Caja</span><span style={{ fontSize: '0.6rem', color: '#fff', opacity: 0.9 }}>Chip-$ {balance.toLocaleString('es-UY')}</span></button>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 3.6-7 8-7s8 3 8 7'/></svg><span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 600 }}>{username}</span></span>
          </div>
          <div style={{ padding: '2px 16px 3px' }}>
            <button onClick={() => router.push('/roulette')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>←</button>
          </div>
        </div>
        {/* --- RUEDA SVG --- */}
        <div style={{ background: "radial-gradient(ellipse at center, #1a0e00 0%, #0a0a0a 70%)", padding: "0px 12px 8px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: 'relative', width: 280, height: 280 }}>
            <svg width="280" height="280" viewBox="0 0 240 240" style={{ overflow: 'visible' }}>
              <defs>
                <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(212,175,55,0.1)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
                <filter id="shadow">
                  <feDropShadow dx="0" dy="4" stdDeviation="12" floodColor="rgba(0,0,0,0.8)" />
                </filter>
              </defs>
              <circle cx="120" cy="120" r="118" fill="#1a1200" stroke={GOLD} strokeWidth="2.5" />
              <circle cx="120" cy="120" r="112" fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="1" />
              <g ref={wheelRef} style={{ transformOrigin: '120px 120px', transform: 'rotate(-90deg)' }}>
                {WHEEL_ORDER.map((num, i) => {
                  const angle = (i / 37) * 360
                  const startAngle = (angle - 360/37/2) * Math.PI / 180
                  const endAngle   = (angle + 360/37/2) * Math.PI / 180
                  const r1 = 108, r2 = 20
                  const x1 = 120 + r1 * Math.cos(startAngle), y1 = 120 + r1 * Math.sin(startAngle)
                  const x2 = 120 + r1 * Math.cos(endAngle),   y2 = 120 + r1 * Math.sin(endAngle)
                  const x3 = 120 + r2 * Math.cos(endAngle),   y3 = 120 + r2 * Math.sin(endAngle)
                  const x4 = 120 + r2 * Math.cos(startAngle), y4 = 120 + r2 * Math.sin(startAngle)
                  const c = getColor(num)
                  const fill = c === 'green' ? '#0d5c1e' : c === 'red' ? '#8B0000' : '#111'
                  const midAngle = angle * Math.PI / 180
                  const rText = 97
                  const tx = Math.round((120 + rText * Math.cos(midAngle)) * 1000) / 1000
                  const ty = Math.round((120 + rText * Math.sin(midAngle)) * 1000) / 1000
                  return (
                    <g key={num}>
                      <path d={`M ${x1} ${y1} A ${r1} ${r1} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${r2} ${r2} 0 0 0 ${x4} ${y4} Z`}
                        fill={fill} stroke="rgba(212,175,55,0.3)" strokeWidth="0.6" />
                      <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                        fill="rgba(255,255,255,0.9)" fontSize="9" fontWeight="700"
                        fontFamily="Montserrat, sans-serif"
                        transform={`rotate(${angle + 90}, ${tx}, ${ty})`}>{num}</text>
                    </g>
                  )
                })}
                {WHEEL_ORDER.map((_, i) => {
                  const angle = ((i / 37) * 360 - 360/37/2) * Math.PI / 180
                  return (
                    <line key={`sep-${i}`}
                      x1={120 + 2 * Math.cos(angle)} y1={120 + 2 * Math.sin(angle)}
                      x2={120 + 108 * Math.cos(angle)} y2={120 + 108 * Math.sin(angle)}
                      stroke="rgba(212,175,55,0.6)" strokeWidth="0.8" />
                  )
                })}
              </g>
              {/* Media esfera central — dorada en reposo, color resultado al girar */}
              <defs>
                <radialGradient id="centerGrad" cx="38%" cy="32%" r="65%">
                  <stop offset="0%" stopColor={resultNumber !== null && !spinning ? "#fff" : "#f5d060"} stopOpacity="0.9"/>
                  <stop offset="50%" stopColor={resultNumber !== null && !spinning ? colorHex(resultColor ?? "black") : GOLD}/>
                  <stop offset="100%" stopColor={resultNumber !== null && !spinning ? colorHex(resultColor ?? "black") : "#7a5a10"}/>
                </radialGradient>
              </defs>
              <circle cx="120" cy="120" r="18" fill="url(#centerGrad)" stroke={GOLD} strokeWidth="1.2"/>
              
              {resultNumber !== null && !spinning && (
                <text x="120" y="120" textAnchor="middle" dominantBaseline="central"
                  fill="#fff" fontSize="26" fontWeight="700" fontFamily="Cormorant Garamond, serif">
                  {resultNumber}
                </text>
              )}
              <polygon points="120,16 117.5,6 122.5,6" fill={GOLD} filter="url(#shadow)" />
              <circle cx="120" cy="16" r="2" fill="#0d0d0d" />
            </svg>
          </div>

          {/* COUNTDOWN + INFO DE RONDA */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            {/* Countdown */}
            <div style={{ textAlign: 'center', minWidth: '60px' }}>
              <p style={{ fontSize: '0.42rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>
                {!isSolo && (roundStatus === 'betting' ? 'CIERRA EN' : roundStatus === 'spinning' ? 'GIRANDO' : 'NUEVA RONDA')}
              </p>
              {roundStatus === 'betting' && !isSolo && (
                <p className={secondsRemaining <= 10 ? 'countdown-urgent' : ''} style={{ fontSize: '1.4rem', color: countdownColor, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>
                  {secondsRemaining} s
                </p>
              )}
              {roundStatus === 'spinning' && (
                <p style={{ fontSize: '0.7rem', color: GOLD, letterSpacing: '0.1em' }}>...</p>
              )}
            </div>

            {/* Estado de la apuesta del usuario */}
            {hasBetThisRound && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.42rem', letterSpacing: '0.15em', color: 'rgba(212,175,55,0.6)' }}>{'\u2713'} APOSTASTE</p>
              </div>
            )}
          </div>
          </div>{/* fin rueda */}
        </div>{/* fin zona rueda */}

        {/* --- FICHAS HORIZONTALES --- */}
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", gap: "8px", padding: "0 16px 4px", background: DARK }}>
          {CHIP_DEFS.map(chip => {
            const isActive = selectedChip.value === chip.value
            return (
              <button key={chip.value} className={`chip-btn${isActive ? " active" : ""}`}
                onClick={() => setSelectedChip(chip)}
                style={{ width: 34, height: 34, borderRadius: "50%", background: isActive ? `radial-gradient(circle at 35% 35%, #f5d060, ${GOLD} 50%, #a07820)` : `radial-gradient(circle at 35% 35%, #e8c540, ${GOLD} 55%, #8a6510)`, border: `2px dashed ${isActive ? "#fff" : CHIP_BORDER}`, color: chip.color, fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: "0.6rem", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isActive ? `0 0 10px rgba(212,175,55,0.8)` : `0 2px 6px rgba(0,0,0,0.6)`, cursor: "pointer" }}>
                {chip.label}
              </button>
            )
          })}
        </div>

        {/* --- BOTONERA: ACCIONES + GIRAR (encima del paño) --- */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'stretch', padding: '4px 16px 4px' }}>

          {[
            { label: 'Limpiar', action: clearBets  },
            { label: 'Borrar',  action: removeLast },
            { label: 'Doblar',  action: doubleBets },
            { label: 'Repetir', action: repeatBets },
          ].map(btn => (
            <button key={btn.label} className="action-btn" onClick={btn.action}
              style={{
                flex: 1,
                background: hasBetThisRound
                  ? 'rgba(120,20,20,0.3)'
                  : 'linear-gradient(180deg, #c0392b 0%, #922b21 50%, #7b241c 100%)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderBottom: hasBetThisRound ? '1px solid rgba(255,255,255,0.08)' : '3px solid #5c1a14',
                borderRadius: '4px',
                padding: '6px 2px',
                color: hasBetThisRound ? 'rgba(255,255,255,0.3)' : '#fff',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                fontSize: '0.42rem',
                letterSpacing: '0.04em',
                cursor: hasBetThisRound ? 'not-allowed' : 'pointer',
                opacity: hasBetThisRound ? 0.5 : 1,
                textShadow: hasBetThisRound ? 'none' : '0 1px 2px rgba(0,0,0,0.6)',
                boxShadow: hasBetThisRound ? 'none' : '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
                transition: 'all 0.15s ease',
              }}>
              {btn.label}
            </button>
          ))}
          <button
            className={`apostar-btn${(waitingForResult || hasBetThisRound) ? ' waiting' : ''}`}
            onClick={placeBets}
            disabled={!canBet}
            style={{
              flex: '0 0 90px',
              background: !canBet
                ? 'linear-gradient(180deg, #555 0%, #333 50%, #222 100%)'
                : waitingForResult || hasBetThisRound
                  ? 'rgba(80,60,0,0.3)'
                  : 'linear-gradient(180deg, #f5d060 0%, #d4af37 50%, #a07820 100%)',
              border: !canBet ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(212,175,55,0.4)',
              borderBottom: !canBet ? '3px solid #111' : '3px solid #7a5a10',
              borderRadius: '4px',
              color: !canBet ? 'rgba(255,255,255,0.3)' : waitingForResult || hasBetThisRound ? 'rgba(212,175,55,0.4)' : '#1a0e00',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 900,
              letterSpacing: '0.08em',
              boxShadow: !canBet ? '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' : '0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px rgba(212,175,55,0.2)',
              textShadow: canBet ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '1px', padding: '4px 0',
              cursor: canBet ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
            }}>
            <span style={{ fontSize: '0.55rem' }}>{btnLabel}</span>
            {!isSolo && onlineCount >= 2 && (
              <span style={{ fontSize: '0.38rem', opacity: 0.7 }}>👥 {onlineCount}</span>
            )}
          </button>
        </div>


        {/* === MESA DE APUESTAS === */}
        <div style={{ margin: '0 16px 6px', overflowX: 'auto' }}>
          <div
            ref={tableRef}
            style={{
              position: 'relative',
              background: `radial-gradient(ellipse at center, #0d4a2a 0%, ${GREEN_FELT} 60%, #051d11 100%)`,
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: '6px',
              padding: '12px',
              minWidth: '320px',
              opacity: (roundStatus !== 'betting' || hasBetThisRound) ? 0.7 : 1,
              transition: 'opacity 0.3s ease',
            }}
          >
            {/* Fichas flotantes de apuestas actuales */}
            {bets.map(bet => (
              <FloatingChip key={bet.id} bet={bet}
                winning={resultNumber !== null && !showResult && isWinningBet(bet, resultNumber)} />
            ))}
            {/* Fichas de la ultima ronda durante overlay */}
            {showResult && lastBets.map(bet => (
              <FloatingChip key={`last-${bet.id}`} bet={bet}
                winning={resultNumber !== null && isWinningBet(bet, resultNumber)} />
            ))}

            {/* FILA: 0 + GRID + 2:1 */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div
                  className={`bet-cell${(roundStatus !== 'betting' || hasBetThisRound) ? ' locked' : ''}${getBetOn('number:0') > 0 && resultNumber !== null && !showResult && resultNumber === 0 ? ' win-cell' : ''}`}
                  onClick={e => addBet('number', '0', e)}
                  style={{
                    width: 32, height: 90,
                    background: getBetOn('number:0') > 0 ? 'rgba(15,92,30,0.8)' : 'rgba(15,92,30,0.4)',
                    border: `1px solid ${resultNumber === 0 && !showResult ? GOLD : 'rgba(212,175,55,0.3)'}`,
                    boxShadow: resultNumber === 0 && !showResult ? `0 0 10px rgba(212,175,55,0.5)` : 'none',
                    borderRadius: '4px 0 0 4px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  }}
                >
                  <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '1rem' }}>0</span>
                </div>
              </div>

              <NumberGrid
                TABLE_COLS={TABLE_COLS}
                getBetOn={getBetOn}
                addBet={addBet}
                resultNumber={resultNumber}
                showResult={showResult}
                bets={bets}
                lastBets={lastBets}
                locked={roundStatus !== 'betting' || hasBetThisRound}
              />

              {/* Columnas 2:1 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {(['3', '2', '1'] as const).map(col => {
                  const id = `column:${col}`
                  const won = resultNumber !== null && !showResult && getBetOn(id) > 0 && isWinningBet({ id, type: 'column', value: col, amount: getBetOn(id), chipX: 0, chipY: 0 }, resultNumber)
                  return (
                    <div key={col} className={`bet-cell${won ? ' win-cell' : ''}${(roundStatus !== 'betting' || hasBetThisRound) ? ' locked' : ''}`}
                      onClick={e => addBet('column', col, e)}
                      style={{ width: 28, flex: 1, background: getBetOn(id) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)', border: `1px solid ${won ? GOLD : getBetOn(id) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`, boxShadow: won ? `0 0 8px rgba(212,175,55,0.4)` : 'none', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: won ? GOLD : 'rgba(212,175,55,0.7)', fontSize: '0.35rem', letterSpacing: '0.05em', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>2:1</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* DOCENAS */}
            <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 28px', gap: '2px', marginTop: '4px' }}>
              <div />
              {[{ v: '1', l: '1a DOCENA' }, { v: '2', l: '2a DOCENA' }, { v: '3', l: '3a DOCENA' }].map(d => {
                const id = `dozen:${d.v}`
                const won = resultNumber !== null && !showResult && getBetOn(id) > 0 && isWinningBet({ id, type: 'dozen', value: d.v, amount: getBetOn(id), chipX: 0, chipY: 0 }, resultNumber)
                return (
                  <div key={d.v} className={`bet-cell${won ? ' win-cell' : ''}${(roundStatus !== 'betting' || hasBetThisRound) ? ' locked' : ''}`}
                    onClick={e => addBet('dozen', d.v, e)}
                    style={{ height: 24, background: getBetOn(id) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)', border: `1px solid ${won ? GOLD : getBetOn(id) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`, boxShadow: won ? `0 0 8px rgba(212,175,55,0.4)` : 'none', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: won ? GOLD : 'rgba(212,175,55,0.7)', fontSize: '0.38rem', letterSpacing: '0.1em', fontWeight: 600 }}>{d.l}</span>
                  </div>
                )
              })}
              <div />
            </div>

            {/* EXTERNAS */}
            <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 1fr 1fr 1fr 28px', gap: '2px', marginTop: '2px' }}>
              <div />
              {[
                { type: 'half'   as const, val: 'low',  label: '1-18' },
                { type: 'parity' as const, val: 'even', label: 'PAR' },
              ].map(b => {
                const id = `${b.type}:${b.val}`
                const won = resultNumber !== null && !showResult && getBetOn(id) > 0 && isWinningBet({ id, type: b.type, value: b.val, amount: getBetOn(id), chipX: 0, chipY: 0 }, resultNumber)
                return (
                  <div key={b.val} className={`bet-cell${won ? ' win-cell' : ''}${(roundStatus !== 'betting' || hasBetThisRound) ? ' locked' : ''}`}
                    onClick={e => addBet(b.type, b.val, e)}
                    style={{ height: 24, background: getBetOn(id) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)', border: `1px solid ${won ? GOLD : 'rgba(212,175,55,0.2)'}`, boxShadow: won ? `0 0 8px rgba(212,175,55,0.4)` : 'none', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: won ? GOLD : 'rgba(212,175,55,0.7)', fontSize: '0.38rem', letterSpacing: '0.1em', fontWeight: 600 }}>{b.label}</span>
                  </div>
                )
              })}
              {(() => {
                const id = 'color:red'
                const won = resultNumber !== null && !showResult && getBetOn(id) > 0 && isWinningBet({ id, type: 'color', value: 'red', amount: getBetOn(id), chipX: 0, chipY: 0 }, resultNumber)
                return (
                  <div className={`bet-cell${won ? ' win-cell' : ''}${(roundStatus !== 'betting' || hasBetThisRound) ? ' locked' : ''}`}
                    onClick={e => addBet('color', 'red', e)}
                    style={{ height: 24, background: getBetOn(id) > 0 ? 'rgba(180,0,0,0.6)' : 'rgba(120,0,0,0.4)', border: `1px solid ${won ? GOLD : 'rgba(255,255,255,0.1)'}`, boxShadow: won ? `0 0 10px rgba(212,175,55,0.5)` : 'none', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: won ? GOLD : '#fca5a5', fontSize: '0.7rem' }}>{'\u25C6'}</span>
                  </div>
                )
              })()}
              {(() => {
                const id = 'color:black'
                const won = resultNumber !== null && !showResult && getBetOn(id) > 0 && isWinningBet({ id, type: 'color', value: 'black', amount: getBetOn(id), chipX: 0, chipY: 0 }, resultNumber)
                return (
                  <div className={`bet-cell${won ? ' win-cell' : ''}${(roundStatus !== 'betting' || hasBetThisRound) ? ' locked' : ''}`}
                    onClick={e => addBet('color', 'black', e)}
                    style={{ height: 24, background: getBetOn(id) > 0 ? 'rgba(50,50,50,0.8)' : 'rgba(20,20,20,0.6)', border: `1px solid ${won ? GOLD : 'rgba(255,255,255,0.1)'}`, boxShadow: won ? `0 0 10px rgba(212,175,55,0.5)` : 'none', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: won ? GOLD : 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>{'\u25C6'}</span>
                  </div>
                )
              })()}
              {[
                { type: 'parity' as const, val: 'odd',  label: 'IMPAR' },
                { type: 'half'   as const, val: 'high', label: '19-36' },
              ].map(b => {
                const id = `${b.type}:${b.val}`
                const won = resultNumber !== null && !showResult && getBetOn(id) > 0 && isWinningBet({ id, type: b.type, value: b.val, amount: getBetOn(id), chipX: 0, chipY: 0 }, resultNumber)
                return (
                  <div key={b.val} className={`bet-cell${won ? ' win-cell' : ''}${(roundStatus !== 'betting' || hasBetThisRound) ? ' locked' : ''}`}
                    onClick={e => addBet(b.type, b.val, e)}
                    style={{ height: 24, background: getBetOn(id) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)', border: `1px solid ${won ? GOLD : 'rgba(212,175,55,0.2)'}`, boxShadow: won ? `0 0 8px rgba(212,175,55,0.4)` : 'none', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: won ? GOLD : 'rgba(212,175,55,0.7)', fontSize: '0.38rem', letterSpacing: '0.1em', fontWeight: 600 }}>{b.label}</span>
                  </div>
                )
              })}
              <div />
            </div>
          </div>
        </div>

        {/* --- HISTÓRICOS + CALIENTES/FRÍOS debajo del paño --- */}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", padding: "2px 16px 10px" }}>

          {/* LÍNEA 1: HISTORIAL — todo el ancho */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "3px", flexWrap: "nowrap", overflow: "hidden" }}>
            <span style={{ fontSize: "0.55rem", marginRight: "3px", flexShrink: 0 }}>📋</span>
            {history.slice(0, 20).map((n, i) => (
              <div key={i} className="number-badge" style={{ background: colorHex(getColor(n)), border: "1px solid rgba(255,255,255,0.1)", width: "22px", height: "22px", fontSize: "0.45rem", flexShrink: 0, opacity: 1 - i * 0.04 }}>
                <span style={{ color: "#fff", fontWeight: 700 }}>{n}</span>
              </div>
            ))}
          </div>

          {/* LÍNEA 2: CALIENTES izquierda | FRÍOS derecha */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "0.55rem", marginRight: "2px" }}>🔥</span>
              {MOCK_HOT.map((n) => (
                <div key={n} className="number-badge" style={{ background: colorHex(getColor(n)), border: "1px solid rgba(255,255,255,0.15)", width: "22px", height: "22px", fontSize: "0.45rem" }}>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{n}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "4px" }}>
              {MOCK_COLD.map((n) => (
                <div key={n} className="number-badge" style={{ background: colorHex(getColor(n)), border: "1px solid rgba(255,255,255,0.1)", width: "22px", height: "22px", fontSize: "0.45rem", opacity: 0.8 }}>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{n}</span>
                </div>
              ))}
              <span style={{ fontSize: "0.55rem", marginLeft: "2px" }}>❄️</span>
            </div>
          </div>

        </div>

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        userId={userId}
        username={username}
        balances={{}}
      />
      </main>
    </>
  )
}

// ===
// COMPONENTE: Grid de numeros con splits superpuestos
// ===
type NumberGridProps = {
  TABLE_COLS: [number, number, number][]
  getBetOn: (id: string) => number
  addBet: (type: BetType, value: string, e: React.MouseEvent) => void
  resultNumber: number | null
  showResult: boolean
  bets: Bet[]
  lastBets: Bet[]
  locked: boolean
}

function NumberGrid({ TABLE_COLS, getBetOn, addBet, resultNumber, showResult, bets, lastBets, locked }: NumberGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)

  function isNumWinning(num: number): boolean {
    return resultNumber !== null && !showResult && resultNumber === num
  }

  function isSplitWinning(id: string): boolean {
    if (resultNumber === null || showResult) return false
    const allBets = [...bets, ...lastBets]
    const bet = allBets.find(b => b.id === id)
    if (!bet) return false
    return isWinningBet(bet, resultNumber)
  }

  function getSplitBet(nums: number[]): number {
    const sorted = [...nums].sort((a, b) => a - b)
    const id = nums.length === 2 ? `split2:${sorted.join('-')}` : `split4:${sorted.join('-')}`
    return getBetOn(id)
  }

  function addSplitBet(nums: number[], e: React.MouseEvent) {
    e.stopPropagation()
    const sorted = [...nums].sort((a, b) => a - b)
    const type: BetType = nums.length === 2 ? 'split2' : 'split4'
    const value = sorted.join('-')
    addBet(type, value, e)
  }

  return (
    <div ref={gridRef} style={{ flex: 1, position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '2px', height: '100%' }}>
        {[0, 1, 2].flatMap(row =>
          TABLE_COLS.map((col, ci) => {
            const num = col[row]
            const c = getColor(num)
            const betAmt = getBetOn(`number:${num}`)
            const winning = isNumWinning(num)
            return (
              <div key={num}
                className={`bet-cell${winning ? ' win-cell' : ''}${locked ? ' locked' : ''}`}
                onClick={e => addBet('number', String(num), e)}
                style={{ background: betAmt > 0 ? c === 'red' ? 'rgba(180,0,0,0.7)' : 'rgba(30,30,30,0.9)' : c === 'red' ? 'rgba(120,0,0,0.5)' : 'rgba(15,15,15,0.5)', border: `1px solid ${winning ? GOLD : betAmt > 0 ? GOLD : 'rgba(255,255,255,0.08)'}`, boxShadow: winning ? `0 0 10px rgba(212,175,55,0.6)` : 'none', borderRadius: '2px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '28px', padding: '2px', position: 'relative' }}>
                <span style={{ color: c === 'red' ? '#fca5a5' : 'rgba(255,255,255,0.8)', fontSize: '0.55rem', fontWeight: 600, lineHeight: 1 }}>{num}</span>
              </div>
            )
          })
        )}
      </div>
      <SplitOverlay TABLE_COLS={TABLE_COLS} getBetOn={getBetOn} addSplitBet={addSplitBet} isSplitWinning={isSplitWinning} locked={locked} />
    </div>
  )
}

function SplitOverlay({
  TABLE_COLS, getBetOn, addSplitBet, isSplitWinning, locked,
}: {
  TABLE_COLS: [number, number, number][]
  getBetOn: (id: string) => number
  addSplitBet: (nums: number[], e: React.MouseEvent) => void
  isSplitWinning: (id: string) => boolean
  locked: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDims({ w: width, h: height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  if (dims.w === 0) return <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

  const COLS = 12, ROWS = 3, GAP = 2
  const cellW = (dims.w - GAP * (COLS - 1)) / COLS
  const cellH = (dims.h - GAP * (ROWS - 1)) / ROWS

  function cx(col: number) { return col * (cellW + GAP) + cellW / 2 }
  function cy(row: number) { return row * (cellH + GAP) + cellH / 2 }
  function bx(col: number) { return col * (cellW + GAP) + cellW + GAP / 2 }
  function by(row: number) { return row * (cellH + GAP) + cellH + GAP / 2 }
  function numAt(col: number, row: number) { return TABLE_COLS[col][row] }

  const HIT = 8
  const splits: React.ReactNode[] = []

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS - 1; row++) {
      const n1 = numAt(col, row), n2 = numAt(col, row + 1)
      const sorted = [n1, n2].sort((a, b) => a - b)
      const id = `split2:${sorted.join('-')}`
      const hasBet = getBetOn(id) > 0, winning = isSplitWinning(id)
      splits.push(
        <rect key={id} x={col * (cellW + GAP)} y={by(row) - HIT / 2} width={cellW} height={HIT}
          fill={winning ? 'rgba(212,175,55,0.4)' : hasBet ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.02)'}
          style={{ cursor: locked ? 'default' : 'pointer', pointerEvents: locked ? 'none' : 'all' }}
          onClick={e => addSplitBet([n1, n2], e as unknown as React.MouseEvent)} />
      )
      if (winning) splits.push(<circle key={`${id}-w`} cx={cx(col)} cy={by(row)} r={5} fill={GOLD} opacity={0.9} style={{ pointerEvents: 'none' }} />)
    }
  }

  for (let col = 0; col < COLS - 1; col++) {
    for (let row = 0; row < ROWS; row++) {
      const n1 = numAt(col, row), n2 = numAt(col + 1, row)
      const sorted = [n1, n2].sort((a, b) => a - b)
      const id = `split2:${sorted.join('-')}`
      const hasBet = getBetOn(id) > 0, winning = isSplitWinning(id)
      splits.push(
        <rect key={id} x={bx(col) - HIT / 2} y={row * (cellH + GAP)} width={HIT} height={cellH}
          fill={winning ? 'rgba(212,175,55,0.4)' : hasBet ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.02)'}
          style={{ cursor: locked ? 'default' : 'pointer', pointerEvents: locked ? 'none' : 'all' }}
          onClick={e => addSplitBet([n1, n2], e as unknown as React.MouseEvent)} />
      )
      if (winning) splits.push(<circle key={`${id}-w`} cx={bx(col)} cy={cy(row)} r={5} fill={GOLD} opacity={0.9} style={{ pointerEvents: 'none' }} />)
    }
  }

  for (let col = 0; col < COLS - 1; col++) {
    for (let row = 0; row < ROWS - 1; row++) {
      const nums = [numAt(col, row), numAt(col+1, row), numAt(col, row+1), numAt(col+1, row+1)]
      const sorted = [...nums].sort((a, b) => a - b)
      const id = `split4:${sorted.join('-')}`
      const hasBet = getBetOn(id) > 0, winning = isSplitWinning(id)
      const px = bx(col), py = by(row)
      splits.push(
        <circle key={id} cx={px} cy={py} r={HIT}
          fill={winning ? 'rgba(212,175,55,0.5)' : hasBet ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.03)'}
          style={{ cursor: locked ? 'default' : 'pointer', pointerEvents: locked ? 'none' : 'all' }}
          onClick={e => addSplitBet(nums, e as unknown as React.MouseEvent)} />
      )
      if (winning) splits.push(<circle key={`${id}-w`} cx={px} cy={py} r={4} fill={GOLD} style={{ pointerEvents: 'none' }} />)
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg width={dims.w} height={dims.h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {splits}
      </svg>
    </div>
  )
}








