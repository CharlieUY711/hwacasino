Write-Host "===================================="
Write-Host "CASINO FASE 5.5 SETUP START"
Write-Host "===================================="

$root = "src"
$hooks = "$root/hooks"
$lib = "$root/lib/realtime"

Write-Host "[1] Creating folders..."

New-Item -ItemType Directory -Force -Path "$hooks"
New-Item -ItemType Directory -Force -Path "$lib"

Write-Host "OK - folders created"

Write-Host "[2] Creating hook stubs..."

$files = @(
"$hooks/useRouletteLive.ts",
"$hooks/useLiveBets.ts",
"$hooks/useWalletLive.ts",
"$hooks/useRoomLive.ts",
"$lib/realtime/events.ts",
"$lib/realtime/subscriptions.ts",
"$root/types/index.ts"
)

foreach ($f in $files) {
    if (!(Test-Path $f)) {
        New-Item -ItemType File -Force -Path $f
        Write-Host "CREATED - $f"
    } else {
        Write-Host "EXISTS - $f"
    }
}

Write-Host "[3] Checking Supabase client..."

if (Test-Path "$root/lib/supabase.ts") {
    Write-Host "OK - Supabase client found"
} else {
    Write-Host "WARNING - missing supabase client"
}

Write-Host "===================================="
Write-Host "FASE 5.5 STRUCTURE READY"
Write-Host "===================================="
