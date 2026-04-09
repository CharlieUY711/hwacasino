-- Tabla para solicitudes de depósito USDT y retiros pendientes
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency    TEXT        NOT NULL DEFAULT 'USDT',
  amount      NUMERIC     NOT NULL,
  tx_hash     TEXT,
  wallet_to   TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','confirmed','rejected')),
  admin_note  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dr_user   ON public.deposit_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_dr_status ON public.deposit_requests (status);

ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dr_select_own" ON public.deposit_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.withdraw_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency     TEXT        NOT NULL DEFAULT 'USDT',
  amount       NUMERIC     NOT NULL,
  address_to   TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','processing','sent','rejected')),
  tx_hash      TEXT,
  admin_note   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wr_select_own" ON public.withdraw_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Agregar USD a la wallet si no tiene
UPDATE public.wallets
SET balances = balances || '{"USD": 0}'::jsonb
WHERE NOT (balances ? 'USD');

UPDATE public.wallets
SET balances = balances || '{"USDT": 0}'::jsonb
WHERE NOT (balances ? 'USDT');
