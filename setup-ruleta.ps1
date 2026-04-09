# ============================================================
# setup-ruleta.ps1
# Aplica todos los fixes y configura Git para el proyecto Ruleta
# Ejecutar desde cualquier lugar: .\setup-ruleta.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$ROOT = "C:\Carlos\HWA\hwacasino"

function Write-Step { param($msg) Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "   OK: $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "   WARN: $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "   ERROR: $msg" -ForegroundColor Red; exit 1 }

# ── Verificar que el directorio existe ───────────────────────
if (-not (Test-Path $ROOT)) {
    Write-Fail "No se encontro el directorio: $ROOT"
}
Set-Location $ROOT
Write-OK "Directorio: $ROOT"

# ── Detectar si el proyecto usa /src/app o /app ──────────────
$APP_DIR = if (Test-Path "$ROOT\src\app") { "$ROOT\src" } else { $ROOT }
Write-OK "App dir detectado: $APP_DIR"

# ── Verificar que es un proyecto Next.js ─────────────────────
if (-not (Test-Path "$ROOT\package.json")) {
    Write-Fail "No se encontro package.json en $ROOT — verificar que es el directorio correcto"
}

# ============================================================
# FIX 1 — route.ts
# ============================================================
Write-Step "FIX 1: Reemplazando app/api/play/roulette/route.ts"

$ROUTE_DIR = "$APP_DIR\app\api\play\roulette"
if (-not (Test-Path $ROUTE_DIR)) {
    New-Item -ItemType Directory -Path $ROUTE_DIR -Force | Out-Null
    Write-Warn "Directorio creado: $ROUTE_DIR"
}

$ROUTE_CONTENT = @'
// app/api/play/roulette/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Bet = {
  bet_type: string
  bet_value: string
  amount: number
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { user_id, bets } = body as { user_id: string; bets: Bet[] }

    if (!user_id || !Array.isArray(bets) || bets.length === 0) {
      return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
    }

    for (const bet of bets) {
      if (!bet.bet_type || !bet.bet_value || typeof bet.amount !== 'number' || bet.amount <= 0) {
        return NextResponse.json({ error: 'Apuesta malformada' }, { status: 400 })
      }
    }

    const { data, error } = await supabase.rpc('play_roulette', {
      p_user_id: user_id,
      p_bets:    bets,
    })

    if (error) {
      const msg = error.message ?? ''
      if (msg.includes('insufficient_balance')) {
        return NextResponse.json({ error: 'insufficient_balance' }, { status: 400 })
      }
      if (msg.includes('wallet_not_found')) {
        return NextResponse.json({ error: 'wallet_not_found' }, { status: 404 })
      }
      console.error('[play/roulette]', error)
      return NextResponse.json({ error: 'Error al procesar la apuesta' }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (err) {
    console.error('[play/roulette] catch', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
'@

Set-Content -Path "$ROUTE_DIR\route.ts" -Value $ROUTE_CONTENT -Encoding UTF8
Write-OK "route.ts reemplazado"

# ============================================================
# FIX 2 — Presence useEffect en play/page.tsx
# ============================================================
Write-Step "FIX 2: Parcheando presence useEffect en roulette/play/page.tsx"

# Buscar page.tsx en posibles ubicaciones
$PAGE_CANDIDATES = @(
    "$APP_DIR\app\roulette\play\page.tsx",
    "$ROOT\app\roulette\play\page.tsx",
    "$ROOT\src\app\roulette\play\page.tsx"
)
$PAGE_PATH = $null
foreach ($c in $PAGE_CANDIDATES) {
    if (Test-Path $c) { $PAGE_PATH = $c; break }
}
if (-not $PAGE_PATH) {
    Write-Warn "No se encontro roulette/play/page.tsx — fix 2 omitido, aplicar manualmente"
} else {
    Write-OK "Encontrado: $PAGE_PATH"

    $content = Get-Content $PAGE_PATH -Raw -Encoding UTF8

    # Bloque viejo — el comentario + useEffect de presencia completo
    $OLD_PRESENCE = @'
  // --- PRESENCIA REALTIME ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('room') ?? 'vip-1'

  

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const channel = supabase.channel(`presence:${r}`, {
        config: { presence: { key: user.id } },
      })
      channel.on('presence', { event: 'sync' }, () => {
          const count = Object.keys(channel.presenceState()).length
          setOnlineCount(count)
        })
      channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: user.id, room: r, online_at: new Date().toISOString() })
          }
        })
      return () => { supabase.removeChannel(channel) }
    })
  }, [])
'@

    $NEW_PRESENCE = @'
  // --- PRESENCIA REALTIME ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('room') ?? 'vip-1'

    let presenceChannel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      presenceChannel = supabase.channel(`presence:${r}`, {
        config: { presence: { key: user.id } },
      })

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          if (!presenceChannel) return
          const count = Object.keys(presenceChannel.presenceState()).length
          setOnlineCount(count)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && presenceChannel) {
            await presenceChannel.track({
              user_id:   user.id,
              room:      r,
              online_at: new Date().toISOString(),
            })
          }
        })
    })

    return () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel)
        presenceChannel = null
      }
    }
  }, [])
