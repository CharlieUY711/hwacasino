# patch-wheel-chips.ps1
# 1. Fichas: todas con el mismo fontSize de la ficha de 10
# 2. Boton Girar: gris deshabilitado, dorado habilitado
# 3. Rueda: separadores llegan al centro (r1=0)
# 4. Centro: media esfera dorada, al resultado pinta color + numero

$file = "C:\Carlos\HWA\hwacasino\src\app\roulette\play\page.tsx"
$content = Get-Content $file -Raw -Encoding UTF8

# ── 1. FICHAS: fontSize fijo igual al de la ficha de 10 ───────
$old1 = '            const fontSize = chip.label.length > 2 ? "0.45rem" : "0.6rem"
            return (
              <button key={chip.value} className={`chip-btn${isActive ? " active" : ""}`}
                onClick={() => setSelectedChip(chip)}
                style={{ width: 34, height: 34, borderRadius: "50%", background: isActive ? `radial-gradient(circle at 35% 35%, #f5d060, ${GOLD} 50%, #a07820)` : `radial-gradient(circle at 35% 35%, #e8c540, ${GOLD} 55%, #8a6510)`, border: `2px dashed ${isActive ? "#fff" : CHIP_BORDER}`, color: chip.color, fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isActive ? `0 0 10px rgba(212,175,55,0.8)` : `0 2px 6px rgba(0,0,0,0.6)`, cursor: "pointer" }}>'

$new1 = '            return (
              <button key={chip.value} className={`chip-btn${isActive ? " active" : ""}`}
                onClick={() => setSelectedChip(chip)}
                style={{ width: 34, height: 34, borderRadius: "50%", background: isActive ? `radial-gradient(circle at 35% 35%, #f5d060, ${GOLD} 50%, #a07820)` : `radial-gradient(circle at 35% 35%, #e8c540, ${GOLD} 55%, #8a6510)`, border: `2px dashed ${isActive ? "#fff" : CHIP_BORDER}`, color: chip.color, fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: "0.6rem", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isActive ? `0 0 10px rgba(212,175,55,0.8)` : `0 2px 6px rgba(0,0,0,0.6)`, cursor: "pointer" }}>'

$content = $content.Replace($old1, $new1)
if ($content.Contains('fontSize: "0.6rem"')) { Write-Host "   OK: fichas fontSize unificado" -ForegroundColor Green }
else { Write-Host "   WARN: fichas fontSize" -ForegroundColor Yellow }

# ── 2. BOTON GIRAR: gris cuando disabled, dorado cuando activo ─
$old2 = "              background: !canBet || waitingForResult || hasBetThisRound
                ? 'rgba(80,60,0,0.3)'
                : 'linear-gradient(180deg, #f5d060 0%, #d4af37 50%, #a07820 100%)',"
$new2 = "              background: !canBet
                ? 'linear-gradient(180deg, #555 0%, #333 50%, #222 100%)'
                : waitingForResult || hasBetThisRound
                  ? 'rgba(80,60,0,0.3)'
                  : 'linear-gradient(180deg, #f5d060 0%, #d4af37 50%, #a07820 100%)',"
$content = $content.Replace($old2, $new2)

$old3 = "              border: '1px solid rgba(212,175,55,0.4)',
              borderBottom: !canBet ? '1px solid rgba(212,175,55,0.2)' : '3px solid #7a5a10',"
$new3 = "              border: !canBet ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(212,175,55,0.4)',
              borderBottom: !canBet ? '3px solid #111' : '3px solid #7a5a10',"
$content = $content.Replace($old3, $new3)

$old4 = "              color: !canBet || waitingForResult || hasBetThisRound ? 'rgba(212,175,55,0.4)' : '#1a0e00',"
$new4 = "              color: !canBet ? 'rgba(255,255,255,0.3)' : waitingForResult || hasBetThisRound ? 'rgba(212,175,55,0.4)' : '#1a0e00',"
$content = $content.Replace($old4, $new4)

$old5 = "              boxShadow: canBet ? '0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px rgba(212,175,55,0.2)' : 'none',"
$new5 = "              boxShadow: !canBet ? '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' : '0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px rgba(212,175,55,0.2)',"
$content = $content.Replace($old5, $new5)

Write-Host "   OK: boton girar gris/dorado" -ForegroundColor Green

# ── 3. RUEDA: separadores desde el centro (r1=2 hacia r2=108) ─
$old6 = '                {WHEEL_ORDER.map((_, i) => {
                  const angle = ((i / 37) * 360 - 360/37/2) * Math.PI / 180
                  return (
                    <line key={`sep-${i}`}
                      x1={120 + 55 * Math.cos(angle)} y1={120 + 55 * Math.sin(angle)}
                      x2={120 + 108 * Math.cos(angle)} y2={120 + 108 * Math.sin(angle)}
                      stroke="rgba(212,175,55,0.5)" strokeWidth="0.8" />
                  )
                })}'
