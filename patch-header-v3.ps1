# patch-header-v3.ps1
# Reemplaza el bloque completo Usuario+Balance con logica correcta de timing

$file = "C:\Carlos\HWA\hwacasino\src\app\roulette\play\page.tsx"
$content = Get-Content $file -Raw -Encoding UTF8

# ── Buscar y reemplazar el bloque completo desde el comentario hasta el cierre del div
# El bloque empieza con {/* Usuario + Balance */} y termina con </div> del contenedor

$old = '          {/* Usuario + Balance */}
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

$new = '          {/* Usuario + Balance */}
          <div style={{ display: ''flex'', alignItems: ''center'', gap: ''10px'', marginLeft: ''auto'' }}>

            {/* Etiqueta: Apuesta (rojo) mientras apuesta/gira, Ganado (verde/gris) 1s despues de parar */}
            {showPayout ? (
              <span style={{ fontSize: ''0.5rem'', color: totalWon ? ''#4ade80'' : ''rgba(255,255,255,0.35)'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'', transition: ''color 0.4s'' }}>
                Ganado: {(totalWon ? totalPayout! : 0).toLocaleString(''es-UY'')}
                <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}> N</span>
              </span>
            ) : (totalBet > 0 || (hasBetThisRound && lastBets.length > 0)) ? (
              <span style={{ fontSize: ''0.5rem'', color: ''#f87171'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>
                Apuesta: {hasBetThisRound ? lastBets.reduce((s,b)=>s+b.amount,0).toLocaleString(''es-UY'') : totalBet.toLocaleString(''es-UY'')}
                <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}> N</span>
              </span>
            ) : null}

            <span style={{ fontSize: ''0.5rem'', color: ''rgba(255,255,255,0.7)'', fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'' }}>{username}</span>

            {/* Balance: descontado mientras apuesta/gira, ajustado 1s despues de resultado */}
            <span style={{ fontSize: ''0.5rem'', color: GOLD, fontWeight: 700, letterSpacing: ''0.05em'', whiteSpace: ''nowrap'', transition: ''all 0.5s'' }}>
              {Math.max(0, showPayout
                ? (displayBalance ?? balance)
                : balance - (hasBetThisRound
                    ? lastBets.reduce((s,b)=>s+b.amount,0)
                    : totalBet)
              ).toLocaleString(''es-UY'')}
              <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontStyle: ''italic'' }}> N</span>
            </span>

          </div>'

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    Set-Content $file -Value $content -Encoding UTF8 -NoNewline
    Write-Host "OK: header reemplazado correctamente" -ForegroundColor Green
    Write-Host "Reinicia npm run dev y proba una apuesta" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: bloque no encontrado." -ForegroundColor Red
    Write-Host "Pegame el output de este comando para diagnosticar:" -ForegroundColor Yellow
    Write-Host "Select-String -Path '$file' -Pattern 'Usuario' -Context 0,5" -ForegroundColor Gray
}
