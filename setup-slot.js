// setup-slot.js — HWA Casino Slot Engine
// node setup-slot.js
const fs   = require('fs')
const path = require('path')
const ROOT = path.join('C:\\', 'Carlos', 'HWA', 'hwacasino', 'src')

function write(rel, content) {
  const full = path.join(ROOT, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf8')
  console.log('OK ' + rel)
}

// ────────────────────────────────────────────────────────────
// 1. ENGINE
// ────────────────────────────────────────────────────────────
write('lib/slot/engine.ts', `
export type SymbolId = 'CH'|'LM'|'OR'|'BL'|'DM'|'ST'|'AC'|'WD'|'SC'

export interface SymbolDef {
  id: SymbolId; label: string; bg: string; fg: string
  weight: number; paytable: [number,number,number]
  isWild?: boolean; isScatter?: boolean
}

export const SYMBOLS: Record<SymbolId, SymbolDef> = {
  CH: { id:'CH', label:'🍒', bg:'#7f1d1d', fg:'#fca5a5', weight:22, paytable:[0.5,  1,    2  ] },
  LM: { id:'LM', label:'🍋', bg:'#713f12', fg:'#fde68a', weight:18, paytable:[0.5,  1,    2  ] },
  OR: { id:'OR', label:'🍊', bg:'#7c2d12', fg:'#fdba74', weight:15, paytable:[0.75, 1.5,  3  ] },
  BL: { id:'BL', label:'🔔', bg:'#1e3a5f', fg:'#93c5fd', weight:12, paytable:[1,    2,    5  ] },
  DM: { id:'DM', label:'💎', bg:'#164e63', fg:'#67e8f9', weight:8,  paytable:[2,    5,    15 ] },
  ST: { id:'ST', label:'⭐', bg:'#3b0764', fg:'#d8b4fe', weight:6,  paytable:[3,    8,    25 ] },
  AC: { id:'AC', label:'🃏', bg:'#1c1917', fg:'#e7e5e4', weight:5,  paytable:[5,    15,   50 ] },
  WD: { id:'WD', label:'★',  bg:'#78350f', fg:'#D4AF37', weight:3,  paytable:[10,   25,   100], isWild:true },
  SC: { id:'SC', label:'◈',  bg:'#14532d', fg:'#86efac', weight:3,  paytable:[0,    0,    0  ], isScatter:true },
}

export const COLS = 5
export const ROWS = 5
export const CASCADE_MULTS = [1, 2, 3, 5, 8, 10]
export const SCATTER_FS: Record<number,number> = { 3:10, 4:15, 5:20 }

export interface WinLine {
  sym: SymbolId; run: number; ways: number; payout: number; cells: string[]
}
export interface CascadeStep {
  grid: SymbolId[][]; wins: WinLine[]; winCells: string[]; winAmount: number; multiplier: number
}
export interface SpinResult {
  grid: SymbolId[][]; wins: WinLine[]; winCells: string[]
  initialWin: number; cascades: CascadeStep[]; totalWin: number
  scatterCount: number; freeSpinsTriggered: number
}

function pick(weights: Record<string,number>): SymbolId {
  const total = Object.values(weights).reduce((a,b)=>a+b,0)
  let r = Math.random() * total
  for (const [id, w] of Object.entries(weights)) { r -= w; if (r <= 0) return id as SymbolId }
  return 'CH'
}

function makeGrid(w: Record<string,number>): SymbolId[][] {
  return Array.from({length:COLS}, ()=>Array.from({length:ROWS}, ()=>pick(w)))
}

function evalWins(grid: SymbolId[][], bet: number, mult: number) {
  const wins: WinLine[] = []
  const cellSet = new Set<string>()
  const syms = (Object.keys(SYMBOLS) as SymbolId[]).filter(s=>!SYMBOLS[s].isWild && !SYMBOLS[s].isScatter)
  for (const sym of syms) {
    const reelCnts: number[] = []
    for (let c=0; c<COLS; c++) {
      const cnt = grid[c].filter(s=>s===sym||!!SYMBOLS[s].isWild).length
      if (cnt>0) reelCnts.push(cnt); else break
    }
    const run = reelCnts.length
    if (run < 3) continue
    const ways = reelCnts.reduce((a,b)=>a*b,1)
    const payout = Math.floor(SYMBOLS[sym].paytable[Math.min(run-3,2)] * bet * ways * mult)
    const cells: string[] = []
    for (let c=0; c<run; c++)
      for (let r=0; r<ROWS; r++)
        if (grid[c][r]===sym||SYMBOLS[grid[c][r]].isWild) { cells.push(c+'-'+r); cellSet.add(c+'-'+r) }
    wins.push({sym, run, ways, payout, cells})
  }
  return { wins, winCells:[...cellSet], winAmount: wins.reduce((s,w)=>s+w.payout,0) }
}

function cascade(grid: SymbolId[][], wc: string[], w: Record<string,number>): SymbolId[][] {
  return grid.map((col,ci)=>{
    const keep = col.filter((_,ri)=>!wc.includes(ci+'-'+ri))
    const fresh = Array.from({length:ROWS-keep.length}, ()=>pick(w))
    return [...fresh,...keep]
  })
}

export function runSpin(weights: Record<string,number>, bet: number): SpinResult {
  const grid = makeGrid(weights)
  const init = evalWins(grid, bet, CASCADE_MULTS[0])
  const scatterCount = grid.flat().filter(s=>s==='SC').length
  const cascades: CascadeStep[] = []
  let cur = grid, curWC = init.winCells, total = init.winAmount, ci = 1
  while (init.winAmount>0 && curWC.length>0 && ci<CASCADE_MULTS.length) {
    cur = cascade(cur, curWC, weights)
    const step = evalWins(cur, bet, CASCADE_MULTS[ci])
    if (step.winAmount===0) break
    cascades.push({grid:cur, wins:step.wins, winCells:step.winCells, winAmount:step.winAmount, multiplier:CASCADE_MULTS[ci]})
    total += step.winAmount; curWC = step.winCells; ci++
  }
  return {
    grid, wins:init.wins, winCells:init.winCells, initialWin:init.winAmount,
    cascades, totalWin:total, scatterCount, freeSpinsTriggered: SCATTER_FS[scatterCount]??0
  }
}

export function defaultWeights(): Record<string,number> {
  return Object.fromEntries((Object.keys(SYMBOLS) as SymbolId[]).map(id=>[id,SYMBOLS[id].weight]))
}
`)

// ────────────────────────────────────────────────────────────
// 2. API ROUTE
// ────────────────────────────────────────────────────────────
write('app/api/slot/spin/route.ts', `
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runSpin, defaultWeights } from '@/lib/slot/engine'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { user_id, bet, is_free_spin = false } = await req.json()
    if (!user_id || !bet || bet < 1)
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })

    const { data: wallet } = await supabase
      .from('wallets').select('id, balances').eq('user_id', user_id).single()
    if (!wallet)
      return NextResponse.json({ error: 'Wallet no encontrada' }, { status: 404 })

    const balance = Number(wallet.balances?.CHIPS ?? 0)
    const effectiveBet = is_free_spin ? 0 : bet

    if (!is_free_spin && balance < bet)
      return NextResponse.json({ error: 'Saldo insuficiente', code: 'INSUFFICIENT_FUNDS' }, { status: 402 })

    const { data: cfg } = await supabase
      .from('slot_configs').select('symbol_weights').eq('game_id', 'hwa-5x5').single()

    const weights = cfg?.symbol_weights && Object.keys(cfg.symbol_weights).length > 0
      ? cfg.symbol_weights : defaultWeights()

    const result = runSpin(weights, bet)
    const netChips  = result.totalWin - effectiveBet
    const newBalance = balance + netChips

    await supabase.from('wallets')
      .update({ balances: { ...wallet.balances, CHIPS: newBalance } })
      .eq('id', wallet.id)

    if (netChips !== 0) {
      await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id, user_id,
        type: result.totalWin > 0 ? 'win' : 'bet',
        currency: 'CHIPS', amount: netChips,
        description: is_free_spin ? 'Slot free spin' : 'Slot spin bet: '+bet,
        metadata: { game_id:'hwa-5x5', bet, win:result.totalWin, cascades:result.cascades.length, is_free_spin }
      })
    }

    await supabase.from('slot_spins').insert({
      user_id, game_id:'hwa-5x5',
      bet_chips: effectiveBet, win_chips: result.totalWin,
      grid: result.grid, wins: result.wins, cascade_steps: result.cascades,
      cascade_count: result.cascades.length,
      max_multiplier: result.cascades.length > 0 ? result.cascades[result.cascades.length-1].multiplier : 1,
      scatter_count: result.scatterCount, is_free_spin,
      free_spins_triggered: result.freeSpinsTriggered,
      balance_before: balance, balance_after: newBalance
    })

    return NextResponse.json({ ...result, balanceBefore:balance, balanceAfter:newBalance, netChips })
  } catch (e: any) {
    console.error('[slot/spin]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
`)

// ────────────────────────────────────────────────────────────
// 3. SLOT PAGE
// ────────────────────────────────────────────────────────────
write('app/slot/page.tsx', `
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useWallet } from '@/hooks/useWallet'
import PaymentModal from '@/components/PaymentModal'
import { SYMBOLS, COLS, ROWS, type SymbolId, type SpinResult } from '@/lib/slot/engine'

const GOLD = '#D4AF37'
const BET_OPTIONS = [10, 25, 50, 100, 250, 500]
const SPIN_MS     = 1400   // min animation time
const STOP_DELAY  = 220    // ms between each reel stopping
const WIN_FLASH   = 900
const CASCADE_WAIT = 700

function randomSym(): SymbolId {
  const ids = Object.keys(SYMBOLS) as SymbolId[]
  return ids[Math.floor(Math.random() * ids.length)]
}

function initGrid(): SymbolId[][] {
  return Array.from({length:COLS}, ()=>Array.from({length:ROWS}, ()=>randomSym()))
}

type Phase = 'idle'|'spinning'|'revealing'|'wins'|'cascading'|'done'

export default function SlotPage() {
  const router    = useRouter()
  const { balance, balances, username, loading } = useWallet('CHIPS')
  const [userId, setUserId] = useState<string|null>(null)
  const [grid, setGrid]     = useState<SymbolId[][]>(initGrid)
  const [phase, setPhase]   = useState<Phase>('idle')
  const [winCells, setWinCells] = useState<Set<string>>(new Set())
  const [stoppedCols, setStoppedCols] = useState<Set<number>>(new Set())
  const [totalWin, setTotalWin] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [freeSpins, setFreeSpins] = useState(0)
  const [isFreeSpinning, setIsFreeSpinning] = useState(false)
  const [bet, setBet]       = useState(50)
  const [showShop, setShowShop] = useState(false)
  const [winDisplay, setWinDisplay] = useState(0)
  const [spinResult, setSpinResult] = useState<SpinResult|null>(null)
  const spinInterval = useRef<NodeJS.Timeout|null>(null)
  const pendingResult = useRef<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({data:{user}})=>setUserId(user?.id??null))
  }, [])

  // Cycle random symbols during spin
  useEffect(() => {
    if (phase !== 'spinning') return
    spinInterval.current = setInterval(() => {
      setGrid(g => g.map((col, ci) =>
        stoppedCols.has(ci) ? col : col.map(()=>randomSym())
      ))
    }, 80)
    return () => { if (spinInterval.current) clearInterval(spinInterval.current) }
  }, [phase, stoppedCols])

  const stopReelsSequentially = useCallback((result: any) => {
    const finalGrid = result.grid as SymbolId[][]
    setPhase('revealing')
    const stopped = new Set<number>()
    for (let col = 0; col < COLS; col++) {
      const c = col
      setTimeout(() => {
        stopped.add(c)
        setStoppedCols(new Set(stopped))
        setGrid(g => g.map((existing, ci) => ci === c ? finalGrid[c] : existing))
        if (c === COLS - 1) {
          // All stopped — process wins
          setTimeout(()=> processWins(result, finalGrid, 1, 0), 300)
        }
      }, c * STOP_DELAY)
    }
  }, [])

  const processWins = useCallback(async (result: any, grid: SymbolId[][], mult: number, cascadeIdx: number) => {
    const wc = cascadeIdx === 0 ? result.winCells : (result.cascades[cascadeIdx-1]?.winCells ?? [])
    if (wc.length > 0) {
      setWinCells(new Set(wc))
      setMultiplier(mult)
      setPhase('wins')
      await delay(WIN_FLASH)
    }
    // Check if there's a cascade
    if (cascadeIdx < result.cascades.length) {
      const step = result.cascades[cascadeIdx]
      setPhase('cascading')
      setWinCells(new Set())
      await delay(CASCADE_WAIT)
      setGrid(step.grid as SymbolId[][])
      setWinDisplay(w => w + step.winAmount)
      await delay(300)
      await processWins(result, step.grid, step.multiplier, cascadeIdx + 1)
    } else {
      // Done
      setWinCells(new Set())
      setPhase('done')
      if (result.totalWin > 0) setWinDisplay(result.totalWin)
      if (result.freeSpinsTriggered > 0) {
        setFreeSpins(f => f + result.freeSpinsTriggered)
      }
      setTimeout(()=>{
        setPhase('idle')
        setWinDisplay(0)
        setMultiplier(1)
        // Auto-spin free spins
        if (freeSpins > 0) {
          setFreeSpins(f=>f-1)
          setIsFreeSpinning(true)
        }
      }, result.totalWin > 0 ? 1200 : 400)
    }
  }, [freeSpins])

  const spin = useCallback(async () => {
    if (phase !== 'idle' || !userId) return
    if (!isFreeSpinning && balance < bet) {
      setShowShop(true); return
    }
    setPhase('spinning')
    setStoppedCols(new Set())
    setWinDisplay(0)
    setWinCells(new Set())

    const [apiRes] = await Promise.all([
      fetch('/api/slot/spin', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ user_id: userId, bet, is_free_spin: isFreeSpinning }),
      }).then(r=>r.json()),
      delay(SPIN_MS)
    ])

    setIsFreeSpinning(false)
    if (apiRes.error) {
      setPhase('idle')
      if (apiRes.code === 'INSUFFICIENT_FUNDS') setShowShop(true)
      return
    }
    stopReelsSequentially(apiRes)
  }, [phase, userId, balance, bet, isFreeSpinning, stopReelsSequentially])

  // Auto-trigger free spins
  useEffect(() => {
    if (isFreeSpinning && phase === 'idle') spin()
  }, [isFreeSpinning, phase, spin])

  const canSpin = phase === 'idle' && !!userId && !loading
  const isWin   = winDisplay > 0

  return (
    <>
      <style>{\`
        @keyframes reel-blur {
          0%,100% { opacity:1 }
          50%      { opacity:0.3 }
        }
        @keyframes cell-win {
          0%,100% { box-shadow: inset 0 0 0 2px #D4AF37 }
          50%      { box-shadow: inset 0 0 0 3px #fff, 0 0 12px #D4AF37 }
        }
        @keyframes cascade-drop {
          from { transform: translateY(-100%); opacity:0 }
          to   { transform: translateY(0);    opacity:1 }
        }
        @keyframes win-pop {
          0%   { transform: scale(0.8); opacity:0 }
          60%  { transform: scale(1.1) }
          100% { transform: scale(1);   opacity:1 }
        }
        @keyframes spin-col {
          0%   { transform: translateY(0) }
          100% { transform: translateY(-8px) }
        }
      \`}</style>

      {/* HEADER */}
      <div style={{background:'rgba(8,8,8,0.97)',borderBottom:'1px solid rgba(212,175,55,0.15)',
        padding:'8px 14px',display:'flex',alignItems:'center',gap:'10px',
        position:'sticky',top:0,zIndex:90}}>
        <button onClick={()=>router.push('/lobby')} style={{background:'none',border:'none',
          color:'rgba(255,255,255,0.35)',cursor:'pointer',fontSize:'1rem',padding:0,flexShrink:0}}>←</button>
        <span style={{fontSize:'0.75rem',color:GOLD,fontWeight:700,letterSpacing:'0.15em',flex:1}}>HWA SLOTS</span>
        <span style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.45)'}}>{username}</span>
        <span style={{fontSize:'0.65rem',color:GOLD,fontWeight:700}}>
          {balance.toLocaleString('es-UY')} <span style={{fontSize:'0.45rem',opacity:0.7}}>CHIPS</span>
        </span>
        <button onClick={()=>setShowShop(true)}
          style={{background:'rgba(212,175,55,0.12)',border:'1px solid rgba(212,175,55,0.3)',
          borderRadius:4,color:GOLD,fontSize:'0.55rem',fontWeight:700,padding:'4px 8px',
          cursor:'pointer',letterSpacing:'0.1em'}}>+ CHIPS</button>
      </div>

      {/* MAIN */}
      <div style={{background:'#070710',minHeight:'calc(100dvh - 54px)',
        display:'flex',flexDirection:'column',alignItems:'center',
        padding:'12px 8px 16px',gap:'10px'}}>

        {/* STATUS ROW */}
        <div style={{display:'flex',gap:'12px',alignItems:'center',width:'100%',maxWidth:'320px'}}>
          {multiplier > 1 && (
            <div style={{flex:1,background:'rgba(212,175,55,0.1)',border:'1px solid rgba(212,175,55,0.3)',
              borderRadius:6,padding:'6px 10px',textAlign:'center'}}>
              <div style={{fontSize:'0.45rem',color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em'}}>MULTIPLICADOR</div>
              <div style={{fontSize:'1.1rem',color:GOLD,fontWeight:700}}>{multiplier}x</div>
            </div>
          )}
          {freeSpins > 0 && (
            <div style={{flex:1,background:'rgba(134,239,172,0.1)',border:'1px solid rgba(134,239,172,0.3)',
              borderRadius:6,padding:'6px 10px',textAlign:'center'}}>
              <div style={{fontSize:'0.45rem',color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em'}}>FREE SPINS</div>
              <div style={{fontSize:'1.1rem',color:'#86efac',fontWeight:700}}>{freeSpins}</div>
            </div>
          )}
        </div>

        {/* WIN OVERLAY */}
        {winDisplay > 0 && (
          <div style={{animation:'win-pop 0.4s ease',textAlign:'center',
            padding:'8px 20px',background:'rgba(212,175,55,0.12)',
            border:'1px solid rgba(212,175,55,0.4)',borderRadius:8}}>
            <div style={{fontSize:'0.5rem',color:'rgba(255,255,255,0.5)',letterSpacing:'0.2em'}}>GANASTE</div>
            <div style={{fontSize:'1.8rem',color:GOLD,fontWeight:700,letterSpacing:'0.05em'}}>
              {winDisplay.toLocaleString('es-UY')}
            </div>
          </div>
        )}

        {/* GRID 5x5 */}
        <div style={{
          display:'grid', gridTemplateColumns:\`repeat(\${COLS}, 1fr)\`,
          gap:'3px', width:'100%', maxWidth:'320px',
          border:'1px solid rgba(212,175,55,0.12)', borderRadius:10,
          padding:'6px', background:'rgba(0,0,0,0.6)'
        }}>
          {Array.from({length:COLS}, (_,ci)=>(
            <div key={ci} style={{display:'flex',flexDirection:'column',gap:'3px',
              animation: phase==='spinning' && !stoppedCols.has(ci)
                ? 'reel-blur 0.08s infinite' : undefined
            }}>
              {Array.from({length:ROWS}, (_,ri)=>{
                const sym = grid[ci]?.[ri] ?? 'CH'
                const def = SYMBOLS[sym]
                const key = ci+'-'+ri
                const isWinCell = winCells.has(key)
                const isCascade = phase === 'cascading'
                return (
                  <div key={ri} style={{
                    aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center',
                    borderRadius:6, fontSize:'1.3rem', userSelect:'none',
                    background: def.bg,
                    border: isWinCell ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.06)',
                    animation: isWinCell ? 'cell-win 0.5s infinite' : undefined,
                    opacity: phase === 'cascading' && isWinCell ? 0 : 1,
                    transition: 'opacity 0.3s',
                    color: def.fg,
                    fontWeight: def.isWild || def.isScatter ? 700 : undefined,
                    boxShadow: def.isWild ? '0 0 8px rgba(212,175,55,0.4)' : undefined,
                  }}>
                    {def.label}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* PAYTABLE hint */}
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',justifyContent:'center',
          width:'100%',maxWidth:'320px'}}>
          {(['WD','ST','DM','AC'] as SymbolId[]).map(id=>(
            <div key={id} style={{display:'flex',alignItems:'center',gap:'4px',
              background:'rgba(255,255,255,0.04)',borderRadius:4,padding:'3px 6px'}}>
              <span style={{fontSize:'0.75rem'}}>{SYMBOLS[id].label}</span>
              <span style={{fontSize:'0.45rem',color:'rgba(255,255,255,0.4)'}}>
                {SYMBOLS[id].paytable[2]}x
              </span>
            </div>
          ))}
          <div style={{display:'flex',alignItems:'center',gap:'4px',
            background:'rgba(20,83,45,0.4)',borderRadius:4,padding:'3px 6px'}}>
            <span style={{fontSize:'0.75rem'}}>{SYMBOLS.SC.label}</span>
            <span style={{fontSize:'0.45rem',color:'#86efac'}}>FREE SPINS</span>
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{width:'100%',maxWidth:'320px',display:'flex',flexDirection:'column',gap:'10px'}}>

          {/* BET SELECTOR */}
          {!isFreeSpinning && (
            <div>
              <div style={{fontSize:'0.45rem',color:'rgba(255,255,255,0.3)',letterSpacing:'0.2em',
                textAlign:'center',marginBottom:'6px'}}>APUESTA POR GIRO</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'4px'}}>
                {BET_OPTIONS.map(b=>(
                  <button key={b} onPointerDown={()=>setBet(b)} disabled={phase!=='idle'}
                    style={{
                      padding:'7px 2px', borderRadius:5, cursor:'pointer',
                      background: bet===b ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)',
                      border: \`1px solid \${bet===b ? GOLD : 'rgba(255,255,255,0.08)'}\`,
                      color: bet===b ? GOLD : 'rgba(255,255,255,0.5)',
                      fontSize:'0.6rem', fontWeight: bet===b ? 700 : 400,
                    }}>{b}</button>
                ))}
              </div>
            </div>
          )}

          {/* SPIN BUTTON */}
          <button
            onPointerDown={spin}
            disabled={!canSpin}
            style={{
              width:'100%', padding:'16px',
              background: canSpin
                ? (isFreeSpinning
                  ? 'linear-gradient(135deg,#14532d,#166534)'
                  : 'linear-gradient(135deg,#78350f,#92400e)')
                : 'rgba(40,40,40,0.8)',
              border: canSpin
                ? \`1px solid \${isFreeSpinning ? '#4ade80' : GOLD}\`
                : '1px solid rgba(255,255,255,0.05)',
              borderRadius:10,
              color: canSpin ? (isFreeSpinning ? '#4ade80' : GOLD) : 'rgba(255,255,255,0.2)',
              fontSize:'0.85rem', fontWeight:700, letterSpacing:'0.25em',
              cursor: canSpin ? 'pointer' : 'not-allowed',
              touchAction:'manipulation', transition:'all 0.15s',
            }}>
            {phase==='spinning'||phase==='revealing' ? '▣  GIRANDO...'
              : phase==='wins'||phase==='cascading' ? '◈  CASCADA...'
              : isFreeSpinning ? '◈  FREE SPIN'
              : \`▶  GIRAR  ·  \${bet} CHIPS\`}
          </button>

        </div>

        {/* SYMBOL LEGEND */}
        <div style={{width:'100%',maxWidth:'320px',marginTop:'4px'}}>
          <div style={{fontSize:'0.45rem',color:'rgba(255,255,255,0.2)',letterSpacing:'0.15em',
            textAlign:'center',marginBottom:'6px'}}>TABLA DE PAGOS (× BET × WAYS)</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px'}}>
            {(Object.keys(SYMBOLS) as SymbolId[])
              .filter(id=>!SYMBOLS[id].isScatter)
              .sort((a,b)=>SYMBOLS[b].paytable[2]-SYMBOLS[a].paytable[2])
              .map(id=>(
              <div key={id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                background:'rgba(255,255,255,0.03)',borderRadius:4,padding:'4px 8px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  <div style={{width:22,height:22,borderRadius:3,background:SYMBOLS[id].bg,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem'}}>
                    {SYMBOLS[id].label}
                  </div>
                  <span style={{fontSize:'0.5rem',color:'rgba(255,255,255,0.3)'}}>
                    {SYMBOLS[id].isWild ? 'WILD — comodín' : id}
                  </span>
                </div>
                <span style={{fontSize:'0.5rem',color:SYMBOLS[id].isWild ? GOLD : 'rgba(255,255,255,0.4)'}}>
                  {SYMBOLS[id].paytable.join(' / ')}x
                </span>
              </div>
            ))}
          </div>
          <div style={{marginTop:6,background:'rgba(20,83,45,0.3)',borderRadius:4,
            padding:'5px 8px',fontSize:'0.5rem',color:'#86efac',textAlign:'center'}}>
            ◈ SCATTER x3 = 10 free spins  ·  x4 = 15  ·  x5 = 20
          </div>
          <div style={{marginTop:4,fontSize:'0.45rem',color:'rgba(255,255,255,0.15)',textAlign:'center'}}>
            Cascada: multiplicadores 1x → 2x → 3x → 5x → 8x → 10x
          </div>
        </div>

      </div>

      {/* PAYMENT MODAL */}
      {showShop && (
        <PaymentModal
          open={showShop}
          onClose={()=>setShowShop(false)}
          userId={userId}
          username={username}
          balances={balances}
        />
      )}
    </>
  )
}

function delay(ms: number) { return new Promise(r=>setTimeout(r,ms)) }
`)

// ────────────────────────────────────────────────────────────
// 4. GIT + DONE
// ────────────────────────────────────────────────────────────
const { execSync } = require('child_process')
try {
  execSync('git add src/lib/slot src/app/api/slot src/app/slot', { stdio:'inherit', cwd: path.join(ROOT, '..') })
  execSync('git commit -m "feat: HWA Slots — 5x5 cascade slot engine completo"', { stdio:'inherit', cwd: path.join(ROOT, '..') })
  execSync('git push', { stdio:'inherit', cwd: path.join(ROOT, '..') })
} catch(e) { console.log('Git manual si falla el auto-commit') }

console.log('')
console.log('==============================================')
console.log('SLOT ENGINE — INSTALADO')
console.log('==============================================')
console.log('')
console.log('Archivos creados:')
console.log('  src/lib/slot/engine.ts')
console.log('  src/app/api/slot/spin/route.ts')
console.log('  src/app/slot/page.tsx')
console.log('')
console.log('PASO 1: SQL en Supabase → migration_slot.sql')
console.log('PASO 2: node setup-slot.js')
console.log('PASO 3: Agregar link en lobby → /slot')
console.log('')
