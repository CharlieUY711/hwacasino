'use client'
import { usePromoCode } from '@/hooks/usePromoCode'

const GOLD = '#D4AF37'

interface Props {
  userId: string | null
  onValid?: (promo: ReturnType<typeof usePromoCode>['promo']) => void
  compact?: boolean
}

export function PromoInput({ userId, onValid, compact = false }: Props) {
  const { code, setCode, status, promo, reasonLabel, validate, reset } = usePromoCode(userId)

  async function handleValidate() {
    await validate()
    if (status === 'valid' && promo && onValid) onValid(promo)
  }

  const inputH = compact ? '36px' : '44px'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="Código promocional"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); if (status !== 'idle') reset() }}
          onKeyDown={e => e.key === 'Enter' && handleValidate()}
          style={{
            flex: 1, height: inputH, padding: '0 12px',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${status === 'valid' ? '#4ade80' : status === 'invalid' ? '#f87171' : 'rgba(212,175,55,0.2)'}`,
            borderRadius: 6, color: '#fff', fontSize: compact ? '0.75rem' : '0.85rem',
            fontFamily: 'monospace', letterSpacing: '0.05em', outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />
        <button
          onPointerDown={handleValidate}
          disabled={status === 'loading' || !code.trim()}
          style={{
            padding: '0 16px', height: inputH,
            background: status === 'valid' ? 'rgba(74,222,128,0.15)' : 'rgba(212,175,55,0.15)',
            border: `1px solid ${status === 'valid' ? 'rgba(74,222,128,0.4)' : 'rgba(212,175,55,0.3)'}`,
            borderRadius: 6,
            color: status === 'valid' ? '#4ade80' : GOLD,
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
            cursor: 'pointer', whiteSpace: 'nowrap',
            opacity: status === 'loading' || !code.trim() ? 0.5 : 1,
          }}>
          {status === 'loading' ? '...' : status === 'valid' ? 'OK' : 'APLICAR'}
        </button>
      </div>

      {status === 'valid' && promo && (
        <div style={{
          background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)',
          borderRadius: 6, padding: '10px 14px', fontSize: '0.65rem', color: '#4ade80',
          lineHeight: 1.6,
        }}>
          <div>✓ {promo.reward_chips > 0 ? `${promo.reward_chips.toLocaleString('es-UY')} chips gratis` : 'Código válido'}</div>
          {promo.purchase_bonus_label && (
            <div style={{ color: '#86efac', marginTop: 2 }}>⚡ {promo.purchase_bonus_label}</div>
          )}
        </div>
      )}

      {status === 'invalid' && (
        <p style={{ color: '#f87171', fontSize: '0.65rem', margin: 0 }}>{reasonLabel}</p>
      )}
    </div>
  )
}
