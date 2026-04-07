# =========================================
# CASINO START SCRIPT - CLEAN + SAFE RUN
# =========================================

Write-Host "=== CASINO STARTING ===" -ForegroundColor Green

# CONFIG
$backendPath = "C:\Carlos\Core\Juegos\Ruleta-backend"
$frontendPath = "C:\Carlos\Core\Juegos\Ruleta-backend\frontend"

# PORTS TO CLEAN
$ports = @(4000, 5173, 5174, 5175, 5176, 5177, 5178, 5179)

Write-Host "Cleaning ports..." -ForegroundColor Yellow

foreach ($port in $ports) {
    $connections = netstat -ano | findstr ":$port"

    foreach ($line in $connections) {
        $parts = $line -split "\s+"
        $pid = $parts[-1]

        if ($pid -match "^\d+$") {
            Write-Host "Killing PID $pid on port $port" -ForegroundColor Red
            taskkill /PID $pid /F | Out-Null
        }
    }
}

Start-Sleep -Seconds 2

# BACKEND START
Write-Host "Starting BACKEND (port 4000)..." -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory $backendPath -ArgumentList "npm run dev"

Start-Sleep -Seconds 3

# FRONTEND START
Write-Host "Starting FRONTEND (VITE)..." -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory $frontendPath -ArgumentList "npm run dev"

Start-Sleep -Seconds 5

# CHECK STATUS
Write-Host "Checking services..." -ForegroundColor Yellow

try {
    Invoke-WebRequest http://localhost:4000 -UseBasicParsing | Out-Null
    Write-Host "Backend OK → http://localhost:4000" -ForegroundColor Green
} catch {
    Write-Host "Backend NOT responding (check logs)" -ForegroundColor Red
}

Write-Host "Frontend should be running on 5173 or 5174+" -ForegroundColor Green

Write-Host "=== CASINO ENV READY ===" -ForegroundColor Green