# HWA Casino — Prompt Contextual Maestro
> Pegar al inicio de cada sesión nueva para retomar sin perder contexto.
> Última actualización: 05/04/2026 — Repo nuevo analizado, checklist actualizada.

---

## INSTRUCCIÓN PARA CLAUDE

Sos el desarrollador principal de **HWA Casino**, una plataforma de casino privado VIP por invitación. Tenés contexto completo del proyecto. Trabajamos de forma iterativa: analizás el código existente, respetás las decisiones ya tomadas, y avanzamos tarea por tarea según la checklist activa. Antes de escribir código largo, confirmás el approach.

---

## 1. QUÉ ES HWA CASINO

Plataforma de casino **privado, VIP, por invitación**, con estas características clave:

- **Acceso**: Solo por código VIP (formato `VIP-XXXX-XXXX-XXXX`), sin exposición pública
- **Stack**: Next.js 16 (App Router) + TypeScript + Supabase + Vercel (sin Tailwind — estilos inline)
- **Moneda interna**: CHIPS (1 USD = 1,000 CHIPS). Toda la lógica de juego usa CHIPS
- **Plataformas objetivo**: Web (hwacasino.com) + Telegram Mini App (fase siguiente)
- **Territorio primario**: LATAM (Uruguay zona gris, modo CRYPTO por defecto)
- **Documento de referencia**: HWA_Casino_Documento_Maestro_v1_0.docx

### Design System (NO negociable)
```
Tipografía:   Cormorant Garamond (display, serif) + Montserrat (body, sans)
              Cargadas via Google Fonts en layout.tsx
Paleta:       Negro #000 / #0d0d0d  fondo principal
              Gold  #D4AF37         acento primario (const GOLD = '#D4AF37')
              Ivory rgba(255,255,255,0.85)  texto principal
              Muted rgba(255,255,255,0.25)  texto secundario
Efectos:      noise texture overlay (body::before) + vignette radial (body::after)
Animaciones:  fadeInUp, fadeIn, lineExpand, shimmer, pulse-gold (en globals.css)
              fade-up-1/2/3/4 para stagger del lobby
Tono visual:  luxury/refined — dark, elegante, minimalista con detalles dorados
Estilos:      Inline styles en React (no Tailwind). Variables reutilizables como
              const GOLD, const baseFont, const fieldStyle, const goldLinkStyle
```

---

## 2. ESTRUCTURA DEL REPO (src/)

```
src/
  app/
    page.tsx              ← VIP gate + Login + Register en una sola pantalla ✅
    layout.tsx            ← Layout base, Google Fonts, metadata
    globals.css           ← Design system: noise, vignette, animaciones, corner ornaments
    lobby/
      page.tsx            ← Lobby completo (UI ~70% lista, datos hardcodeados) ⚠️
    invite/
      page.tsx            ← (verificar contenido)
  lib/
    supabaseClient.ts     ← createClient con validación de env vars ✅
  modules/
    auth/
      invite.ts           ← validateInviteCode + markInviteUsed (limpio, sin .single()) ✅
      login.ts            ← loginWithEmail ✅
      register.ts         ← registerWithEmail ✅

-- Archivos que faltan crear:
  middleware.ts           ← Protección de rutas  ← PRÓXIMO PASO
  hooks/
    useWallet.ts          ← Balance realtime desde Supabase
    useAuth.ts            ← Sesión del usuario actual
  modules/
    wallet/
      wallet.ts           ← placeBet(), resolveBet() via RPC
  app/
    api/play/
      roulette/route.ts
      blackjack/deal/route.ts
      blackjack/hit/route.ts
      blackjack/stand/route.ts
      blackjack/double/route.ts
    roulette/page.tsx
    blackjack/page.tsx
```

---

## 3. SCHEMA SUPABASE (aplicado en DB)

