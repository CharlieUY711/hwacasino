# patch-header-v2.ps1
# Timing correcto:
# 1. Apostando:       "Apuesta: X" rojo | balance = balance - totalBet
# 2. Girando:         "Apuesta: X" rojo | balance = balance - totalBet (sin cambios)
# 3. Rueda para:      esperar 1 segundo
# 4. Tras 1 segundo:  "Ganado: X" verde o "Ganado: 0" gris | balance ajustado

$file = "C:\Carlos\HWA\hwacasino\src\app\roulette\play\page.tsx"
$content = Get-Content $file -Raw -Encoding UTF8

# ── FIX 1: agregar estado showPayout despues de showResult ────
$oldState = '  const [showResult, setShowResult]     = useState(false)'
$newState = '  const [showResult, setShowResult]     = useState(false)
  const [showPayout, setShowPayout]     = useState(false)   // 1s despues de que para la rueda
  const [displayBalance, setDisplayBalance] = useState<number | null>(null) // balance ajustado post-resultado'

if ($content.Contains($oldState)) {
    $content = $content.Replace($oldState, $newState)
    Write-Host "   OK: estado showPayout agregado" -ForegroundColor Green
} else {
    Write-Host "   WARN: no se encontro el estado showResult — verificar manualmente" -ForegroundColor Yellow
}

# ── FIX 2: ajustar el setTimeout del resultado (modo solo) ────
# Agregar 1s de delay antes de mostrar el pago y ajustar balance
$oldTimeout = '      setTimeout(() => {
        // 1. Mostrar resultado — apuestas siguen en el pano
        setResultNumber(winNum)
        setResultColor(winColor)
        setHistory(prev => [winNum!, ...prev].slice(0, 30))
        setTotalPayout(netPayout)
        setTotalWon(anyWin)
        setLastBets(betsSnap)
        setSpinning(false)
        setShowResult(true)

        // 2. Despues de mostrar el pago, limpiar el pano y abrir nueva ronda
        setTimeout(() => {
          setShowResult(false)
          setResultNumber(null)
          setBets([])        // limpiar DESPUES del pago
          setHasBetThisRound(false)  // abrir apuestas nuevamente
        }, 3000)
      }, 6200)'

$newTimeout = '      setTimeout(() => {
        // 1. Rueda para — mostrar numero pero NO cambiar etiqueta todavia
        setResultNumber(winNum)
        setResultColor(winColor)
        setHistory(prev => [winNum!, ...prev].slice(0, 30))
        setTotalPayout(netPayout)
        setTotalWon(anyWin)
        setLastBets(betsSnap)
        setSpinning(false)
        // NO setShowResult todavia — esperar 1 segundo

        // 2. Tras 1 segundo: cambiar etiqueta y ajustar balance
        setTimeout(() => {
          setShowPayout(true)
          setShowResult(true)
          // Ajustar balance: balance actual - apuesta + ganancia
          const betTotal = betsSnap.reduce((s, b) => s + b.amount, 0)
          setDisplayBalance(prev => {
            const base = prev !== null ? prev : 0
            return base - betTotal + (netPayout ?? 0)
          })

          // 3. Tras 3 segundos mas: limpiar y nueva ronda
          setTimeout(() => {
            setShowResult(false)
            setShowPayout(false)
            setResultNumber(null)
            setBets([])
            setHasBetThisRound(false)
          }, 3000)
        }, 1000)
      }, 6200)'

if ($content.Contains($oldTimeout)) {
    $content = $content.Replace($oldTimeout, $newTimeout)
    Write-Host "   OK: setTimeout del resultado actualizado" -ForegroundColor Green
} else {
    Write-Host "   WARN: no se encontro el setTimeout del resultado — verificar manualmente" -ForegroundColor Yellow
}

# ── FIX 3: inicializar displayBalance cuando carga el balance ──
$oldInitBalance = '  const { balance, formatChips, username } = useWallet()'
$newInitBalance = '  const { balance, formatChips, username } = useWallet()
  // Sincronizar displayBalance con balance del servidor (Realtime)
  useEffect(() => {
    if (!showPayout) setDisplayBalance(balance)
  }, [balance, showPayout])'

if ($content.Contains($oldInitBalance)) {
    $content = $content.Replace($oldInitBalance, $newInitBalance)
    Write-Host "   OK: displayBalance inicializado con balance del servidor" -ForegroundColor Green
} else {
    Write-Host "   WARN: no se encontro useWallet() — verificar manualmente" -ForegroundColor Yellow
}

