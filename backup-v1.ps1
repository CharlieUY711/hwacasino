# backup-v1.ps1
# Cierra la version actual de Roulette Sophie y la respalda en Git

$ROOT = "C:\Carlos\HWA\hwacasino"
Set-Location $ROOT

Write-Host "`n== ROULETTE SOPHIE v1.0 — BACKUP ==" -ForegroundColor Cyan

# 1. Stage todo
git add .

# 2. Commit de cierre
git commit -m "feat: Roulette Sophie v1.0 — juego completo

- Ruleta europea con todos los tipos de apuesta
- Wallet multimoneda con Realtime (Supabase)
- Header Cormorant Garamond unificado
- Boton Girar: gris/amarillo segun phase
- Esfera central con numero ganador
- Etiquetas Apuesta/Ganado con timing correcto
- Historico, calientes y frios
- Modo solo y multiplayer
- Codigos promocionales (schema listo)"

# 3. Tag de version
git tag -a v1.0-roulette-sophie -m "Roulette Sophie v1.0 — primera version jugable completa"

Write-Host "OK: commit creado" -ForegroundColor Green
Write-Host "OK: tag v1.0-roulette-sophie" -ForegroundColor Green

# 4. Push si hay remote configurado
$remote = git remote 2>$null
if ($remote) {
    git push origin main
    git push origin v1.0-roulette-sophie
    Write-Host "OK: push completado" -ForegroundColor Green
} else {
    Write-Host "WARN: no hay remote configurado — push omitido" -ForegroundColor Yellow
    Write-Host "      Para configurar: git remote add origin https://github.com/TU_USUARIO/hwacasino.git" -ForegroundColor Gray
}

Write-Host "`n== LISTO — v1.0 respaldada ==" -ForegroundColor Cyan
Write-Host "Proximo: sistema de carga de fondos" -ForegroundColor Gray
