
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