# ── FIX 4: reemplazar el bloque Usuario + Balance en el header ──
$oldHeader = '          {/* Usuario + Balance */}
          <div style={{ display: ''flex'', alignItems: ''center'', gap: ''10px'', marginLeft: ''auto'' }}>
            {showResult && resultNumber !== null ? (
              <span style={{ fontSize: ''0.5rem'', color: totalWon ? GOLD : ''#f87171'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>
                {resultNumber} · {totalWon ? ''+'' + totalPayout!.toLocaleString(''es-UY'') : ''-'' + bets.reduce((s,b)=>s+b.amount,0).toLocaleString(''es-UY'')} <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}>N</span>
              </span>
            ) : totalBet > 0 ? (
              <span style={{ fontSize: ''0.5rem'', color: ''#f87171'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>Apuesta: {totalBet.toLocaleString(''es-UY'')} <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}>N</span></span>
            ) : null}
            <span style={{ fontSize: ''0.5rem'', color: ''rgba(255,255,255,0.7)'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>{username}</span>
            <span style={{ fontSize: ''0.5rem'', color: GOLD, fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>{balance.toLocaleString(''es-UY'')} <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}>N</span></span>
          </div>'

$newHeader = '          {/* Usuario + Balance */}
          <div style={{ display: ''flex'', alignItems: ''center'', gap: ''10px'', marginLeft: ''auto'' }}>

            {/* Etiqueta izquierda: Apuesta o Ganado */}
            {showPayout ? (
              <span style={{ fontSize: ''0.5rem'', color: totalWon ? ''#4ade80'' : ''rgba(255,255,255,0.35)'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'', transition: ''color 0.4s'' }}>
                Ganado: {(totalWon ? totalPayout! : 0).toLocaleString(''es-UY'')}
                <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}> N</span>
              </span>
            ) : (lastBets.length > 0 || totalBet > 0) && (spinning || hasBetThisRound || totalBet > 0) ? (
              <span style={{ fontSize: ''0.5rem'', color: ''#f87171'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>
                Apuesta: {(hasBetThisRound ? lastBets.reduce((s,b)=>s+b.amount,0) : totalBet).toLocaleString(''es-UY'')}
                <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}> N</span>
              </span>
            ) : null}

            <span style={{ fontSize: ''0.5rem'', color: ''rgba(255,255,255,0.7)'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>{username}</span>

            {/* Balance: descontado mientras apuesta, ajustado 1s despues de resultado */}
            <span style={{ fontSize: ''0.5rem'', color: GOLD, fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'', transition: ''all 0.5s'' }}>
              {Math.max(0, showPayout
                ? (displayBalance ?? balance)
                : spinning || hasBetThisRound
                  ? balance - (lastBets.length > 0 ? lastBets.reduce((s,b)=>s+b.amount,0) : totalBet)
                  : balance - totalBet
              ).toLocaleString(''es-UY'')}
              <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}> N</span>
            </span>

          </div>'

if ($content.Contains($oldHeader)) {
    $content = $content.Replace($oldHeader, $newHeader)
    Write-Host "   OK: header reemplazado correctamente" -ForegroundColor Green
} else {
    Write-Host "   WARN: el header no coincidio exactamente" -ForegroundColor Yellow
    # Fallback: reemplazar solo la parte del balance
    $oldBal = '<span style={{ fontSize: ''0.5rem'', color: GOLD, fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>{balance.toLocaleString(''es-UY'')} <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}>N</span></span>'
    $newBal = '<span style={{ fontSize: ''0.5rem'', color: GOLD, fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'', transition: ''all 0.5s'' }}>{Math.max(0, showPayout ? (displayBalance ?? balance) : balance - totalBet).toLocaleString(''es-UY'')} <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}>N</span></span>'
    $content = $content.Replace($oldBal, $newBal)
    Write-Host "   OK: fallback aplicado en balance" -ForegroundColor Green
}

Set-Content $file -Value $content -Encoding UTF8 -NoNewline
Write-Host "`n   LISTO: patch-header-v2 aplicado correctamente" -ForegroundColor Cyan
Write-Host "   Reinicia npm run dev y proba una apuesta" -ForegroundColor Gray