```sql
-- Tablas (todas con RLS activo):
profiles      (id uuid PK, created_at)
wallets       (id uuid PK, user_id uuid FK, balance integer)  -- balance en CHIPS
transactions  (id, wallet_id, amount, type, created_at)
bets          (id, user_id, game, amount, result, created_at)
invites       (id, code, used bool, used_by, used_at, inviter_id, invited_user_id)
game_rounds   (id, user_id, game, bet_amount, choice, result, payout, created_at)

-- Trigger activo:
on_auth_user_created → handle_new_user()
  → INSERT profiles ON CONFLICT DO NOTHING
  → INSERT wallets (user_id, balance=0) ON CONFLICT DO NOTHING

-- RLS policies activas:
profiles:      SELECT/UPDATE propios
wallets:       SELECT propios
transactions:  SELECT propios via wallet_id
bets:          SELECT propios
invites:       SELECT donde inviter_id o invited_user_id = uid()
game_rounds:   SELECT público (para live winners feed)

-- PENDIENTE agregar a Supabase (SQL a correr):
- RPC place_bet(p_user_id, p_game, p_amount)  → debit atómico
- RPC resolve_bet(p_bet_id, p_payout)          → credit atómico
- Trigger o función: 1,000 CHIPS bienvenida al primer registro
- Policy INSERT en game_rounds para service role
- Policy INSERT en transactions para service role
```

---

## 4. CHECKLIST ACTIVA

### ✅ COMPLETADO

#### Auth & Entry
- [x] VIP gate — slots animados, inputs reales, sin hardcode, valida Supabase
- [x] Login + Register en misma pantalla, transición fluida
- [x] modules/auth — login, register, invite limpios y separados
- [x] validateInviteCode + markInviteUsed (robusto, sin .single())
- [x] supabaseClient con validación de env vars

#### Lobby UI (visual, sin datos reales)
- [x] Header con balance (hardcodeado por ahora)
- [x] Game cards — Ruleta grande, BJ + Slots small, Dice grande
- [x] Live winners ticker animado (datos mock)
- [x] Bottom nav 5 ítems + FAB depósito
- [x] Concierge Services section
- [x] Logout funcional

---

### 🔒 BLOQUE 1 — Fundación datos reales
> Todo este bloque debe completarse antes de empezar los juegos.

#### 1.1 middleware.ts — Protección de rutas
- [ ] Instalar `@supabase/ssr` (`npm install @supabase/ssr`)
- [ ] Crear `src/middleware.ts`
- [ ] Rutas protegidas: `/lobby`, `/roulette`, `/blackjack` → redirect `/` sin sesión
- [ ] Rutas públicas: `/` siempre pasa
- [ ] Crear cliente SSR en middleware (createServerClient de @supabase/ssr)
- [ ] Probar: acceder a /lobby sin sesión → redirige a /

#### 1.2 useWallet — Balance realtime
- [ ] Crear `src/hooks/useWallet.ts`
- [ ] Leer balance inicial de `wallets` WHERE user_id = uid()
- [ ] Suscripción Realtime a cambios en esa fila
- [ ] Retornar `{ balance: number, loading: boolean, formatChips: (n) => string }`
- [ ] `formatChips`: `n.toLocaleString('es-UY') + ' CHIPS'`

#### 1.3 Lobby — Conectar datos reales
- [ ] Reemplazar balance hardcodeado con `useWallet().balance`
- [ ] `router.push('/roulette')` en botón play de Ruleta
- [ ] `router.push('/blackjack')` en botón play de BJ
- [ ] Live winners ticker: suscribir a `game_rounds` via Supabase Realtime

#### 1.4 Wallet — Operaciones atómicas (SQL + módulo)
- [ ] Correr SQL en Supabase: RPC `place_bet` (debit + insert transaction atómico)
- [ ] Correr SQL en Supabase: RPC `resolve_bet` (credit + insert transaction atómico)
- [ ] Correr SQL en Supabase: 1,000 CHIPS bienvenida al registro
- [ ] Crear `src/modules/wallet/wallet.ts` con `placeBet()` y `resolveBet()`

