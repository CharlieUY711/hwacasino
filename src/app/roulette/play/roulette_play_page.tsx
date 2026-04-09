async function spin() {
  if (!userId || spinning || bets.length === 0) return

  // NO VA MÁS
  setLocked(true)
  setSpinning(true)
  setError(null)
  setShowResult(false)
  setResultNumber(null)

  // 1. Giro inicial (4 vueltas + random)
  const fastSpin = accRotation.current + 1440 + Math.random() * 360
  accRotation.current = fastSpin
  applyRotation(fastSpin, 'transform 4s cubic-bezier(0.25, 0.1, 0.1, 1.0)')

  // 2. Request ÚNICO al backend
  let netPayout  = 0
  let anyWin     = false
  let spinResult = null
  let spinColor  = null

  try {
    const res = await fetch('/api/play/roulette', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        bets: bets,
      }),
    })

    const data = await res.json()

    if (data.error) {
      setError('Error al procesar')
      setSpinning(false)
      setLocked(false)
      return
    }

    spinResult = data.result
    spinColor  = data.color
    netPayout  = data.payout
    anyWin     = data.won

  } catch {
    setError('Error de conexión')
    setSpinning(false)
    setLocked(false)
    return
  }

  // 3. SNAP al número exacto cuando termina el giro inicial
  setTimeout(() => {
    if (spinResult !== null) {
      const sectorAngle  = getSectorAngle(spinResult)
      const targetMod    = ((POINTER_OFFSET_DEG - sectorAngle) % 360 + 360) % 360
      const base         = Math.ceil(accRotation.current / 360) * 360
      const snapRotation = base + targetMod

      accRotation.current = snapRotation
      applyRotation(snapRotation, 'transform 1.2s cubic-bezier(0.0, 0.0, 0.2, 1.0)')
    }

    // 4. Mostrar resultado después del snap
    setTimeout(() => {
      setResultNumber(spinResult)
      setResultColor(spinColor)
      setTotalPayout(netPayout)
      setTotalWon(anyWin)
      setHistory(prev => [spinResult!, ...prev].slice(0, 30))
      setLastBets(bets)
      setBets([])

      setSpinning(false)
      setShowResult(true)
      setLocked(false)
    }, 1300)

  }, 4100)
}