$new6 = '                {WHEEL_ORDER.map((_, i) => {
                  const angle = ((i / 37) * 360 - 360/37/2) * Math.PI / 180
                  return (
                    <line key={`sep-${i}`}
                      x1={120 + 2 * Math.cos(angle)} y1={120 + 2 * Math.sin(angle)}
                      x2={120 + 108 * Math.cos(angle)} y2={120 + 108 * Math.sin(angle)}
                      stroke="rgba(212,175,55,0.6)" strokeWidth="0.8" />
                  )
                })}'
$content = $content.Replace($old6, $new6)
Write-Host "   OK: separadores al centro" -ForegroundColor Green

# ── 4. CENTRO: media esfera dorada siempre, resultado encima ──
# Reemplazar el circulo central estatico + el overlay de resultado
$old7 = '              <polygon points="120,16 117.5,6 122.5,6" fill={GOLD} filter="url(#shadow)" />
              <circle cx="120" cy="16" r="2" fill="#0d0d0d" />
            </svg>

            {resultNumber !== null && !spinning && (
              <div style={{ position: ''absolute'', top: ''50%'', left: ''50%'', transform: ''translate(-50%, -50%)'', width: 56, height: 56, borderRadius: ''50%'', background: colorHex(resultColor!), border: `2px solid ${GOLD}`, display: ''flex'', alignItems: ''center'', justifyContent: ''center'', zIndex: 10 }}>
                <span style={{ fontFamily: "''Cormorant Garamond'', serif", fontSize: ''1.8rem'', color: ''#fff'', fontWeight: 700 }}>{resultNumber}</span>
              </div>
            )}'

$new7 = '              {/* Media esfera central — dorada en reposo, color resultado al girar */}
              <defs>
                <radialGradient id="centerGrad" cx="38%" cy="32%" r="65%">
                  <stop offset="0%" stopColor={resultNumber !== null && !spinning ? "#fff" : "#f5d060"} stopOpacity="0.9"/>
                  <stop offset="50%" stopColor={resultNumber !== null && !spinning ? colorHex(resultColor ?? "black") : GOLD}/>
                  <stop offset="100%" stopColor={resultNumber !== null && !spinning ? colorHex(resultColor ?? "black") : "#7a5a10"}/>
                </radialGradient>
              </defs>
              <circle cx="120" cy="120" r="18" fill="url(#centerGrad)" stroke={GOLD} strokeWidth="1.2"/>
              <ellipse cx="115" cy="115" rx="6" ry="4" fill="rgba(255,255,255,0.25)" transform="rotate(-30 115 115)"/>
              {resultNumber !== null && !spinning && (
                <text x="120" y="120" textAnchor="middle" dominantBaseline="central"
                  fill="#fff" fontSize="11" fontWeight="700" fontFamily="Cormorant Garamond, serif">
                  {resultNumber}
                </text>
              )}
              <polygon points="120,16 117.5,6 122.5,6" fill={GOLD} filter="url(#shadow)" />
              <circle cx="120" cy="16" r="2" fill="#0d0d0d" />
            </svg>'

$content = $content.Replace($old7, $new7)
Write-Host "   OK: centro media esfera" -ForegroundColor Green

Set-Content $file -Value $content -Encoding UTF8 -NoNewline
Write-Host "`n   Reinicia npm run dev" -ForegroundColor Cyan
