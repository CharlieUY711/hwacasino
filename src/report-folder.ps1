# ============================================
#   REPORTADOR DE CARPETA – CARLOS
#   Uso: ./report-folder.ps1
#   Función: Mostrar TODO lo que hay en la carpeta actual
# ============================================

Write-Host "📁 Reportando contenido de la carpeta actual..." -ForegroundColor Cyan
Write-Host ""

# --- 1) Mostrar ruta actual ---
$path = Get-Location
Write-Host "📌 Carpeta: $path" -ForegroundColor Yellow
Write-Host ""

# --- 2) Mostrar carpetas ---
Write-Host "📂 Carpetas:" -ForegroundColor Green
Get-ChildItem -Directory | ForEach-Object {
    Write-Host "   - $($_.Name)"
}
Write-Host ""

# --- 3) Mostrar archivos ---
Write-Host "📄 Archivos:" -ForegroundColor Green
Get-ChildItem -File | ForEach-Object {
    $size = "{0:N0}" -f ($_.Length)
    Write-Host "   - $($_.Name)  ($size bytes)"
}
Write-Host ""

# --- 4) Resumen por extensión ---
Write-Host "🔠 Extensiones encontradas:" -ForegroundColor Green
Get-ChildItem -File |
    Group-Object Extension |
    Sort-Object Count -Descending |
    ForEach-Object {
        Write-Host "   $($_.Name): $($_.Count)"
    }
Write-Host ""

# --- 5) Estructura en árbol ---
Write-Host "🌳 Estructura en árbol:" -ForegroundColor Green
tree /F
Write-Host ""

# --- 6) Totales ---
$files = Get-ChildItem -File -Recurse
$dirs  = Get-ChildItem -Directory -Recurse

Write-Host "📊 Totales:" -ForegroundColor Green
Write-Host "   Carpetas: $($dirs.Count)"
Write-Host "   Archivos: $($files.Count)"
Write-Host ""

Write-Host "🔧 Reporte finalizado."