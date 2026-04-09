# patch-header.ps1
# Parchea el header de roulette/play/page.tsx con la nueva logica de balance

$file = "C:\Carlos\HWA\hwacasino\src\app\roulette\play\page.tsx"
$content = Get-Content $file -Raw -Encoding UTF8

# ── BLOQUE VIEJO: Usuario + Balance en el header ──────────────
$old = '          {/* Usuario + Balance */}
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

# ── BLOQUE NUEVO ──────────────────────────────────────────────
$new = '          {/* Usuario + Balance */}
          {(() => {
            // Balance que se muestra: se descuenta la apuesta en curso
            const displayBalance = spinning || showResult
              ? balance  // despues de girar el balance viene del servidor
              : balance - totalBet  // mientras apuesta, descontar en tiempo real

            // Etiqueta izquierda del balance
            let label: React.ReactNode = null
            if (showResult && resultNumber !== null) {
              // Rueda parada — mostrar Ganado
              label = (
                <span style={{ fontSize: ''0.5rem'', color: totalWon ? ''#4ade80'' : ''rgba(255,255,255,0.3)'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'', transition: ''color 0.4s'' }}>
                  Ganado: {totalWon ? totalPayout!.toLocaleString(''es-UY'') : ''0''}
                  <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}> N</span>
                </span>
              )
            } else if (totalBet > 0 && !spinning) {
              // Apostando — mostrar apuesta en rojo
              label = (
                <span style={{ fontSize: ''0.5rem'', color: ''#f87171'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>
                  Apuesta: {totalBet.toLocaleString(''es-UY'')}
                  <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}> N</span>
                </span>
              )
            }

            return (
              <div style={{ display: ''flex'', alignItems: ''center'', gap: ''10px'', marginLeft: ''auto'' }}>
                {label}
                <span style={{ fontSize: ''0.5rem'', color: ''rgba(255,255,255,0.7)'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>{username}</span>
                <span style={{ fontSize: ''0.5rem'', color: GOLD, fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'', transition: ''all 0.4s'' }}>
                  {Math.max(0, displayBalance).toLocaleString(''es-UY'')}
                  <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}> N</span>
                </span>
              </div>
            )
          })()}'

if ($content.Contains('          {/* Usuario + Balance */}')) {
    # Hacer el reemplazo
    $patched = $content.Replace($old, $new)
    
    if ($patched -eq $content) {
        Write-Host "WARN: el bloque no coincidio exactamente — aplicando reemplazo por lineas clave" -ForegroundColor Yellow
        
        # Reemplazo alternativo mas robusto — reemplazar solo el bloque del div de balance
        $oldSimple = '{showResult && resultNumber !== null ? (
              <span style={{ fontSize: ''0.5rem'', color: totalWon ? GOLD : ''#f87171'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>
                {resultNumber} · {totalWon ? ''+'' + totalPayout!.toLocaleString(''es-UY'') : ''-'' + bets.reduce((s,b)=>s+b.amount,0).toLocaleString(''es-UY'')} <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}>N</span>
              </span>
            ) : totalBet > 0 ? (
              <span style={{ fontSize: ''0.5rem'', color: ''#f87171'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>Apuesta: {totalBet.toLocaleString(''es-UY'')} <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}>N</span></span>
            ) : null}'
        
        $newSimple = '{showResult && resultNumber !== null ? (
              <span style={{ fontSize: ''0.5rem'', color: totalWon ? ''#4ade80'' : ''rgba(255,255,255,0.3)'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'', transition: ''color 0.4s'' }}>
                Ganado: {totalWon ? totalPayout!.toLocaleString(''es-UY'') : ''0''}<span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}> N</span>
              </span>
            ) : totalBet > 0 && !spinning ? (
              <span style={{ fontSize: ''0.5rem'', color: ''#f87171'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>Apuesta: {totalBet.toLocaleString(''es-UY'')}<span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}> N</span></span>
            ) : null}'

        $patched = $content.Replace($oldSimple, $newSimple)

        # Ademas reemplazar el balance display para que descuente la apuesta
        $oldBal = '<span style={{ fontSize: ''0.5rem'', color: GOLD, fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>{balance.toLocaleString(''es-UY'')} <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}>N</span></span>'
        $newBal = '<span style={{ fontSize: ''0.5rem'', color: GOLD, fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'', transition: ''all 0.4s'' }}>{Math.max(0, spinning || showResult ? balance : balance - totalBet).toLocaleString(''es-UY'')} <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}>N</span></span>'
        $patched = $patched.Replace($oldBal, $newBal)
    }

    Set-Content $file -Value $patched -Encoding UTF8 -NoNewline
    Write-Host "OK: header parcheado" -ForegroundColor Green
} else {
    Write-Host "ERROR: no se encontro el bloque de balance en el archivo" -ForegroundColor Red
    Write-Host "Verificar que el archivo es el correcto: $file" -ForegroundColor Yellow
}
