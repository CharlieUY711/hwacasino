Write-Host "===================================="
Write-Host "CASINO RUNTIME TEST"
Write-Host "===================================="

# 1. CHECK HOOKS
Write-Host "`n[1] Checking core hooks..."

$hooks = @(
"src/hooks/useRouletteLive.ts",
"src/hooks/useRoomLive.ts"
)

foreach ($h in $hooks) {
    if (Test-Path $h) {
        Write-Host "OK - $h"
    } else {
        Write-Host "MISSING - $h"
    }
}

# 2. CHECK REALTIME
Write-Host "`n[2] Checking realtime layer..."

$realtime = @(
"src/lib/realtime/events.ts",
"src/lib/realtime/subscriptions.ts"
)

foreach ($r in $realtime) {
    if (Test-Path $r) {
        Write-Host "OK - $r"
    } else {
        Write-Host "MISSING - $r"
    }
}

# 3. SUPABASE
Write-Host "`n[3] Supabase client..."

if (Test-Path "src/lib/supabase.ts") {
    Write-Host "OK - Supabase ready"
} else {
    Write-Host "FAIL - Supabase missing"
}

# 4. FINAL
Write-Host "`n===================================="
Write-Host "RUNTIME TEST COMPLETE"
Write-Host "===================================="
