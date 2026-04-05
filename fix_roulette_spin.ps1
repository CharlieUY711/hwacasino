# ============================================================
# fix_roulette_spin.ps1
# Corrección determinista del spin de ruleta — HWA Casino
# Ejecutar desde la raíz del proyecto
# ============================================================

$file = "src\app\roulette\play\page.tsx"
$content = Get-Content $file -Raw

# ============================================================
# 1. REEMPLAZAR currentRotation.useRef(-90) → useRef(0)
#    El offset del arranque lo manejamos dentro de spinToNumber,
#    no en el estado inicial.
# ============================================================
$content = $content -replace `
  'const currentRotation = useRef\(-90\)', `
  'const currentRotation = useRef(0)'

# ============================================================
# 2. REEMPLAZAR el transform inicial de la rueda
#    El grupo SVG arranca en -90deg para que el slot 0 del array
#    quede apuntando hacia arriba (posición del puntero).
#    WHEEL_ORDER[0] = 0, así que el 0 empieza arriba.
#    Mantenemos este rotate(-90deg) en el JSX pero NO lo
#    incluimos en currentRotation para evitar drift acumulado.
# ============================================================
# (ya está correcto en el JSX: transform: 'rotate(-90deg)' — no se toca)

# ============================================================
# 3. REEMPLAZAR la función spin() completa con la versión corregida
# ============================================================

$oldSpin = @'
  async function spin() {
    if (!userId || spinning || bets.length === 0) return
    setSpinning(true)
    setError(null)
    setShowResult(false)
    setResultNumber(null)

    // 1. Llamar al backend por cada apuesta
    let netPayout = 0
    let anyWin = false
    let winningIndex: number | null = null
    let winningNumber: number | null = null
    let winningColor: string | null = null

    try {
      for (const bet of bets) {
        const res = await fetch('/api/play/roulette', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            bet_type: bet.type,
            bet_value: bet.value,
            amount: bet.amount,
          }),
        })
        const data = await res.json()
        if (data.error) {
          setError(data.error === 'insufficient_balance' ? 'Saldo insuficiente' : 'Error al procesar')
          setSpinning(false)
          return
        }
        if (winningIndex === null) {
          winningIndex = data.index
          winningNumber = data.number
          winningColor = data.color
        }
        netPayout += data.payout
        if (data.won) anyWin = true
      }
    } catch {
      setError('Error de conexión')
      setSpinning(false)
      return
    }

    // 2. Animar rueda al indice exacto (formula precisa)
    if (winningIndex !== null && wheelRef.current) {
      const degreesPerSlot = 360 / 37
      const extraSpins = 5
      const targetAngle =
        currentRotation.current +
        extraSpins * 360 +
        (360 - (winningIndex * degreesPerSlot + degreesPerSlot / 2))

      currentRotation.current = targetAngle

      wheelRef.current.style.transition = 'transform 6s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
      wheelRef.current.style.transform = `rotate(${targetAngle}deg)`
    }

    // 3. Mostrar resultado al terminar animacion
    setTimeout(() => {
      setResultNumber(winningNumber)
      setResultColor(winningColor)
      setTotalPayout(netPayout)
      setTotalWon(anyWin)
      setHistory(prev => [winningNumber!, ...prev].slice(0, 30))
      setLastBets(bets)
      setBets([])
      setSpinning(false)
      setShowResult(true)
    }, 6200)
  }
'@