---

### 🎰 BLOQUE 2 — Ruleta Europea

#### Backend `src/app/api/play/roulette/route.ts`
- [ ] RNG: `crypto.getRandomValues()` → número 0–36
- [ ] Tipos de apuesta y pagos:
  - Pleno (número exacto): 35:1
  - Color (rojo/negro): 1:1
  - Par/impar: 1:1
  - Docena (1-12, 13-24, 25-36): 2:1
  - Columna: 2:1
  - Mitad (1-18, 19-36): 1:1
- [ ] Llamar `placeBet()` antes de calcular resultado
- [ ] Persistir en `game_rounds` con service role
- [ ] Llamar `resolveBet()` con el payout

#### Frontend `src/app/roulette/page.tsx`
- [ ] Header con balance (useWallet)
- [ ] Mesa de apuestas — grid 37 números + zonas externas clickeables
- [ ] Selector de monto (chips: 100 / 500 / 1K / 5K)
- [ ] Rueda SVG/Canvas — gira 3-5s, detiene en número ganador
- [ ] Overlay resultado — ganó/perdió + monto
- [ ] Historial últimas 12 tiradas (burbujas rojo/negro/verde)
- [ ] Botón volver al lobby

---

### 🃏 BLOQUE 3 — Blackjack

#### Backend
- [ ] `deal/route.ts` — repartir mano inicial (2 cartas jugador, 2 dealer con 1 oculta)
- [ ] `hit/route.ts` — pedir carta
- [ ] `stand/route.ts` — plantarse + resolver mano del dealer + resultado
- [ ] `double/route.ts` — doblar apuesta + una carta + resolver
- [ ] Lógica del mazo: single-deck, barajar con crypto RNG
- [ ] Valor cartas: As=1/11 (el que no pase de 21), figuras=10
- [ ] Reglas dealer: pide ≤16, planta ≥17
- [ ] BJ natural (21 en 2 cartas) → pago 3:2
- [ ] Estado de sesión en tabla `game_sessions` o JWT firmado (nunca localStorage)
- [ ] Persistir resultado en `game_rounds`

#### Frontend `src/app/blackjack/page.tsx`
- [ ] Mesa con zona dealer y zona jugador separadas
- [ ] Cartas con flip animation CSS (oculta → visible al repartir)
- [ ] Puntos visibles para jugador, dealer muestra solo 1 carta
- [ ] Botones: Hit / Stand / Double (Double solo en turno inicial)
- [ ] Overlay resultado: Blackjack / Ganó / Perdió / Empate
- [ ] Botón nueva mano / volver al lobby

---

## 5. CONVENCIONES DE CÓDIGO

```typescript
// Imports
import { supabase } from '@/lib/supabaseClient'       // cliente browser
import { createClient } from '@supabase/supabase-js'  // en API routes (service role)

// CHIPS siempre integer, nunca float
const formatChips = (n: number) => n.toLocaleString('es-UY') + ' CHIPS'
// 12500 → "12.500 CHIPS"

// Gold en cada componente
const GOLD = '#D4AF37'

// En API routes — siempre service role (nunca anon key para escritura)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// RNG seguro (Edge Runtime + Node)
const array = new Uint32Array(1)
crypto.getRandomValues(array)
const result = array[0] % 37  // 0-36 ruleta europea
```

### Reglas de seguridad de juego (NO negociables)
- RNG **siempre** server-side, nunca en el cliente
- Balance se debita **antes** de calcular resultado (previene race conditions)
- Operaciones de wallet **atómicas** via RPC de Supabase
- Estado de mano de BJ **server-side** (nunca en localStorage o cliente)

---

## 6. PRÓXIMA TAREA

```
BLOQUE 1.1 — middleware.ts
1. npm install @supabase/ssr
2. Crear src/middleware.ts
3. Proteger /lobby, /roulette, /blackjack
4. Probar que /lobby sin sesión redirige a /
```
