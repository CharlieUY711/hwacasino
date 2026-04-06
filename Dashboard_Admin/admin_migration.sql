-- ============================================================
-- HWA Casino — Admin Dashboard SQL Migration
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Asignar rol admin a tu usuario
-- Reemplaza el email con el tuyo
UPDATE profiles
SET role = 'superadmin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'tu-email@ejemplo.com'
);

-- 2. Indice en deposits para queries de admin
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);

-- 3. Indice en bets para stats por fecha
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);

-- 4. Indice en roulette_rounds para stats diarias
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_created_at ON roulette_rounds(created_at DESC);

-- 5. View agregada para stats rapidas de admin (opcional, mejora performance)
CREATE OR REPLACE VIEW admin_user_stats AS
SELECT
  p.id,
  p.username,
  p.role,
  p.telegram_id,
  p.created_at,
  COALESCE(w.balance, 0) AS balance,
  COALESCE(b.bet_count, 0) AS bet_count,
  COALESCE(b.total_wagered, 0) AS total_wagered
FROM profiles p
LEFT JOIN wallets w ON w.user_id = p.id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS bet_count, SUM(amount) AS total_wagered
  FROM bets
  GROUP BY user_id
) b ON b.user_id = p.id;

-- 6. RLS para admin: los admins pueden leer todos los profiles
-- (Solo si RLS esta activado y necesitas acceso con anon key desde cliente)
-- Con service_role_key en el backend no es necesario.

-- 7. Verificar roles disponibles
-- SELECT DISTINCT role FROM profiles;

-- ============================================================
-- Para produccion: agregar columna inviter_id en invites si
-- quieres rastrear quien genero cada codigo
-- ============================================================
ALTER TABLE invites ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
ALTER TABLE invites ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
