# =========================================
# CASINO LIVE SYSTEM AUDIT TOOL
# =========================================

Write-Host "===================================="
Write-Host "CASINO LIVE AUDIT STARTING..."
Write-Host "===================================="

# 1. CHECK PROJECT STRUCTURE
Write-Host "`n[1] Checking required folders..."

$requiredPaths = @(
  "src/types",
  "src/lib/realtime",
  "src/hooks",
  "src/components"
)

foreach ($path in $requiredPaths) {
  if (Test-Path $path) {
    Write-Host "OK  - $path"
  } else {
    Write-Host "MISSING - $path"
  }
}

# 2. CHECK CORE FILES
Write-Host "`n[2] Checking core files..."

$coreFiles = @(
  "src/lib/realtime/events.ts",
  "src/lib/realtime/subscriptions.ts",
  "src/hooks/useRouletteLive.ts",
  "src/hooks/useLiveBets.ts",
  "src/hooks/useWalletLive.ts",
  "src/hooks/useRoomLive.ts",
  "src/components/RouletteView.tsx",
  "src/types/index.ts"
)

foreach ($file in $coreFiles) {
  if (Test-Path $file) {
    Write-Host "OK  - $file"
  } else {
    Write-Host "MISSING - $file"
  }
}

# 3. CHECK SUPABASE CONNECTION FILES
Write-Host "`n[3] Checking Supabase config..."

if (Test-Path "src/lib/supabase.ts") {
  Write-Host "OK  - Supabase client exists"
} else {
  Write-Host "MISSING - Supabase client not found"
}

# 4. BASIC CODE HEALTH CHECK
Write-Host "`n[4] Checking for critical runtime risks..."

$filesToScan = Get-ChildItem -Recurse -Include *.ts, *.tsx -ErrorAction SilentlyContinue

$issues = 0

foreach ($file in $filesToScan) {
  $content = Get-Content $file.FullName -Raw

  if ($content -match "roulette_rounds.status") {
    Write-Host "RISK - raw DB status used in UI: $($file.FullName)"
    $issues++
  }

  if ($content -match "wallet_transactions") {
    Write-Host "INFO - wallet access: $($file.FullName)"
  }

  if ($content -match "supabase\.from\(") {
    Write-Host "CHECK - direct Supabase query: $($file.FullName)"
  }
}

# 5. SUMMARY
Write-Host "`n===================================="
Write-Host "AUDIT COMPLETE"
Write-Host "Issues found: $issues"
Write-Host "===================================="

if ($issues -eq 0) {
  Write-Host "SYSTEM READY FOR FASE 5.5"
} else {
  Write-Host "FIX ISSUES BEFORE CONTINUING"
}