$newSpin = @'
  async function spin() {
    if (!userId || spinning || bets.length === 0) return
    setSpinning(true)
    setError(null)
    setShowResult(false)
    setResultNumber(null)

    // 1. Llamar al backend por cada apuesta
    let netPayout = 0
    let anyWin = false
    let winningIndex: number | null = null
    let winningNumber: number | null = null
    let winningColor: string | null = null

    try {
      for (const bet of bets) {
        const res = await fetch('/api/play/roulette', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            bet_type: bet.type,
            bet_value: bet.value,
            amount: bet.amount,
          }),
        })
        const data = await res.json()
        if (data.error) {
          setError(data.error === 'insufficient_balance' ? 'Saldo insuficiente' : 'Error al procesar')
          setSpinning(false)
          return
        }
        if (winningIndex === null) {
          winningIndex = data.index
          winningNumber = data.number
          winningColor = data.color
        }
        netPayout += data.payout
        if (data.won) anyWin = true
      }
    } catch {
      setError('Error de conexión')
      setSpinning(false)
      return
    }

    // 2. Animar rueda al índice exacto — fórmula determinista
    if (winningIndex !== null && wheelRef.current) {
      //
      // LÓGICA:
      // El SVG tiene el grupo giratorio con transform-origin en el centro (120,120).
      // El JSX aplica rotate(-90deg) como arranque visual para que WHEEL_ORDER[0]
      // quede apuntando al puntero (arriba). Ese -90 es FIJO en el JSX y NO se
      // acumula en currentRotation.
      //
      // currentRotation trackea cuánto rotamos NOSOTROS via JS desde 0.
      // El ángulo CSS real aplicado es: rotate(-90deg + currentRotation)
      // pero como CSS solo ve el último transform que escribimos, lo expresamos así:
      //   transform = rotate(totalDeg)
      //   donde totalDeg = currentRotation - 90  (incluye el offset visual inicial)
      //
      // Para que WHEEL_ORDER[idx] quede bajo el puntero (arriba = 0°):
      //   - cada slot ocupa exactamente (360/37)°
      //   - el centro del slot idx está en: idx * (360/37) grados desde el inicio del array
      //   - el puntero está en la parte de arriba, que en el sistema SVG rotado es 0°
      //   - para traer el slot idx arriba necesitamos contra-rotarlo: -(idx * degreesPerSlot)
      //
      // Formula final:
      //   rawTarget = -(winningIndex * degreesPerSlot)   // slot correcto arriba
      //   Normalizamos para que la diferencia al estado actual sea siempre positiva
      //   y agregamos N vueltas completas para la animación.
      //
      const DEG = 360 / 37  // 9.7297...° por slot — NUNCA redondear

      // Ángulo absoluto donde debe quedar la rueda (centro del slot ganador arriba)
      const slotAngle = -(winningIndex * DEG)

      // Normalizar el estado actual a [0, 360) para calcular el delta
      const normalizedCurrent = ((currentRotation.current % 360) + 360) % 360
      const normalizedTarget   = ((slotAngle % 360) + 360) % 360

      // Delta: cuánto girar en esta ronda (siempre positivo = gira hacia adelante)
      let delta = normalizedTarget - normalizedCurrent
      if (delta <= 0) delta += 360  // asegurar al menos una vuelta parcial

      // Spins completos + delta exacto
      const EXTRA_SPINS = 6
      const totalRotation = EXTRA_SPINS * 360 + delta

      // Nuevo valor acumulado (crece indefinidamente, sin módulo — evita drift)
      const newRotation = currentRotation.current + totalRotation
      currentRotation.current = newRotation

      // El transform CSS final incluye el -90 del arranque visual
      const finalDeg = newRotation - 90

      // Aplicar animación
      wheelRef.current.style.transition = 'none'  // reset sin animación primero
      // Forzar reflow para que el browser acepte el transition siguiente
      void wheelRef.current.getBoundingClientRect()
      wheelRef.current.style.transition = 'transform 6s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
      wheelRef.current.style.transform = `rotate(${finalDeg}deg)`

      // DEBUG — descomentar para verificar alineación:
      // console.log('[ROULETTE DEBUG]', {
      //   winningIndex,
      //   winningNumber: WHEEL_ORDER[winningIndex],
      //   slotAngle,
      //   normalizedCurrent,
      //   normalizedTarget,
      //   delta,
      //   finalDeg,
      //   checkIndex: Math.round(((((-(finalDeg + 90)) % 360) + 360) % 360) / DEG) % 37,
      //   checkNumber: WHEEL_ORDER[Math.round(((((-(finalDeg + 90)) % 360) + 360) % 360) / DEG) % 37],
      // })
    }

    // 3. Mostrar resultado al terminar animación
    setTimeout(() => {
      setResultNumber(winningNumber)
      setResultColor(winningColor)
      setTotalPayout(netPayout)
      setTotalWon(anyWin)
      setHistory(prev => [winningNumber!, ...prev].slice(0, 30))
      setLastBets(bets)
      setBets([])
      setSpinning(false)
      setShowResult(true)
    }, 6200)
  }
'@

$content = $content.Replace($oldSpin, $newSpin)

Set-Content $file $content -Encoding UTF8

Write-Host ""
Write-Host "✅ Fix aplicado correctamente." -ForegroundColor Green
Write-Host ""
Write-Host "Verificando que los cambios se aplicaron..." -ForegroundColor Cyan
$verify = Get-Content $file | Select-String "DEG|slotAngle|normalizedCurrent|EXTRA_SPINS|finalDeg"
if ($verify) {
    Write-Host "✅ Nuevas variables encontradas en el archivo:" -ForegroundColor Green
    $verify | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "⚠️  No se encontraron las variables nuevas. Verificar manualmente." -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Próximo paso: npm run dev y probar varios spins seguidos." -ForegroundColor Cyan
Write-Host "Para debug, descomentar el bloque console.log en spin()." -ForegroundColor Cyan
