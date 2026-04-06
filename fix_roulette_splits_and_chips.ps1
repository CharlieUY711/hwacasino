# ============================================================
# fix_roulette_splits_and_chips.ps1
# 1. Agrega split2 (linea) y split4 (esquina) al grid
# 2. Muestra fichas en apuestas externas
# 3. Agrega split2/split4 al backend
# ============================================================

$file = "src\app\roulette\play\page.tsx"
$content = [System.IO.File]::ReadAllText((Resolve-Path $file), [System.Text.Encoding]::UTF8)

# ── 1. REEMPLAZAR el grid de números completo con version que incluye splits ──

$oldGrid = @'
            {/* Grid de numeros */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', flex: 1, gap: '2px' }}>
                {TABLE_COLS.flatMap(col => col).map(num => {
                  const c = getColor(num)
                  const betAmt = getBetOnSpot(`number:${num}`)
                  return (
                    <div
                      key={num}
                      className="bet-cell"
                      onClick={() => addBet('number', String(num))}
                      style={{
                        background: betAmt > 0
                          ? c === 'red' ? 'rgba(180,0,0,0.7)' : 'rgba(30,30,30,0.9)'
                          : c === 'red' ? 'rgba(120,0,0,0.5)' : 'rgba(15,15,15,0.5)',
                        border: `1px solid ${betAmt > 0 ? GOLD : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '2px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '28px',
                        padding: '2px',
                        position: 'relative',
                      }}
                    >
                      <span style={{ color: c === 'red' ? '#fca5a5' : 'rgba(255,255,255,0.8)', fontSize: '0.55rem', fontWeight: 600, lineHeight: 1 }}>{num}</span>
                      {betAmt > 0 && <ChipMarker amount={betAmt} small />}
                    </div>
                  )
                })}
              </div>
'@

$newGrid = @'
            {/* Grid de numeros con splits */}
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '2px' }}>
                  {TABLE_COLS.flatMap(col => col).map(num => {
                    const c = getColor(num)
                    const betAmt = getBetOnSpot(`number:${num}`)
                    return (
                      <div
                        key={num}
                        className="bet-cell"
                        onClick={() => addBet('number', String(num))}
                        style={{
                          background: betAmt > 0
                            ? c === 'red' ? 'rgba(180,0,0,0.7)' : 'rgba(30,30,30,0.9)'
                            : c === 'red' ? 'rgba(120,0,0,0.5)' : 'rgba(15,15,15,0.5)',
                          border: `1px solid ${betAmt > 0 ? GOLD : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: '2px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '28px',
                          padding: '2px',
                          position: 'relative',
                        }}
                      >
                        <span style={{ color: c === 'red' ? '#fca5a5' : 'rgba(255,255,255,0.8)', fontSize: '0.55rem', fontWeight: 600, lineHeight: 1 }}>{num}</span>
                        {betAmt > 0 && <ChipMarker amount={betAmt} small />}
                      </div>
                    )
                  })}
                </div>

                {/* Split 2 horizontales — entre columnas (mismo row) */}
                {TABLE_COLS.slice(0, 11).flatMap((col, ci) =>
                  col.map((num, ri) => {
                    const rightNum = TABLE_COLS[ci + 1][ri]
                    const id = `split2:${Math.min(num, rightNum)}-${Math.max(num, rightNum)}`
                    const amt = getBetOnSpot(id)
                    const cellW = 100 / 12
                    const cellH = 100 / 3
                    return (
                      <div
                        key={id}
                        onClick={(e) => { e.stopPropagation(); addBet('split2', `${Math.min(num, rightNum)}-${Math.max(num, rightNum)}`) }}
                        style={{
                          position: 'absolute',
                          left: `${(ci + 1) * cellW}%`,
                          top: `${ri * cellH}%`,
                          width: '8px',
                          height: `${cellH}%`,
                          transform: 'translateX(-50%)',
                          zIndex: 10,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div style={{
                          width: '6px',
                          height: '70%',
                          background: amt > 0 ? GOLD : 'rgba(212,175,55,0.25)',
                          borderRadius: '3px',
                          transition: 'all 0.15s',
                          position: 'relative',
                        }}>
                          {amt > 0 && <ChipMarker amount={amt} small />}
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Split 2 verticales — entre filas (misma columna) */}
                {TABLE_COLS.flatMap((col, ci) =>
                  col.slice(0, 2).map((num, ri) => {
                    const bottomNum = col[ri + 1]
                    const id = `split2:${Math.min(num, bottomNum)}-${Math.max(num, bottomNum)}`
                    const amt = getBetOnSpot(id)
                    const cellW = 100 / 12
                    const cellH = 100 / 3
                    return (
                      <div
                        key={id}
                        onClick={(e) => { e.stopPropagation(); addBet('split2', `${Math.min(num, bottomNum)}-${Math.max(num, bottomNum)}`) }}
                        style={{
                          position: 'absolute',
                          left: `${ci * cellW}%`,
                          top: `${(ri + 1) * cellH}%`,
                          width: `${cellW}%`,
                          height: '8px',
                          transform: 'translateY(-50%)',
                          zIndex: 10,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div style={{
                          height: '6px',
                          width: '70%',
                          background: amt > 0 ? GOLD : 'rgba(212,175,55,0.25)',
                          borderRadius: '3px',
                          transition: 'all 0.15s',
                          position: 'relative',
                        }}>
                          {amt > 0 && <ChipMarker amount={amt} small />}
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Split 4 esquinas */}
                {TABLE_COLS.slice(0, 11).flatMap((col, ci) =>
                  col.slice(0, 2).map((num, ri) => {
                    const n1 = col[ri]
                    const n2 = col[ri + 1]
                    const n3 = TABLE_COLS[ci + 1][ri]
                    const n4 = TABLE_COLS[ci + 1][ri + 1]
                    const nums = [n1, n2, n3, n4].sort((a, b) => a - b)
                    const id = `split4:${nums.join('-')}`
                    const amt = getBetOnSpot(id)
                    const cellW = 100 / 12
                    const cellH = 100 / 3
                    return (
                      <div
                        key={id}
                        onClick={(e) => { e.stopPropagation(); addBet('split4', nums.join('-')) }}
                        style={{
                          position: 'absolute',
                          left: `${(ci + 1) * cellW}%`,
                          top: `${(ri + 1) * cellH}%`,
                          width: '12px',
                          height: '12px',
                          transform: 'translate(-50%, -50%)',
                          zIndex: 20,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div style={{
                          width: amt > 0 ? '10px' : '7px',
                          height: amt > 0 ? '10px' : '7px',
                          borderRadius: '50%',
                          background: amt > 0 ? GOLD : 'rgba(212,175,55,0.4)',
                          border: amt > 0 ? '1.5px solid #fff' : '1px solid rgba(212,175,55,0.6)',
                          transition: 'all 0.15s',
                          position: 'relative',
                        }}>
                          {amt > 0 && <ChipMarker amount={amt} small />}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
'@

$content = $content.Replace($oldGrid, $newGrid)

# ── 2. FICHAS EN APUESTAS EXTERNAS (docenas) ──

$oldDocenas = @'
              {[{ v: '1', l: '1a DOCENA' }, { v: '2', l: '2a DOCENA' }, { v: '3', l: '3a DOCENA' }].map(d => (
                  <div
                    key={d.v}
                    className="bet-cell"
                    onClick={() => addBet('dozen', d.v)}
                    style={{
                      height: 24,
                      background: getBetOnSpot(`dozen:${d.v}`) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)',
                      border: `1px solid ${getBetOnSpot(`dozen:${d.v}`) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`,
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.38rem', letterSpacing: '0.1em', fontWeight: 600 }}>{d.l}</span>
                  </div>
                ))}
'@

$newDocenas = @'
              {[{ v: '1', l: '1a DOC' }, { v: '2', l: '2a DOC' }, { v: '3', l: '3a DOC' }].map(d => (
                  <div
                    key={d.v}
                    className="bet-cell"
                    onClick={() => addBet('dozen', d.v)}
                    style={{
                      height: 24,
                      background: getBetOnSpot(`dozen:${d.v}`) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)',
                      border: `1px solid ${getBetOnSpot(`dozen:${d.v}`) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`,
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.38rem', letterSpacing: '0.1em', fontWeight: 600 }}>{d.l}</span>
                    {getBetOnSpot(`dozen:${d.v}`) > 0 && <ChipMarker amount={getBetOnSpot(`dozen:${d.v}`)} small />}
                  </div>
                ))}
'@

$content = $content.Replace($oldDocenas, $newDocenas)

# ── 3. FICHAS EN MITADES / PARES / COLORES ──

$oldMitadesMap = @'
              {[
                { type: 'half' as const, val: 'low', label: '1-18' },
                { type: 'parity' as const, val: 'even', label: 'PAR' },
              ].map(b => (
                <div key={b.val} className="bet-cell" onClick={() => addBet(b.type, b.val)}
                  style={{ height: 24, background: getBetOnSpot(`${b.type}:${b.val}`) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)', border: `1px solid ${getBetOnSpot(`${b.type}:${b.val}`) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.38rem', letterSpacing: '0.1em', fontWeight: 600 }}>{b.label}</span>
                </div>
              ))}
              <div className="bet-cell" onClick={() => addBet('color', 'red')}
                style={{ height: 24, background: getBetOnSpot('color:red') > 0 ? 'rgba(180,0,0,0.6)' : 'rgba(120,0,0,0.4)', border: `1px solid ${getBetOnSpot('color:red') > 0 ? GOLD : 'rgba(255,255,255,0.1)'}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fca5a5', fontSize: '0.55rem' }}>●</span>
              </div>
              <div className="bet-cell" onClick={() => addBet('color', 'black')}
                style={{ height: 24, background: getBetOnSpot('color:black') > 0 ? 'rgba(50,50,50,0.8)' : 'rgba(20,20,20,0.6)', border: `1px solid ${getBetOnSpot('color:black') > 0 ? GOLD : 'rgba(255,255,255,0.1)'}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.55rem' }}>●</span>
              </div>
              {[
                { type: 'parity' as const, val: 'odd', label: 'IMPAR' },
                { type: 'half' as const, val: 'high', label: '19-36' },
              ].map(b => (
                <div key={b.val} className="bet-cell" onClick={() => addBet(b.type, b.val)}
                  style={{ height: 24, background: getBetOnSpot(`${b.type}:${b.val}`) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)', border: `1px solid ${getBetOnSpot(`${b.type}:${b.val}`) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.38rem', letterSpacing: '0.1em', fontWeight: 600 }}>{b.label}</span>
                </div>
              ))}
'@

$newMitadesMap = @'
              {[
                { type: 'half' as const, val: 'low', label: '1-18' },
                { type: 'parity' as const, val: 'even', label: 'PAR' },
              ].map(b => (
                <div key={b.val} className="bet-cell" onClick={() => addBet(b.type, b.val)}
                  style={{ height: 24, background: getBetOnSpot(`${b.type}:${b.val}`) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)', border: `1px solid ${getBetOnSpot(`${b.type}:${b.val}`) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.38rem', letterSpacing: '0.1em', fontWeight: 600 }}>{b.label}</span>
                  {getBetOnSpot(`${b.type}:${b.val}`) > 0 && <ChipMarker amount={getBetOnSpot(`${b.type}:${b.val}`)} small />}
                </div>
              ))}
              <div className="bet-cell" onClick={() => addBet('color', 'red')}
                style={{ height: 24, background: getBetOnSpot('color:red') > 0 ? 'rgba(180,0,0,0.6)' : 'rgba(120,0,0,0.4)', border: `1px solid ${getBetOnSpot('color:red') > 0 ? GOLD : 'rgba(255,255,255,0.1)'}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <span style={{ color: '#fca5a5', fontSize: '0.55rem' }}>●</span>
                {getBetOnSpot('color:red') > 0 && <ChipMarker amount={getBetOnSpot('color:red')} small />}
              </div>
              <div className="bet-cell" onClick={() => addBet('color', 'black')}
                style={{ height: 24, background: getBetOnSpot('color:black') > 0 ? 'rgba(50,50,50,0.8)' : 'rgba(20,20,20,0.6)', border: `1px solid ${getBetOnSpot('color:black') > 0 ? GOLD : 'rgba(255,255,255,0.1)'}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.55rem' }}>●</span>
                {getBetOnSpot('color:black') > 0 && <ChipMarker amount={getBetOnSpot('color:black')} small />}
              </div>
              {[
                { type: 'parity' as const, val: 'odd', label: 'IMPAR' },
                { type: 'half' as const, val: 'high', label: '19-36' },
              ].map(b => (
                <div key={b.val} className="bet-cell" onClick={() => addBet(b.type, b.val)}
                  style={{ height: 24, background: getBetOnSpot(`${b.type}:${b.val}`) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)', border: `1px solid ${getBetOnSpot(`${b.type}:${b.val}`) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.38rem', letterSpacing: '0.1em', fontWeight: 600 }}>{b.label}</span>
                  {getBetOnSpot(`${b.type}:${b.val}`) > 0 && <ChipMarker amount={getBetOnSpot(`${b.type}:${b.val}`)} small />}
                </div>
              ))}
'@

$content = $content.Replace($oldMitadesMap, $newMitadesMap)

# ── 4. FICHAS EN COLUMNAS 2:1 ──
$old2to1 = @'
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {['3', '2', '1'].map(col => (
                  <div
                    key={col}
                    className="bet-cell"
                    onClick={() => addBet('column', col)}
                    style={{
                      width: 28,
                      flex: 1,
                      background: getBetOnSpot(`column:${col}`) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)',
                      border: `1px solid ${getBetOnSpot(`column:${col}`) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`,
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.35rem', letterSpacing: '0.05em', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>2:1</span>
                  </div>
                ))}
              </div>
'@

$new2to1 = @'
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {['3', '2', '1'].map(col => (
                  <div
                    key={col}
                    className="bet-cell"
                    onClick={() => addBet('column', col)}
                    style={{
                      width: 28,
                      flex: 1,
                      background: getBetOnSpot(`column:${col}`) > 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.05)',
                      border: `1px solid ${getBetOnSpot(`column:${col}`) > 0 ? GOLD : 'rgba(212,175,55,0.2)'}`,
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <span style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.35rem', letterSpacing: '0.05em', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>2:1</span>
                    {getBetOnSpot(`column:${col}`) > 0 && <ChipMarker amount={getBetOnSpot(`column:${col}`)} small />}
                  </div>
                ))}
              </div>
'@

$content = $content.Replace($old2to1, $new2to1)

[System.IO.File]::WriteAllText((Resolve-Path $file), $content, [System.Text.Encoding]::UTF8)

# ── 5. BACKEND — agregar split2 y split4 a calcPayout ──
$routeFile = "src\app\api\play\roulette\route.ts"
$routeContent = [System.IO.File]::ReadAllText((Resolve-Path $routeFile), [System.Text.Encoding]::UTF8)

$oldDefault = @'
    case 'half':
      if (result === 0) return 0
      return (value === 'low' ? result <= 18 : result > 18) ? amount : 0
    default:
      return 0
'@

$newDefault = @'
    case 'half':
      if (result === 0) return 0
      return (value === 'low' ? result <= 18 : result > 18) ? amount : 0
    case 'split2': {
      const nums = value.split('-').map(Number)
      return nums.includes(result) ? amount * 17 : 0
    }
    case 'split4': {
      const nums = value.split('-').map(Number)
      return nums.includes(result) ? amount * 8 : 0
    }
    default:
      return 0
'@

$routeContent = $routeContent.Replace($oldDefault, $newDefault)
[System.IO.File]::WriteAllText((Resolve-Path $routeFile), $routeContent, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "✅ Splits y fichas aplicados." -ForegroundColor Green
Write-Host ""
Write-Host "Verificando frontend..." -ForegroundColor Cyan
$v1 = Get-Content $file | Select-String "split2|split4|ChipMarker.*dozen"
if ($v1) { Write-Host "   ✅ Frontend OK" -ForegroundColor Gray }

Write-Host "Verificando backend..." -ForegroundColor Cyan
$v2 = Get-Content $routeFile | Select-String "split2|split4"
if ($v2) { Write-Host "   ✅ Backend OK" -ForegroundColor Gray }