'@

    if ($content.Contains($OLD_PRESENCE.Trim())) {
        $patched = $content.Replace($OLD_PRESENCE, $NEW_PRESENCE)
        Set-Content -Path $PAGE_PATH -Value $patched -Encoding UTF8 -NoNewline
        Write-OK "presence useEffect parcheado correctamente"
    } else {
        Write-Warn "El bloque de presencia no coincide exactamente — puede que ya fue modificado"
        Write-Warn "Aplicar manualmente el contenido de presence-fix.ts"
    }
}

# ============================================================
# FIX 3 — .gitignore
# ============================================================
Write-Step "FIX 3: Creando .gitignore"

$GITIGNORE = @'
# Dependencias
node_modules/
.pnp
.pnp.js

# Next.js build
.next/
out/
build/

# Variables de entorno
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor
.DS_Store
.idea/
.vscode/
*.swp

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
'@

Set-Content -Path "$ROOT\.gitignore" -Value $GITIGNORE -Encoding UTF8
Write-OK ".gitignore creado"

# ============================================================
# FIX 4 — .env.local.example
# ============================================================
Write-Step "FIX 4: Creando .env.local.example"

$ENV_EXAMPLE = @'
# Copiar como .env.local y completar SUPABASE_SERVICE_ROLE_KEY
# Obtenerla en: Supabase Dashboard -> Settings -> API -> service_role

NEXT_PUBLIC_SUPABASE_URL=https://msxvjmiatsaxnjebqpqq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zeHZqbWlhdHNheG5qZWJxcHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTgyOTIsImV4cCI6MjA5MTA3NDI5Mn0.VA5xnTCkzT9QMTNFUiX7RYbJY52awjz9I9Xf0wkW9Zg
SUPABASE_SERVICE_ROLE_KEY=PEGAR_AQUI_EL_SERVICE_ROLE_KEY
'@

Set-Content -Path "$ROOT\.env.local.example" -Value $ENV_EXAMPLE -Encoding UTF8
Write-OK ".env.local.example creado"

# Crear .env.local solo si no existe (no sobreescribir keys reales)
if (-not (Test-Path "$ROOT\.env.local")) {
    Set-Content -Path "$ROOT\.env.local" -Value $ENV_EXAMPLE -Encoding UTF8
    Write-Warn ".env.local creado — COMPLETAR SUPABASE_SERVICE_ROLE_KEY antes de correr el proyecto"
} else {
    Write-OK ".env.local ya existe — no se sobreescribe"
}

# ============================================================
# GIT — init, stage, primer commit
# ============================================================
Write-Step "GIT: Inicializando repositorio"

$gitExists = git -C $ROOT rev-parse --is-inside-work-tree 2>$null
if ($gitExists -eq "true") {
    Write-OK "Git ya inicializado — saltando git init"
} else {
    git init
    Write-OK "git init OK"
}

git add .

# Verificar si hay algo para commitear
$status = git status --porcelain
if ($status) {
    git commit -m "feat: wallet fix + schema Supabase + presence useEffect fix"
    Write-OK "Commit creado"
} else {
    Write-OK "Nada nuevo para commitear"
}

# ============================================================
# RESUMEN FINAL
# ============================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor White
Write-Host " LISTO. Proximos pasos manuales:" -ForegroundColor White
Write-Host "============================================" -ForegroundColor White
Write-Host ""
Write-Host " 1. SUPABASE — ejecutar schema.sql" -ForegroundColor Yellow
Write-Host "    Ir a: https://msxvjmiatsaxnjebqpqq.supabase.co" -ForegroundColor Gray
Write-Host "    SQL Editor -> New query -> pegar schema.sql -> Run" -ForegroundColor Gray
Write-Host ""
Write-Host " 2. SUPABASE — habilitar Realtime para 'wallets'" -ForegroundColor Yellow
Write-Host "    Dashboard -> Database -> Replication -> activar tabla wallets" -ForegroundColor Gray
Write-Host ""
Write-Host " 3. SERVICE ROLE KEY en .env.local" -ForegroundColor Yellow
Write-Host "    Dashboard -> Settings -> API -> service_role (secret)" -ForegroundColor Gray
Write-Host "    Reemplazar PEGAR_AQUI_... en .env.local" -ForegroundColor Gray
Write-Host ""
Write-Host " 4. GITHUB — crear repo y pushear" -ForegroundColor Yellow
Write-Host "    gh repo create core-juegos-ruleta --private --source=. --push" -ForegroundColor Gray
Write-Host "    (o crear manualmente en github.com y agregar remote)" -ForegroundColor Gray
Write-Host ""
Write-Host " 5. VERCEL — conectar el repo" -ForegroundColor Yellow
Write-Host "    vercel.com -> Add New Project -> importar desde GitHub" -ForegroundColor Gray
Write-Host "    Agregar las 3 variables de .env.local en el dashboard de Vercel" -ForegroundColor Gray
Write-Host ""
Write-Host " 6. PROBAR localmente" -ForegroundColor Yellow
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host ""
