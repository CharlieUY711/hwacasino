# patch-ui.ps1
# - Historico mismo tamanio que calientes/frios (22px)
# - Reducir padding entre pano e historicos
# - Mismo gap entre fichas y botonera
# - Botones con nombres completos, estilo 3D rojo
# - Boton Girar con mismo estilo realista

$file = "C:\Carlos\HWA\hwacasino\src\app\roulette\play\page.tsx"
$content = Get-Content $file -Raw -Encoding UTF8

# ── 1. FICHAS: reducir padding inferior de 6px a 3px ──────────
$old1 = 'padding: "0 16px 6px", background: DARK }}'
$new1 = 'padding: "0 16px 3px", background: DARK }}'
$content = $content.Replace($old1, $new1)

# ── 2. BOTONERA: padding superior de 0 a 0, inferior 8px a 4px
$old2 = "padding: '0 16px 8px'"
$new2 = "padding: '0 16px 4px'"
$content = $content.Replace($old2, $new2)

# ── 3. HISTORICOS: reducir padding top de 8px a 4px ──────────
$old3 = 'padding: "8px 16px 16px"'
$new3 = 'padding: "4px 16px 12px"'
$content = $content.Replace($old3, $new3)

# ── 4. HISTORICO: badges de 20px a 22px, fontSize de 0.38 a 0.45
$old4 = 'width: "20px", height: "20px", fontSize: "0.38rem", flexShrink: 0, opacity: 1 - i * 0.04'
$new4 = 'width: "22px", height: "22px", fontSize: "0.45rem", flexShrink: 0, opacity: 1 - i * 0.04'
$content = $content.Replace($old4, $new4)

# ── 5. BOTONERA: reemplazar los 4 botones de accion ──────────
$oldBtns = "          {[
            { label: 'LMP', action: clearBets  },
            { label: 'BRR', action: removeLast },
            { label: 'DBL', action: doubleBets },
            { label: 'RPT', action: repeatBets },
          ].map(btn => (
            <button key={btn.label} className=""action-btn"" onClick={btn.action}
              style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '3px', padding: '6px 2px', color: 'rgba(255,255,255,0.5)', fontFamily: ""'Montserrat', sans-serif"", fontWeight: 700, fontSize: '0.38rem', letterSpacing: '0.1em', cursor: 'pointer', opacity: hasBetThisRound ? 0.4 : 1 }}>
              {btn.label}
            </button>
          ))}"

$newBtns = "          {[
            { label: 'Limpiar', action: clearBets  },
            { label: 'Borrar',  action: removeLast },
            { label: 'Doblar',  action: doubleBets },
            { label: 'Repetir', action: repeatBets },
          ].map(btn => (
            <button key={btn.label} className=""action-btn"" onClick={btn.action}
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
                fontFamily: ""'Montserrat', sans-serif"",
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
          ))}"

$content = $content.Replace($oldBtns, $newBtns)

# ── 6. BOTON GIRAR/APOSTAR: mismo estilo realista ─────────────
$oldGirar = "          <button
            className={`apostar-btn`${(waitingForResult || hasBetThisRound) ? ' waiting' : ''}`}
            onClick={placeBets}
            disabled={!canBet}
            style={{ flex: '0 0 90px', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '4px', color: (waitingForResult || hasBetThisRound) ? 'rgba(212,175,55,0.6)' : '#1a0e00', fontFamily: ""'Montserrat', sans-serif"", fontWeight: 900, letterSpacing: '0.1em', boxShadow: canBet ? '0 0 30px rgba(212,175,55,0.35)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', padding: '4px 0' }}>
            <span style={{ fontSize: '0.55rem' }}>{btnLabel}</span>
            {!isSolo && onlineCount >= 2 && (
              <span style={{ fontSize: '0.38rem', opacity: 0.7 }}>👥 {onlineCount}</span>
            )}
          </button>"

$newGirar = "          <button
            className={`apostar-btn`${(waitingForResult || hasBetThisRound) ? ' waiting' : ''}`}
            onClick={placeBets}
            disabled={!canBet}
            style={{
              flex: '0 0 90px',
              background: !canBet || waitingForResult || hasBetThisRound
                ? 'rgba(80,60,0,0.3)'
                : 'linear-gradient(180deg, #f5d060 0%, #d4af37 50%, #a07820 100%)',
              border: '1px solid rgba(212,175,55,0.4)',
              borderBottom: !canBet ? '1px solid rgba(212,175,55,0.2)' : '3px solid #7a5a10',
              borderRadius: '4px',
              color: !canBet || waitingForResult || hasBetThisRound ? 'rgba(212,175,55,0.4)' : '#1a0e00',
              fontFamily: ""'Montserrat', sans-serif"",
              fontWeight: 900,
              letterSpacing: '0.08em',
              boxShadow: canBet ? '0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px rgba(212,175,55,0.2)' : 'none',
              textShadow: canBet ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1px',
              padding: '4px 0',
              cursor: canBet ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
            }}>
            <span style={{ fontSize: '0.55rem' }}>{btnLabel}</span>
            {!isSolo && onlineCount >= 2 && (
              <span style={{ fontSize: '0.38rem', opacity: 0.7 }}>👥 {onlineCount}</span>
            )}
          </button>"

$content = $content.Replace($oldGirar, $newGirar)

Set-Content $file -Value $content -Encoding UTF8 -NoNewline

# Reporte
$checks = @(
    @{ label = "Fichas padding"; found = $content.Contains('padding: "0 16px 3px"') },
    @{ label = "Botonera padding"; found = $content.Contains("padding: '0 16px 4px'") },
    @{ label = "Historico padding"; found = $content.Contains('padding: "4px 16px 12px"') },
    @{ label = "Badge historico 22px"; found = $content.Contains('"22px", height: "22px", fontSize: "0.45rem"') },
    @{ label = "Botones nombres completos"; found = $content.Contains("'Limpiar'") },
    @{ label = "Boton Girar realista"; found = $content.Contains("'7a5a10'") }
)

Write-Host ""
foreach ($c in $checks) {
    $icon = if ($c.found) { "OK" } else { "WARN" }
    $color = if ($c.found) { "Green" } else { "Yellow" }
    Write-Host "   $icon`: $($c.label)" -ForegroundColor $color
}
Write-Host "`n   Reinicia npm run dev" -ForegroundColor Cyan
