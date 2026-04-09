# ═══════════════════════════════════════════════════════════════
#  HWA Casino — Fix flujo VIP
#  Ejecutar desde cualquier ubicacion:
#    powershell -ExecutionPolicy Bypass -File "C:\ruta\fix-hwa-vip.ps1"
# ═══════════════════════════════════════════════════════════════

$file = "C:\Carlos\HWA\hwacasino\hwa-casino-standalone.html"

if (-not (Test-Path $file)) {
    Write-Host "ERROR: No se encuentra $file" -ForegroundColor Red
    exit 1
}

# Backup
$backup = $file + ".bak_" + (Get-Date -Format "yyyyMMdd_HHmmss")
Copy-Item $file $backup
Write-Host "Backup creado: $backup" -ForegroundColor Cyan

$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# ───────────────────────────────────────────────────────────────
# FIX 1 — checkSession con try/catch
# Problema: si Supabase tira error, la destructuring explota y
# nada se muestra en pantalla (pantalla negra).
# ───────────────────────────────────────────────────────────────
$old1 = @'
async function checkSession(){
  const {data:{user}} = await sb.auth.getUser()
  if(user){ currentUser=user; await loadBalance(); showLobby() }
  else { showScreen('auth'); showPanel('code') }
}
'@

$new1 = @'
async function checkSession(){
  try {
    const { data, error } = await sb.auth.getUser()
    const user = data?.user ?? null
    if(user && !error){
      currentUser = user
      await loadBalance()
      showLobby()
    } else {
      showScreen('auth')
      showPanel('code')
    }
  } catch(e) {
    console.warn('[HWA] checkSession error:', e)
    showScreen('auth')
    showPanel('code')
  }
}
'@

# ───────────────────────────────────────────────────────────────
# FIX 2 — validateCode sin bloqueo por used=true
# Problema: todos los codigos estan used=true → bloqueado.
# Nuevo flujo: el codigo puede reutilizarse para registrarse.
# Solo se bloquea si el codigo no existe.
# ───────────────────────────────────────────────────────────────
$old2 = @'
  if(error||!data||data.used){
    codeState='error'; updateSlotUI()
    setStatus('CÓDIGO INVÁLIDO','#e05252')
    return
  }
'@

$new2 = @'
  if(error || !data){
    codeState='error'; updateSlotUI()
    setStatus('CÓDIGO INVÁLIDO','#e05252')
    return
  }
'@

# ───────────────────────────────────────────────────────────────
# FIX 3 — DOMContentLoaded mas robusto
# Problema: si buildSlots() o slot-hidden no existen aun, explota
# antes de llamar checkSession(), entonces nunca se inicializa.
# ───────────────────────────────────────────────────────────────
$old3 = @'
document.addEventListener('DOMContentLoaded',()=>{
  buildSlots()
  // tap en el área de código → foco input hidden
  document.addEventListener('touchend',e=>{
    if(e.target.closest('#panel-code')) $('slot-hidden')?.focus()
  })
  $('slot-hidden').addEventListener('focus',()=>updateSlotUI())
  checkSession()
})
'@

$new3 = @'
document.addEventListener('DOMContentLoaded',()=>{
  try { buildSlots() } catch(e){ console.warn('[HWA] buildSlots:', e) }

  document.addEventListener('touchend', e => {
    if(e.target.closest('#panel-code')) $('slot-hidden')?.focus()
  })

  const hiddenSlot = $('slot-hidden')
  if(hiddenSlot) hiddenSlot.addEventListener('focus', () => updateSlotUI())

  // Mostrar auth inmediatamente, checkSession decide si va al lobby
  showScreen('auth')
  showPanel('code')

  checkSession()
})
'@

# ───────────────────────────────────────────────────────────────
# FIX 4 — doRegister: no marcar used=true al registrarse
# Para que el mismo codigo pueda usarse en multiples dispositivos
# ───────────────────────────────────────────────────────────────
$old4 = @'
  // marcar invite como usado y guardar bono
  if(pendingInvite?.id&&currentUser?.id){
    await sb.from('invites').update({
      used:true,
      used_by:currentUser.id,
      used_at:new Date().toISOString()
    }).eq('id',pendingInvite.id)
'@

$new4 = @'
  // registrar uso sin bloquear el codigo (reusable)
  if(pendingInvite?.id&&currentUser?.id){
    await sb.from('invite_redemptions').insert({
      invite_id: pendingInvite.id,
      user_id: currentUser.id,
      redeemed_at: new Date().toISOString()
    }).catch(()=>{}) // silencioso si la tabla no existe aun
    // NO marcamos used=true para que el codigo sea reutilizable
'@

# ─── Aplicar todos los fixes ───────────────────────────────────
$fixes = @(
  @{ old = $old1; new = $new1; name = "checkSession try/catch" },
  @{ old = $old2; new = $new2; name = "validateCode sin bloqueo used" },
  @{ old = $old3; new = $new3; name = "DOMContentLoaded robusto" },
  @{ old = $old4; new = $new4; name = "doRegister no marca used" }
)

$applied = 0
foreach ($fix in $fixes) {
    if ($content.Contains($fix.old)) {
        $content = $content.Replace($fix.old, $fix.new)
        Write-Host "  OK  $($fix.name)" -ForegroundColor Green
        $applied++
    } else {
        Write-Host "  SKIP $($fix.name) — patron no encontrado (ya aplicado?)" -ForegroundColor Yellow
    }
}

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "$applied fixes aplicados en $file" -ForegroundColor Cyan
Write-Host ""

# ─── SQL para Supabase (imprimir como recordatorio) ────────────
Write-Host "═══════════════════════════════════════════════" -ForegroundColor DarkYellow
Write-Host " EJECUTA ESTO EN SUPABASE SQL EDITOR:" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════" -ForegroundColor DarkYellow
Write-Host @'

-- 1. Habilitar codigos para reutilizacion
UPDATE invites SET used = false;

-- 2. RLS: permitir que anon lea invites
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon lee invites" ON invites;
CREATE POLICY "anon lee invites"
ON invites FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Crear tabla de redemptions si no existe
CREATE TABLE IF NOT EXISTS invite_redemptions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id   uuid REFERENCES invites(id),
  user_id     uuid,
  redeemed_at timestamptz DEFAULT now()
);

'@ -ForegroundColor White

Write-Host "═══════════════════════════════════════════════" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "Listo. Recarga la pagina y el flujo VIP deberia funcionar." -ForegroundColor Green
